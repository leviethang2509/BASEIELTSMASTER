import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  CURRICULUM_MAX_ITEMS,
  ClassLogAction,
  CurriculumItemType,
  DEFAULT_PASS_THRESHOLD,
  NotificationType,
  effectiveOpensAt,
  isLabelOfType,
  type ClassCurriculum,
  type ClassItemField,
  type ClassLogDetail,
  type CurriculumContentRef,
} from '@lang/shared';
import { randomUUID } from 'node:crypto';
import { DataSource, In, type EntityManager } from 'typeorm';
import { Exam } from '../exams/exam.entity';
import { bySortOrder } from '../exams/exam.mapper';
import { Lesson } from '../lessons/lesson.entity';
import {
  classroomStudentUserIds,
  classroomTeacherUserIds,
  dashboardClassLink,
  learnerClassLink,
} from '../notifications/notification-targets';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { assertContentsUsable } from '../training/curricula.service';
import { CurriculumGroup } from '../training/curriculum-group.entity';
import { CurriculumItem } from '../training/curriculum-item.entity';
import { learnerCountsByItem } from './class-activity';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { writeClassLog } from './class-logs';
import { ClassSessionLink } from './class-session-link.entity';
import { assertClassroomOpen, loadClassroomAccess } from './classroom-access';
import { Classroom } from './classroom.entity';
import { classContentIdOf, toClassItemView } from './classroom.mapper';
import type {
  ClassItemInputDto,
  SaveClassCurriculumDto,
} from './dto/class-curriculum.dto';

const REVISION_CONFLICT =
  'Giáo trình lớp vừa được người khác lưu. Hãy tải lại để xem bản mới nhất';
const TOO_MANY_ITEMS = `Giáo trình lớp tối đa ${CURRICULUM_MAX_ITEMS} mục`;
const ITEM_NOT_FOUND = 'Mục giáo trình không hợp lệ, hãy tải lại trang';
const GROUP_NOT_FOUND = 'Chương không hợp lệ, hãy tải lại trang';
const LABEL_MISMATCH = 'Nhãn không hợp với loại mục';
const CONTENT_CHANGED = 'Không đổi được bài học/đề thi của mục đã có';
const LESSON_DUPLICATE = 'Một bài học chỉ được thêm một lần vào lớp';
const EXAM_DUPLICATE =
  'Một đề thi chỉ được thêm lại vào lớp khi là lần thi lại ("Thi lại cho")';
const RETAKE_NOT_EXAM = 'Chỉ mục đề thi mới là lần thi lại được';
const RETAKE_TARGET_MISSING =
  'Mục gốc của lần thi lại không còn trong giáo trình lớp';
const RETAKE_TARGET_NOT_ROOT =
  'Lần thi lại phải gắn với mục đề thi gốc (không phải một lần thi lại khác)';
const RETAKE_ORDER = 'Lần thi lại phải đứng sau mục gốc trong giáo trình';
const DEADLINE_BEFORE_OPEN = 'Deadline phải sau ngày mở';

/** Bài học/đề thi của mục, kèm cờ đã xoá mềm (mục giữ lại nhưng không vào được). */
export interface ClassContentRow extends CurriculumContentRef {
  deleted: boolean;
  /** Version đang phục vụ (lượt học/lượt thi gắn version này). */
  currentVersion: number;
}

/** Mục gửi lên kèm vị trí sau khi trải phẳng (chưa xếp chương trước, rồi từng chương). */
interface PlacedItem {
  input: ClassItemInputDto;
  id: string;
  isNew: boolean;
  groupIndex: number | null;
  sortOrder: number;
  position: number;
}

/**
 * Giáo trình lớp (E1–E5, R7–R10): giáo viên của lớp và Owner/Admin sửa trực
 * tiếp, `baseRevision` chống ghi đè, mỗi lần lưu ghi nhật ký. Mục chưa có bài
 * làm xoá hẳn, có rồi thì ẩn (người dùng chốt Step 7).
 */
