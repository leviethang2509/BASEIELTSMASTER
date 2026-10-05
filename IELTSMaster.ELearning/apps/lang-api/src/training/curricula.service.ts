import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CLONE_TITLE_SUFFIX,
  CURRICULUM_MAX_ITEMS,
  CURRICULUM_NAME_MAX_LENGTH,
  CurriculumItemType,
  ExamStatus,
  isLabelOfType,
  type CurriculumContentRef,
  type CurriculumDetail,
  type CurriculumItemView,
  type CurriculumListItem,
  type ExamUserRef,
} from '@lang/shared';
import { randomUUID } from 'node:crypto';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import { isForeignKeyViolation } from '../common/database-errors';
import { toSkipTake, type Paginated } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { bySortOrder } from '../exams/exam.mapper';
import { Exam } from '../exams/exam.entity';
import { Lesson } from '../lessons/lesson.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import { CourseCurriculum } from './course-curriculum.entity';
import { Course } from './course.entity';
import { CurriculumGroup } from './curriculum-group.entity';
import { CurriculumItem } from './curriculum-item.entity';
import { Curriculum } from './curriculum.entity';
import type {
  CreateCurriculumDto,
  CurriculumItemInputDto,
  ListCurriculaQueryDto,
  SaveCurriculumItemsDto,
  UpdateCurriculumDto,
} from './dto/curriculum.dto';
import {
  canEditCurriculum,
  contentIdOf,
  toCourseRef,
  toCurriculumItemView,
  toCurriculumListItem,
} from './training.mapper';

export const CURRICULUM_NOT_FOUND = 'Không tìm thấy giáo trình';
const EDIT_FORBIDDEN = 'Bạn chỉ sửa được giáo trình do mình tạo';
const REVISION_CONFLICT =
  'Giáo trình vừa được người khác lưu. Hãy tải lại để xem bản mới nhất';
const TOO_MANY_ITEMS = `Giáo trình tối đa ${CURRICULUM_MAX_ITEMS} mục`;
const ITEM_NOT_FOUND = 'Mục giáo trình không hợp lệ, hãy tải lại trang';
const GROUP_NOT_FOUND = 'Chương không hợp lệ, hãy tải lại trang';
const LABEL_MISMATCH = 'Nhãn không hợp với loại mục';
const LESSON_NOT_FOUND = 'Không tìm thấy bài học';
const EXAM_NOT_FOUND = 'Không tìm thấy đề thi';