@Injectable()
export class ClassCurriculumService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async get(ctx: TenantContext, classroomId: string): Promise<ClassCurriculum> {
    const manager = this.dataSource.manager;
    const access = await loadClassroomAccess(manager, ctx, classroomId);
    const [groups, items] = await Promise.all([
      manager.getRepository(ClassGroup).findBy({ classroomId }),
      manager.getRepository(ClassItem).findBy({ classroomId }),
    ]);
    const [contents, counts] = await Promise.all([
      loadContents(manager, items),
      learnerCountsByItem(
        manager,
        items.map((item) => item.id),
      ),
    ]);
    const view = (item: ClassItem) =>
      toClassItemView(
        item,
        contents.get(classContentIdOf(item))!,
        counts.get(item.id) ?? 0,
      );
    const active = items.filter((item) => !item.removedAt);
    const inGroup = (groupId: string | null) =>
      active
        .filter((item) => item.groupId === groupId)
        .sort(bySortOrder)
        .map(view);
    return {
      classroomId,
      revision: access.classroom.curriculumRevision,
      canEdit: access.canEditCurriculum,
      ungrouped: inGroup(null),
      groups: groups.sort(bySortOrder).map((group) => ({
        id: group.id,
        title: group.title,
        opensAt: group.opensAt?.toISOString() ?? null,
        items: inGroup(group.id),
      })),
      removed: items
        .filter((item) => item.removedAt)
        .sort((a, b) => b.removedAt!.getTime() - a.removedAt!.getTime())
        .map(view),
    };
  }

  /**
   * Thay toàn bộ chương + mục đang hiện theo thứ tự gửi lên. Mục cũ giữ id (mục
   * đã ẩn gửi lại là khôi phục); mục mới phải là bài/đề đã publish. Bài/đề chỉ
   * lặp lại khi là lần thi lại; lần thi lại gắn mục đề thi gốc đứng trước nó.
   */
  async save(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    dto: SaveClassCurriculumDto,
  ): Promise<ClassCurriculum> {
    await this.dataSource.transaction(async (manager) => {
      const { classroom } = await loadClassroomAccess(
        manager,
        ctx,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      if (dto.baseRevision !== classroom.curriculumRevision) {
        throw new ConflictException(REVISION_CONFLICT);
      }

      const groupRepository = manager.getRepository(ClassGroup);
      const itemRepository = manager.getRepository(ClassItem);
      const [oldGroups, oldItems] = await Promise.all([
        groupRepository.findBy({ classroomId }),
        itemRepository.findBy({ classroomId }),
      ]);
      const oldGroupById = new Map(oldGroups.map((row) => [row.id, row]));
      const oldItemById = new Map(oldItems.map((row) => [row.id, row]));

      assertUniqueIds(
        dto.groups.map((group) => group.id),
        (id) => oldGroupById.has(id),
        GROUP_NOT_FOUND,
      );
      const placed = placeItems(dto, oldItemById);
      if (placed.length > CURRICULUM_MAX_ITEMS) {
        throw new BadRequestException(TOO_MANY_ITEMS);
      }
      const newIds = placed.filter((entry) => entry.isNew).map((e) => e.id);
      if (
        newIds.length > 0 &&
        (await itemRepository.existsBy({ id: In(newIds) }))
      ) {
        throw new BadRequestException(ITEM_NOT_FOUND);
      }
      validateItems(placed, oldItemById);
      for (const group of dto.groups) {
        assertOpensBeforeDeadline(group.opensAt ?? null, null);
      }
      await assertContentsUsable(
        manager,
        ctx.tenantId,
        placed.map((entry) => entry.input),
        new Set(oldItems.map(classContentIdOf)),
      );

      const contents = await loadContents(manager, [
        ...oldItems,
        ...placed.map((entry) => toContentColumns(entry.input)),
      ]);
      const nameOf = (
        item: { title: string | null } & Pick<ClassItem, 'lessonId' | 'examId'>,
      ) => item.title ?? contents.get(classContentIdOf(item))?.title ?? '';

      // Chương: thêm mới, sửa, rồi xoá chương không còn (mục ẩn trong đó về
      // "Chưa xếp chương").
      const groupIds = dto.groups.map((group) => group.id ?? randomUUID());
      const keptGroupIds = new Set(groupIds);
      const newGroups = dto.groups.flatMap((group, index) =>
        group.id
          ? []
          : [
              groupRepository.create({
                id: groupIds[index],
                classroomId,
                title: group.title,
                sortOrder: index,
                opensAt: toDate(group.opensAt),
              }),
            ],
      );
      if (newGroups.length > 0) await groupRepository.insert(newGroups);
      for (const [index, group] of dto.groups.entries()) {
        if (!group.id) continue;
        await groupRepository.update(group.id, {
          title: group.title,
          sortOrder: index,
          opensAt: toDate(group.opensAt),
        });
      }

      // Mục: sửa mục cũ, thêm mục mới theo thứ tự (mục gốc trước lần thi lại).
      for (const entry of placed) {
        const columns = itemColumns(entry, groupIds);
        if (entry.isNew) {
          await itemRepository.insert(
            itemRepository.create({
              id: entry.id,
              classroomId,
              ...toContentColumns(entry.input),
              ...columns,
            }),
          );
        } else {
          await itemRepository.update(entry.id, columns);
        }
      }

      // Mục đang hiện mà không gửi lên: có bài làm thì ẩn, chưa có thì xoá.
      const keptItemIds = new Set(placed.map((entry) => entry.id));
      const dropped = oldItems.filter(
        (item) => !item.removedAt && !keptItemIds.has(item.id),
      );
      const counts = await learnerCountsByItem(
        manager,
        dropped.map((item) => item.id),
      );
      const hidden = dropped.filter((item) => counts.has(item.id));
      const deleted = dropped.filter((item) => !counts.has(item.id));
      const now = new Date();
      for (const item of hidden) {
        await itemRepository.update(item.id, { removedAt: now });
      }
      // Mục bị ẩn thì bỏ map với buổi học (R17); mục xoá hẳn thì FK CASCADE.
      if (hidden.length > 0) {
        await manager
          .getRepository(ClassSessionLink)
          .delete({ classItemId: In(hidden.map((item) => item.id)) });
      }
      if (deleted.length > 0) {
        await itemRepository.delete({ id: In(deleted.map((item) => item.id)) });
      }
      const droppedGroups = oldGroups.filter(
        (group) => !keptGroupIds.has(group.id),
      );
      if (droppedGroups.length > 0) {
        const ids = droppedGroups.map((group) => group.id);
        await itemRepository.update(
          { classroomId, groupId: In(ids) },
          { groupId: null },
        );
        await groupRepository.delete({ id: In(ids) });
      }

      await manager.getRepository(Classroom).update(classroomId, {
        curriculumRevision: classroom.curriculumRevision + 1,
        updatedBy: actorId,
      });

      const detail = describeChanges({
        oldGroups,
        oldItems,
        dto,
        groupIds,
        placed,
        hidden,
        deleted,
        nameOf,
      });
      if (Object.keys(detail).length > 0) {
        await writeClassLog(
          manager,
          classroomId,
          actorId,
          ClassLogAction.CURRICULUM_SAVED,
          detail,
        );
        await this.notifyCurriculumChange(manager, ctx, {
          classroom,
          actorId,
          placed,
          dto,
          nameOf,
          now,
        });
      }
    });
    return this.get(ctx, classroomId);
  }

  /**
   * Thông báo sau khi lưu giáo trình lớp (R18.1): học viên nhận **một** thông
   * báo gộp cho các mục mới đã mở (mục hẹn ngày mở để cron báo lúc tới ngày) và
   * một thông báo riêng cho lần thi lại; giáo viên khác của lớp được báo là
   * giáo trình đã đổi.
   */
  private async notifyCurriculumChange(
    manager: EntityManager,
    ctx: TenantContext,
    input: {
      classroom: Classroom;
      actorId: string;
      placed: PlacedItem[];
      dto: SaveClassCurriculumDto;
      nameOf: (item: {
        title: string | null;
        lessonId: string | null;
        examId: string | null;
      }) => string;
      now: Date;
    },
  ): Promise<void> {
    const { classroom, actorId, placed, dto, nameOf, now } = input;
    const className = classroom.name;
    const openNow = placed.filter(
      (entry) =>
        entry.isNew &&
        isOpenNow(
          entry.input.opensAt ?? null,
          entry.groupIndex === null
            ? null
            : (dto.groups[entry.groupIndex]?.opensAt ?? null),
          now,
        ),
    );
    const titleOf = (entry: PlacedItem) =>
      nameOf({
        title: entry.input.title ?? null,
        ...toContentColumns(entry.input),
      });
    const students = await classroomStudentUserIds(manager, classroom.id);
    const learnerLink = learnerClassLink(ctx.slug, classroom.id);

    const assigned = openNow.filter((entry) => !entry.input.retakeOfItemId);
    if (assigned.length > 0) {
      await this.notifications.notify(manager, {
        userIds: students,
        tenantId: ctx.tenantId,
        type: NotificationType.CLASS_ITEMS_ASSIGNED,
        params: {
          className,
          title: titleOf(assigned[0]),
          count: assigned.length,
        },
        link: learnerLink,
        exceptUserId: actorId,
      });
    }
    for (const entry of openNow.filter((row) => row.input.retakeOfItemId)) {
      await this.notifications.notify(manager, {
        userIds: students,
        tenantId: ctx.tenantId,
        type: NotificationType.RETAKE_ASSIGNED,
        params: { className, title: titleOf(entry) },
        link: learnerLink,
        exceptUserId: actorId,
      });
    }

    await this.notifications.notify(manager, {
      userIds: await classroomTeacherUserIds(manager, classroom.id),
      tenantId: ctx.tenantId,
      type: NotificationType.CLASS_CURRICULUM_CHANGED,
      params: { className },
      link: dashboardClassLink(ctx.slug, classroom.id, 'curriculum'),
      exceptUserId: actorId,
    });
  }
}