/** Giáo trình thuộc tenant; khoá dòng khi đọc trong transaction ghi. */
export async function findCurriculum(
  manager: EntityManager,
  tenantId: string,
  id: string,
  lock = false,
): Promise<Curriculum> {
  const curriculum = await manager.getRepository(Curriculum).findOne({
    where: { id, tenantId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!curriculum) throw new NotFoundException(CURRICULUM_NOT_FOUND);
  return curriculum;
}

function assertCanEdit(
  ctx: TenantContext,
  actorId: string,
  curriculum: Curriculum,
): void {
  if (!canEditCurriculum(ctx, actorId, curriculum)) {
    throw new ForbiddenException(EDIT_FORBIDDEN);
  }
}

/** Mục kèm vị trí sau khi trải phẳng danh sách gửi lên. */
interface PlacedItem {
  input: CurriculumItemInputDto;
  groupIndex: number | null;
  sortOrder: number;
}

/**
 * Giáo trình tham khảo (req-3 Step 6, C1–C6, R6): thư viện của tenant.
 * Owner/Admin/Teacher xem mọi giáo trình và nhân bản được; sửa/xoá theo
 * `canEditCurriculum`. Gắn vào khoá học ở `CoursesService`.
 */
@Injectable()
export class CurriculaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Curriculum)
    private readonly curricula: Repository<Curriculum>,
    @InjectRepository(CurriculumGroup)
    private readonly groups: Repository<CurriculumGroup>,
    @InjectRepository(CurriculumItem)
    private readonly items: Repository<CurriculumItem>,
    @InjectRepository(CourseCurriculum)
    private readonly links: Repository<CourseCurriculum>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(
    ctx: TenantContext,
    actorId: string,
    query: ListCurriculaQueryDto,
  ): Promise<Paginated<CurriculumListItem>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.curricula
      .createQueryBuilder('curriculum')
      .where('curriculum.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .orderBy('curriculum.updatedAt', 'DESC')
      .addOrderBy('curriculum.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('curriculum.name ILIKE :q', {
        q: `%${escapeLike(query.q)}%`,
      });
    }
    if (query.createdBy) {
      qb.andWhere('curriculum.createdBy = :createdBy', {
        createdBy: query.createdBy,
      });
    }
    if (query.courseId) {
      qb.innerJoin(
        CourseCurriculum,
        'link',
        'link.curriculumId = curriculum.id AND link.courseId = :courseId',
        { courseId: query.courseId },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: await this.toListItems(ctx, actorId, rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Người đã tạo giáo trình trong tenant (bộ lọc "Người tạo"). */
  async creators(ctx: TenantContext): Promise<ExamUserRef[]> {
    return this.curricula
      .createQueryBuilder('curriculum')
      .innerJoin('curriculum.creator', 'creator')
      .select('creator.id', 'id')
      .addSelect('creator.fullName', 'fullName')
      .where('curriculum.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .groupBy('creator.id')
      .addGroupBy('creator.fullName')
      .orderBy('creator.fullName', 'ASC')
      .getRawMany<ExamUserRef>();
  }

  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateCurriculumDto,
  ): Promise<CurriculumDetail> {
    const curriculum = await this.curricula.save(
      this.curricula.create({
        tenantId: ctx.tenantId,
        name: dto.name,
        description: dto.description ?? null,
        revision: 1,
        clonedFromId: null,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
    return this.getDetail(ctx, actorId, curriculum.id);
  }

  async getDetail(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<CurriculumDetail> {
    const curriculum = await findCurriculum(
      this.dataSource.manager,
      ctx.tenantId,
      id,
    );
    const [groups, items] = await Promise.all([
      this.groups.findBy({ curriculumId: id }),
      this.items.findBy({ curriculumId: id }),
    ]);
    const [summary] = await this.toListItems(ctx, actorId, [curriculum], {
      groups,
      items,
    });
    const contents = await this.loadContents(items);
    const view = (item: CurriculumItem): CurriculumItemView =>
      toCurriculumItemView(item, contents.get(contentIdOf(item))!);
    const inGroup = (groupId: string | null) =>
      items
        .filter((item) => item.groupId === groupId)
        .sort(bySortOrder)
        .map(view);
    return {
      ...summary,
      revision: curriculum.revision,
      ungrouped: inGroup(null),
      groups: groups.sort(bySortOrder).map((group) => ({
        id: group.id,
        title: group.title,
        items: inGroup(group.id),
      })),
    };
  }

  /** Sửa tên, mô tả; không đổi `revision` (không đụng danh sách mục). */
  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateCurriculumDto,
  ): Promise<CurriculumDetail> {
    await this.dataSource.transaction(async (manager) => {
      const curriculum = await findCurriculum(manager, ctx.tenantId, id, true);
      assertCanEdit(ctx, actorId, curriculum);
      const changes: Partial<Curriculum> = { updatedBy: actorId };
      if (dto.name !== undefined) changes.name = dto.name;
      if (dto.description !== undefined) changes.description = dto.description;
      await manager.getRepository(Curriculum).update(id, changes);
    });
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Thay toàn bộ chương + mục theo thứ tự gửi lên (plan mục 6). `baseRevision`
   * lệch → 409. Mục/chương có `id` giữ id cũ. Mục mới phải là bài/đề đã
   * publish; mục sẵn có mà bài/đề đã lưu trữ vẫn giữ được (C5).
   */
  async saveItems(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: SaveCurriculumItemsDto,
  ): Promise<CurriculumDetail> {
    await this.dataSource.transaction(async (manager) => {
      const curriculum = await findCurriculum(manager, ctx.tenantId, id, true);
      assertCanEdit(ctx, actorId, curriculum);
      if (dto.baseRevision !== curriculum.revision) {
        throw new ConflictException(REVISION_CONFLICT);
      }

      const placed: PlacedItem[] = [
        ...dto.ungrouped.map((input, sortOrder) => ({
          input,
          groupIndex: null,
          sortOrder,
        })),
        ...dto.groups.flatMap((group, groupIndex) =>
          group.items.map((input, sortOrder) => ({
            input,
            groupIndex,
            sortOrder,
          })),
        ),
      ];
      if (placed.length > CURRICULUM_MAX_ITEMS) {
        throw new BadRequestException(TOO_MANY_ITEMS);
      }

      const groupRepository = manager.getRepository(CurriculumGroup);
      const itemRepository = manager.getRepository(CurriculumItem);
      const [oldGroups, oldItems] = await Promise.all([
        groupRepository.findBy({ curriculumId: id }),
        itemRepository.findBy({ curriculumId: id }),
      ]);
      assertKnownIds(
        dto.groups.map((group) => group.id),
        oldGroups,
        GROUP_NOT_FOUND,
      );
      assertKnownIds(
        placed.map((entry) => entry.input.id),
        oldItems,
        ITEM_NOT_FOUND,
      );

      const seen = new Set<string>();
      for (const { input } of placed) {
        if (!isLabelOfType(input.itemType, input.label)) {
          throw new BadRequestException(LABEL_MISMATCH);
        }
        const key = `${input.itemType}:${input.contentId}`;
        if (seen.has(key)) {
          throw new BadRequestException(
            input.itemType === CurriculumItemType.LESSON
              ? 'Một bài học chỉ được thêm một lần vào giáo trình'
              : 'Một đề thi chỉ được thêm một lần vào giáo trình',
          );
        }
        seen.add(key);
      }
      await assertContentsUsable(
        manager,
        ctx.tenantId,
        placed.map((entry) => entry.input),
        new Set(oldItems.map(contentIdOf)),
      );

      await itemRepository.delete({ curriculumId: id });
      await groupRepository.delete({ curriculumId: id });
      const groupIds = dto.groups.map((group) => group.id ?? randomUUID());
      if (dto.groups.length > 0) {
        await groupRepository.insert(
          dto.groups.map((group, index) =>
            groupRepository.create({
              id: groupIds[index],
              curriculumId: id,
              title: group.title,
              sortOrder: index,
            }),
          ),
        );
      }
      if (placed.length > 0) {
        await itemRepository.insert(
          placed.map(({ input, groupIndex, sortOrder }) =>
            itemRepository.create({
              id: input.id ?? randomUUID(),
              curriculumId: id,
              groupId: groupIndex === null ? null : groupIds[groupIndex],
              sortOrder,
              ...toContentColumns(input),
              title: input.title ?? null,
              label: input.label,
              note: input.note ?? null,
            }),
          ),
        );
      }
      await manager.getRepository(Curriculum).update(id, {
        revision: curriculum.revision + 1,
        updatedBy: actorId,
      });
    });
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Nhân bản (R4): mọi giáo trình → bản mới của người nhân bản, chép chương +
   * mục (kể cả mục có bài/đề đã lưu trữ), không chép khoá học đang gắn.
   */
  async clone(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<CurriculumDetail> {
    const cloneId = await this.dataSource.transaction(async (manager) => {
      // Khoá chia sẻ: không chạy song song với lần lưu mục của bản gốc.
      const source = await manager.getRepository(Curriculum).findOne({
        where: { id, tenantId: ctx.tenantId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!source) throw new NotFoundException(CURRICULUM_NOT_FOUND);
      const groupRepository = manager.getRepository(CurriculumGroup);
      const itemRepository = manager.getRepository(CurriculumItem);
      const [groups, items] = await Promise.all([
        groupRepository.findBy({ curriculumId: id }),
        itemRepository.findBy({ curriculumId: id }),
      ]);

      const repository = manager.getRepository(Curriculum);
      const copy = await repository.save(
        repository.create({
          tenantId: ctx.tenantId,
          name: cloneCurriculumName(source.name),
          description: source.description,
          revision: 1,
          clonedFromId: source.id,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const groupIds = new Map(groups.map((group) => [group.id, randomUUID()]));
      if (groups.length > 0) {
        await groupRepository.insert(
          groups.map((group) =>
            groupRepository.create({
              id: groupIds.get(group.id),
              curriculumId: copy.id,
              title: group.title,
              sortOrder: group.sortOrder,
            }),
          ),
        );
      }
      if (items.length > 0) {
        await itemRepository.insert(
          items.map((item) =>
            itemRepository.create({
              id: randomUUID(),
              curriculumId: copy.id,
              groupId: item.groupId ? groupIds.get(item.groupId)! : null,
              sortOrder: item.sortOrder,
              itemType: item.itemType,
              lessonId: item.lessonId,
              examId: item.examId,
              title: item.title,
              label: item.label,
              note: item.note,
            }),
          ),
        );
      }
      return copy.id;
    });
    return this.getDetail(ctx, actorId, cloneId);
  }

  /** Đang gắn khoá học → 409 (bỏ gắn trước, R6). Chương + mục xoá theo. */
  async remove(ctx: TenantContext, actorId: string, id: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const curriculum = await findCurriculum(
          manager,
          ctx.tenantId,
          id,
          true,
        );
        assertCanEdit(ctx, actorId, curriculum);
        const links = await manager
          .getRepository(CourseCurriculum)
          .findBy({ curriculumId: id });
        if (links.length > 0) {
          const courses = await manager
            .getRepository(Course)
            .findBy({ id: In(links.map((link) => link.courseId)) });
          throw new ConflictException(attachedMessage(courses));
        }
        await manager.getRepository(Curriculum).delete({ id });
      });
    } catch (error) {
      // Khoá học vừa gắn giáo trình ngay sau lúc kiểm tra (FK NO ACTION).
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(attachedMessage([]));
      }
      throw error;
    }
  }

  /** Dòng danh sách của nhiều giáo trình (số chương/mục, khoá học đang gắn). */
  async toListItems(
    ctx: TenantContext,
    actorId: string,
    curricula: Curriculum[],
    known?: { groups: CurriculumGroup[]; items: CurriculumItem[] },
  ): Promise<CurriculumListItem[]> {
    if (curricula.length === 0) return [];
    const ids = curricula.map((row) => row.id);
    const creatorIds = [
      ...new Set(curricula.flatMap((row) => row.createdBy ?? [])),
    ];
    const sourceIds = [
      ...new Set(curricula.flatMap((row) => row.clonedFromId ?? [])),
    ];
    const [groups, items, links, users, sources] = await Promise.all([
      known?.groups ?? this.groups.findBy({ curriculumId: In(ids) }),
      known?.items ?? this.items.findBy({ curriculumId: In(ids) }),
      this.links.findBy({ curriculumId: In(ids) }),
      creatorIds.length > 0
        ? this.users.findBy({ id: In(creatorIds) })
        : Promise.resolve([]),
      sourceIds.length > 0
        ? this.curricula.findBy({ id: In(sourceIds) })
        : Promise.resolve([]),
    ]);
    const courseIds = [...new Set(links.map((link) => link.courseId))];
    const courses =
      courseIds.length > 0
        ? await this.courses.findBy({ id: In(courseIds) })
        : [];
    const courseById = new Map(courses.map((row) => [row.id, row]));
    const userById = new Map(users.map((row) => [row.id, row]));
    const sourceById = new Map(sources.map((row) => [row.id, row]));
    const count = (rows: { curriculumId: string }[], curriculumId: string) =>
      rows.filter((row) => row.curriculumId === curriculumId).length;

    return curricula.map((curriculum) => {
      const creator = curriculum.createdBy
        ? userById.get(curriculum.createdBy)
        : undefined;
      const source = curriculum.clonedFromId
        ? sourceById.get(curriculum.clonedFromId)
        : undefined;
      return toCurriculumListItem(curriculum, {
        creator: creator
          ? { id: creator.id, fullName: creator.fullName }
          : null,
        clonedFrom: source ? { id: source.id, name: source.name } : null,
        groupCount: count(groups, curriculum.id),
        itemCount: count(items, curriculum.id),
        courses: links
          .filter((link) => link.curriculumId === curriculum.id)
          .flatMap((link) => courseById.get(link.courseId) ?? [])
          .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
          .map(toCourseRef),
        canEdit: canEditCurriculum(ctx, actorId, curriculum),
      });
    });
  }

  /** Bài học/đề thi của các mục (kể cả đã xoá mềm, để vẫn hiện được tên). */
  private async loadContents(
    items: CurriculumItem[],
  ): Promise<Map<string, CurriculumContentRef>> {
    const lessonIds = items.flatMap((item) => item.lessonId ?? []);
    const examIds = items.flatMap((item) => item.examId ?? []);
    const [lessons, exams] = await Promise.all([
      lessonIds.length > 0
        ? this.lessons.find({
            select: { id: true, title: true, status: true },
            where: { id: In(lessonIds) },
            withDeleted: true,
          })
        : Promise.resolve([]),
      examIds.length > 0
        ? this.exams.find({
            select: { id: true, title: true, status: true },
            where: { id: In(examIds) },
            withDeleted: true,
          })
        : Promise.resolve([]),
    ]);
    return new Map(
      [...lessons, ...exams].map((row) => [
        row.id,
        { id: row.id, title: row.title, status: row.status },
      ]),
    );
  }
}

/** Tên bản nhân bản: thêm hậu tố, cắt bớt tên gốc cho vừa độ dài tối đa. */
export function cloneCurriculumName(name: string): string {
  const room = CURRICULUM_NAME_MAX_LENGTH - CLONE_TITLE_SUFFIX.length;
  return `${name.slice(0, room).trimEnd()}${CLONE_TITLE_SUFFIX}`;
}

function attachedMessage(courses: Course[]): string {
  const names = courses.map((course) => course.name).join(', ');
  return names
    ? `Giáo trình đang được gắn với khoá học: ${names}. Hãy bỏ gắn trước khi xoá`
    : 'Giáo trình đang được gắn với khoá học. Hãy bỏ gắn trước khi xoá';
}

/** Id gửi lên phải thuộc giáo trình và không lặp lại. */
function assertKnownIds(
  ids: (string | undefined)[],
  existing: { id: string }[],
  message: string,
): void {
  const known = new Set(existing.map((row) => row.id));
  const used = new Set<string>();
  for (const id of ids) {
    if (id === undefined) continue;
    if (!known.has(id) || used.has(id)) throw new BadRequestException(message);
    used.add(id);
  }
}

function toContentColumns(input: CurriculumItemInputDto) {
  return input.itemType === CurriculumItemType.LESSON
    ? { itemType: input.itemType, lessonId: input.contentId, examId: null }
    : { itemType: input.itemType, lessonId: null, examId: input.contentId };
}

/**
 * Bài/đề phải thuộc tenant, chưa xoá; mục mới (bài/đề chưa có trong giáo trình)
 * phải đã publish. Khoá chia sẻ dòng bài/đề để không bị xoá giữa chừng. Dùng
 * chung cho giáo trình lớp.
 */
export async function assertContentsUsable(
  manager: EntityManager,
  tenantId: string,
  inputs: Pick<CurriculumItemInputDto, 'itemType' | 'contentId'>[],
  existingContentIds: Set<string>,
): Promise<void> {
  const idsOf = (type: CurriculumItemType) =>
    inputs
      .filter((input) => input.itemType === type)
      .map((input) => input.contentId);
  const lessonIds = idsOf(CurriculumItemType.LESSON);
  const examIds = idsOf(CurriculumItemType.EXAM);
  const [lessons, exams] = await Promise.all([
    lessonIds.length > 0
      ? manager.getRepository(Lesson).find({
          where: { id: In(lessonIds), tenantId },
          lock: { mode: 'pessimistic_read' },
        })
      : Promise.resolve([]),
    examIds.length > 0
      ? manager.getRepository(Exam).find({
          where: { id: In(examIds), tenantId },
          lock: { mode: 'pessimistic_read' },
        })
      : Promise.resolve([]),
  ]);
  const check = (
    ids: string[],
    rows: {
      id: string;
      title: string;
      status: string;
      deletedAt: Date | null;
    }[],
    notFound: string,
    kind: string,
  ) => {
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const id of ids) {
      const row = byId.get(id);
      if (!row || row.deletedAt) throw new BadRequestException(notFound);
      if (row.status !== ExamStatus.PUBLISHED && !existingContentIds.has(id)) {
        throw new BadRequestException(
          `Chỉ thêm được ${kind} đã publish: "${row.title}"`,
        );
      }
    }
  };
  check(lessonIds, lessons, LESSON_NOT_FOUND, 'bài học');
  check(examIds, exams, EXAM_NOT_FOUND, 'đề thi');
}