/** Mục đã mở ngay lúc lưu: cả chương lẫn mục đều không hẹn ngày mở sau. */
function isOpenNow(
  itemOpensAt: string | null,
  groupOpensAt: string | null,
  now: Date,
): boolean {
  const opensAt = effectiveOpensAt(groupOpensAt, itemOpensAt);
  return opensAt === null || Date.parse(opensAt) <= now.getTime();
}

/**
 * Chép chương + mục của giáo trình tham khảo sang lớp mới (R6), kể cả mục có
 * bài/đề đã lưu trữ (giữ đúng giáo trình; giáo viên xoá sau nếu cần).
 */
export async function copyCurriculumIntoClassroom(
  manager: EntityManager,
  classroomId: string,
  curriculumId: string,
): Promise<void> {
  const [groups, items] = await Promise.all([
    manager.getRepository(CurriculumGroup).findBy({ curriculumId }),
    manager.getRepository(CurriculumItem).findBy({ curriculumId }),
  ]);
  const groupRepository = manager.getRepository(ClassGroup);
  const itemRepository = manager.getRepository(ClassItem);
  const groupIds = new Map(groups.map((group) => [group.id, randomUUID()]));
  if (groups.length > 0) {
    await groupRepository.insert(
      groups.map((group) =>
        groupRepository.create({
          id: groupIds.get(group.id),
          classroomId,
          title: group.title,
          sortOrder: group.sortOrder,
          opensAt: null,
        }),
      ),
    );
  }
  if (items.length > 0) {
    await itemRepository.insert(
      items.map((item) =>
        itemRepository.create({
          id: randomUUID(),
          classroomId,
          groupId: item.groupId ? (groupIds.get(item.groupId) ?? null) : null,
          sortOrder: item.sortOrder,
          itemType: item.itemType,
          lessonId: item.lessonId,
          examId: item.examId,
          title: item.title,
          label: item.label,
          note: item.note,
          opensAt: null,
          deadlineAt: null,
          acceptLate: true,
          passThreshold: DEFAULT_PASS_THRESHOLD,
          retakeOfItemId: null,
          removedAt: null,
        }),
      ),
    );
  }
}

/** Bài học/đề thi của các mục (kể cả đã xoá mềm, để vẫn hiện được tên). */
export async function loadContents(
  manager: EntityManager,
  items: Pick<ClassItem, 'lessonId' | 'examId'>[],
): Promise<Map<string, ClassContentRow>> {
  const lessonIds = [...new Set(items.flatMap((item) => item.lessonId ?? []))];
  const examIds = [...new Set(items.flatMap((item) => item.examId ?? []))];
  const [lessons, exams] = await Promise.all([
    lessonIds.length > 0
      ? manager.getRepository(Lesson).find({
          select: {
            id: true,
            title: true,
            status: true,
            deletedAt: true,
            currentVersion: true,
          },
          where: { id: In(lessonIds) },
          withDeleted: true,
        })
      : Promise.resolve([]),
    examIds.length > 0
      ? manager.getRepository(Exam).find({
          select: {
            id: true,
            title: true,
            status: true,
            deletedAt: true,
            currentVersion: true,
          },
          where: { id: In(examIds) },
          withDeleted: true,
        })
      : Promise.resolve([]),
  ]);
  return new Map(
    [...lessons, ...exams].map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        status: row.status,
        deleted: row.deletedAt !== null,
        currentVersion: row.currentVersion,
      },
    ]),
  );
}

/** Id gửi lên không lặp lại; `isKnown` = phải thuộc lớp (chương). */
function assertUniqueIds(
  ids: (string | undefined)[],
  isKnown: (id: string) => boolean,
  message: string,
): void {
  const used = new Set<string>();
  for (const id of ids) {
    if (id === undefined) continue;
    if (!isKnown(id) || used.has(id)) throw new BadRequestException(message);
    used.add(id);
  }
}

/** Trải phẳng mục theo thứ tự hiển thị; id lạ (uuid do client sinh) là mục mới. */
function placeItems(
  dto: SaveClassCurriculumDto,
  oldItemById: Map<string, ClassItem>,
): PlacedItem[] {
  const entries = [
    ...dto.ungrouped.map((input, sortOrder) => ({
      input,
      groupIndex: null,
      sortOrder,
    })),
    ...dto.groups.flatMap((group, groupIndex) =>
      group.items.map((input, sortOrder) => ({ input, groupIndex, sortOrder })),
    ),
  ];
  const used = new Set<string>();
  return entries.map((entry, position) => {
    const id = entry.input.id ?? randomUUID();
    if (used.has(id)) throw new BadRequestException(ITEM_NOT_FOUND);
    used.add(id);
    return { ...entry, id, isNew: !oldItemById.has(id), position };
  });
}

/** Nhãn, bài/đề không đổi, trùng bài/đề, thi lại, ngày mở/deadline. */
function validateItems(
  placed: PlacedItem[],
  oldItemById: Map<string, ClassItem>,
): void {
  const byId = new Map(placed.map((entry) => [entry.id, entry]));
  const roots = new Set<string>();
  for (const entry of placed) {
    const { input } = entry;
    if (!isLabelOfType(input.itemType, input.label)) {
      throw new BadRequestException(LABEL_MISMATCH);
    }
    const old = oldItemById.get(entry.id);
    if (
      old &&
      (old.itemType !== input.itemType ||
        classContentIdOf(old) !== input.contentId)
    ) {
      throw new BadRequestException(CONTENT_CHANGED);
    }
    assertOpensBeforeDeadline(input.opensAt ?? null, input.deadlineAt ?? null);

    const retakeOf = input.retakeOfItemId ?? null;
    if (retakeOf) {
      if (input.itemType !== CurriculumItemType.EXAM) {
        throw new BadRequestException(RETAKE_NOT_EXAM);
      }
      const target = byId.get(retakeOf);
      if (!target) throw new BadRequestException(RETAKE_TARGET_MISSING);
      if (
        target.input.itemType !== CurriculumItemType.EXAM ||
        target.input.retakeOfItemId
      ) {
        throw new BadRequestException(RETAKE_TARGET_NOT_ROOT);
      }
      if (target.position >= entry.position) {
        throw new BadRequestException(RETAKE_ORDER);
      }
      continue;
    }
    // Mỗi bài/đề chỉ một mục không phải lần thi lại (R9: thi lại được dùng lại đề).
    const key = `${input.itemType}:${input.contentId}`;
    if (roots.has(key)) {
      throw new BadRequestException(
        input.itemType === CurriculumItemType.LESSON
          ? LESSON_DUPLICATE
          : EXAM_DUPLICATE,
      );
    }
    roots.add(key);
  }
}

function assertOpensBeforeDeadline(
  opensAt: string | null,
  deadlineAt: string | null,
): void {
  if (opensAt && deadlineAt && new Date(deadlineAt) <= new Date(opensAt)) {
    throw new BadRequestException(DEADLINE_BEFORE_OPEN);
  }
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function toContentColumns(input: ClassItemInputDto) {
  return input.itemType === CurriculumItemType.LESSON
    ? { itemType: input.itemType, lessonId: input.contentId, examId: null }
    : { itemType: input.itemType, lessonId: null, examId: input.contentId };
}

/** Cột ghi được của mục; bài học bỏ qua nhận bài quá hạn/ngưỡng đậu/thi lại. */
function itemColumns(entry: PlacedItem, groupIds: string[]) {
  const { input } = entry;
  const isExam = input.itemType === CurriculumItemType.EXAM;
  return {
    groupId: entry.groupIndex === null ? null : groupIds[entry.groupIndex],
    sortOrder: entry.sortOrder,
    title: input.title ?? null,
    label: input.label,
    note: input.note ?? null,
    opensAt: toDate(input.opensAt),
    deadlineAt: toDate(input.deadlineAt),
    acceptLate: isExam ? (input.acceptLate ?? true) : true,
    passThreshold: isExam
      ? (input.passThreshold ?? DEFAULT_PASS_THRESHOLD)
      : DEFAULT_PASS_THRESHOLD,
    retakeOfItemId: isExam ? (input.retakeOfItemId ?? null) : null,
    removedAt: null,
  };
}

const time = (date: Date | null) => date?.getTime() ?? null;
const inputTime = (value: string | null | undefined) =>
  value ? new Date(value).getTime() : null;

/** Chi tiết nhật ký của một lần lưu; `{}` khi không có gì đổi. */
function describeChanges(args: {
  oldGroups: ClassGroup[];
  oldItems: ClassItem[];
  dto: SaveClassCurriculumDto;
  groupIds: string[];
  placed: PlacedItem[];
  hidden: ClassItem[];
  deleted: ClassItem[];
  nameOf: (
    item: { title: string | null } & Pick<ClassItem, 'lessonId' | 'examId'>,
  ) => string;
}): ClassLogDetail {
  const { oldGroups, oldItems, dto, groupIds, placed, nameOf } = args;
  const oldById = new Map(oldItems.map((item) => [item.id, item]));
  const oldGroupById = new Map(oldGroups.map((group) => [group.id, group]));
  const detail: ClassLogDetail = {};
  const push = <K extends keyof ClassLogDetail>(
    key: K,
    value: NonNullable<ClassLogDetail[K]> extends (infer V)[] ? V : never,
  ) => {
    const list = (detail[key] ?? []) as unknown[];
    list.push(value);
    (detail as Record<string, unknown>)[key] = list;
  };

  for (const entry of placed) {
    const columns = itemColumns(entry, groupIds);
    const name = nameOf({
      title: columns.title,
      ...toContentColumns(entry.input),
    });
    const old = oldById.get(entry.id);
    if (!old) {
      push('added', name);
      continue;
    }
    if (old.removedAt) push('restored', name);
    const fields: ClassItemField[] = [];
    if (old.title !== columns.title) fields.push('title');
    if (old.label !== columns.label) fields.push('label');
    if (old.note !== columns.note) fields.push('note');
    if (time(old.opensAt) !== time(columns.opensAt)) fields.push('opensAt');
    if (time(old.deadlineAt) !== time(columns.deadlineAt)) {
      fields.push('deadlineAt');
    }
    if (old.acceptLate !== columns.acceptLate) fields.push('acceptLate');
    if (old.passThreshold !== columns.passThreshold) {
      fields.push('passThreshold');
    }
    if (old.retakeOfItemId !== columns.retakeOfItemId) fields.push('retakeOf');
    if (!old.removedAt && old.groupId !== columns.groupId) fields.push('group');
    if (fields.length > 0) push('changed', { title: name, fields });
  }
  for (const item of args.hidden) push('hidden', nameOf(item));
  for (const item of args.deleted) push('removed', nameOf(item));

  const kept = new Set(dto.groups.flatMap((group) => group.id ?? []));
  for (const [index, group] of dto.groups.entries()) {
    const old = group.id ? oldGroupById.get(group.id) : undefined;
    if (!old) {
      push('groupsAdded', group.title);
    } else if (
      old.title !== group.title ||
      time(old.opensAt) !== inputTime(group.opensAt)
    ) {
      push('groupsChanged', group.title);
    } else if (old.sortOrder !== index) {
      detail.reordered = true;
    }
  }
  for (const group of oldGroups) {
    if (!kept.has(group.id)) push('groupsRemoved', group.title);
  }

  // Thứ tự các mục vẫn còn (bỏ qua mục thêm/bớt) khác trước → đã sắp xếp lại.
  const groupRank = new Map(
    oldGroups.map((group) => [group.id, group.sortOrder]),
  );
  const oldOrder = oldItems
    .filter((item) => !item.removedAt)
    .sort(
      (a, b) =>
        (a.groupId === null ? -1 : groupRank.get(a.groupId)!) -
          (b.groupId === null ? -1 : groupRank.get(b.groupId)!) ||
        a.sortOrder - b.sortOrder,
    )
    .map((item) => item.id);
  const newIds = new Set(placed.map((entry) => entry.id));
  const before = oldOrder.filter((id) => newIds.has(id));
  const beforeSet = new Set(before);
  const after = placed
    .map((entry) => entry.id)
    .filter((id) => beforeSet.has(id));
  if (before.some((id, index) => after[index] !== id)) detail.reordered = true;
  return detail;
}
