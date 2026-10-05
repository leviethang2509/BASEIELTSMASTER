import {
  ClassSessionStatus,
  ClassroomStatus,
  findSessionOverlaps,
  type ClassSessionView,
  type OverlapCandidate,
  type SessionConflict,
  type SessionLinkView,
  type SessionPersonRef,
} from '@lang/shared';
import { In, IsNull, LessThan, MoreThan, type EntityManager } from 'typeorm';
import { loadContents } from './class-curriculum.service';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { loadMembers } from './class-members.service';
import { ClassSessionLink } from './class-session-link.entity';
import { ClassSessionTeacher } from './class-session-teacher.entity';
import { ClassSession } from './class-session.entity';
import { ClassroomStudent } from './classroom-student.entity';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { classContentIdOf, toClassroomRef } from './classroom.mapper';

/** Người tham gia buổi học, theo membership. */
export interface SessionPeople {
  /** Giáo viên hiệu lực: giáo viên riêng của buổi hoặc mọi giáo viên của lớp. */
  teachers: Map<string, string[]>;
  /** Giáo viên của lớp. */
  classTeachers: Map<string, string[]>;
  /** Học viên đang học (chưa xoá khỏi lớp). */
  students: Map<string, string[]>;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const list = result.get(key(row)) ?? [];
    list.push(row);
    result.set(key(row), list);
  }
  return result;
}

export async function loadSessionPeople(
  manager: EntityManager,
  sessions: ClassSession[],
): Promise<SessionPeople> {
  const classroomIds = [...new Set(sessions.map((row) => row.classroomId))];
  const customIds = sessions
    .filter((row) => row.customTeachers)
    .map((row) => row.id);
  const [classTeacherRows, studentRows, customRows] = await Promise.all([
    classroomIds.length > 0
      ? manager
          .getRepository(ClassroomTeacher)
          .findBy({ classroomId: In(classroomIds) })
      : Promise.resolve([]),
    classroomIds.length > 0
      ? manager.getRepository(ClassroomStudent).findBy({
          classroomId: In(classroomIds),
          removedAt: IsNull(),
        })
      : Promise.resolve([]),
    customIds.length > 0
      ? manager
          .getRepository(ClassSessionTeacher)
          .findBy({ sessionId: In(customIds) })
      : Promise.resolve([]),
  ]);
  const ids = (rows: { membershipId: string }[] | undefined) =>
    (rows ?? []).map((row) => row.membershipId);
  const classTeachers = new Map(
    [...groupBy(classTeacherRows, (row) => row.classroomId)].map(
      ([id, rows]) => [id, ids(rows)],
    ),
  );
  const students = new Map(
    [...groupBy(studentRows, (row) => row.classroomId)].map(([id, rows]) => [
      id,
      ids(rows),
    ]),
  );
  const custom = groupBy(customRows, (row) => row.sessionId);
  const teachers = new Map(
    sessions.map((session) => [
      session.id,
      session.customTeachers
        ? ids(custom.get(session.id))
        : (classTeachers.get(session.classroomId) ?? []),
    ]),
  );
  return { teachers, classTeachers, students };
}

function candidateOf(
  session: ClassSession,
  people: SessionPeople,
): OverlapCandidate {
  return {
    id: session.id,
    classroomId: session.classroomId,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    people: [
      ...(people.teachers.get(session.id) ?? []),
      ...(people.students.get(session.classroomId) ?? []),
    ],
  };
}

/**
 * Buổi của lớp khác (chưa huỷ, lớp chưa huỷ) trùng giờ và có chung giáo viên
 * hoặc học viên với các buổi `targets` (R15). `people` quyết định ai được xét
 * ở buổi đích (kiểm trước khi thêm thành viên: chỉ người sắp thêm).
 */
export async function loadConflicts(
  manager: EntityManager,
  tenantId: string,
  targets: ClassSession[],
  people: SessionPeople,
): Promise<Map<string, SessionConflict[]>> {
  const result = new Map<string, SessionConflict[]>();
  const scheduled = targets.filter(
    (row) => row.status === ClassSessionStatus.SCHEDULED,
  );
  if (scheduled.length === 0) return result;
  const candidates = scheduled.map((session) => candidateOf(session, people));
  const everyone = [...new Set(candidates.flatMap((row) => row.people))];
  if (everyone.length === 0) return result;

  const [teacherRows, studentRows, customRows] = await Promise.all([
    manager
      .getRepository(ClassroomTeacher)
      .findBy({ membershipId: In(everyone) }),
    manager
      .getRepository(ClassroomStudent)
      .findBy({ membershipId: In(everyone), removedAt: IsNull() }),
    manager
      .getRepository(ClassSessionTeacher)
      .findBy({ membershipId: In(everyone) }),
  ]);
  const classroomIds = [
    ...new Set([...teacherRows, ...studentRows].map((row) => row.classroomId)),
  ];
  const customIds = [...new Set(customRows.map((row) => row.sessionId))];
  const from = new Date(Math.min(...scheduled.map((row) => +row.startsAt)));
  const to = new Date(Math.max(...scheduled.map((row) => +row.endsAt)));
  const inWindow = {
    status: ClassSessionStatus.SCHEDULED,
    startsAt: LessThan(to),
    endsAt: MoreThan(from),
  };
  const [byClassroom, byCustom] = await Promise.all([
    classroomIds.length > 0
      ? manager
          .getRepository(ClassSession)
          .findBy({ ...inWindow, classroomId: In(classroomIds) })
      : Promise.resolve([]),
    customIds.length > 0
      ? manager
          .getRepository(ClassSession)
          .findBy({ ...inWindow, id: In(customIds) })
      : Promise.resolve([]),
  ]);
  const others = [
    ...new Map(
      [...byClassroom, ...byCustom].map((row) => [row.id, row]),
    ).values(),
  ];
  if (others.length === 0) return result;
  const classrooms = await manager.getRepository(Classroom).findBy({
    id: In([...new Set(others.map((row) => row.classroomId))]),
    tenantId,
  });
  const classroomById = new Map(
    classrooms
      .filter((row) => row.status !== ClassroomStatus.CANCELLED)
      .map((row) => [row.id, row]),
  );
  const usable = others.filter((row) => classroomById.has(row.classroomId));
  const otherPeople = await loadSessionPeople(manager, usable);
  const sessionById = new Map(usable.map((row) => [row.id, row]));
  const overlaps = findSessionOverlaps(
    candidates,
    usable.map((row) => candidateOf(row, otherPeople)),
  );
  if (overlaps.size === 0) return result;
  const names = await loadPersonRefs(manager, tenantId, [
    ...new Set([...overlaps.values()].flat().flatMap((row) => row.people)),
  ]);
  for (const [sessionId, list] of overlaps) {
    result.set(
      sessionId,
      list
        .map(({ other, people: shared }) => {
          const session = sessionById.get(other.id)!;
          return {
            sessionId: other.id,
            classroom: toClassroomRef(classroomById.get(other.classroomId)!),
            kind: session.kind,
            seq: session.seq,
            startsAt: other.startsAt,
            endsAt: other.endsAt,
            people: shared
              .map((id) => names.get(id)?.fullName ?? '')
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b, 'vi')),
          };
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  }
  return result;
}

/** Họ tên theo membership (kể cả membership đã xoá, để lịch cũ vẫn hiện tên). */
export async function loadPersonRefs(
  manager: EntityManager,
  tenantId: string,
  membershipIds: string[],
): Promise<Map<string, SessionPersonRef>> {
  const members = await loadMembers(manager, tenantId, membershipIds);
  return new Map(
    [...members].map(([id, { user }]) => [
      id,
      { membershipId: id, userId: user.id, fullName: user.fullName },
    ]),
  );
}

export function personRefs(
  ids: string[],
  refs: Map<string, SessionPersonRef>,
): SessionPersonRef[] {
  return ids
    .flatMap((id) => refs.get(id) ?? [])
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
}

/** Chương/mục giáo trình lớp map với các buổi (R17), theo thứ tự trong giáo trình. */
export async function loadSessionLinks(
  manager: EntityManager,
  sessionIds: string[],
): Promise<Map<string, SessionLinkView[]>> {
  const result = new Map<string, SessionLinkView[]>();
  if (sessionIds.length === 0) return result;
  const links = await manager
    .getRepository(ClassSessionLink)
    .findBy({ sessionId: In(sessionIds) });
  if (links.length === 0) return result;
  const itemIds = links.flatMap((row) => row.classItemId ?? []);
  const groupIds = links.flatMap((row) => row.classGroupId ?? []);
  const [items, groups] = await Promise.all([
    itemIds.length > 0
      ? manager.getRepository(ClassItem).findBy({ id: In(itemIds) })
      : Promise.resolve([]),
    groupIds.length > 0
      ? manager.getRepository(ClassGroup).findBy({ id: In(groupIds) })
      : Promise.resolve([]),
  ]);
  const contents = await loadContents(manager, items);
  const groupById = new Map(groups.map((row) => [row.id, row]));
  const itemById = new Map(items.map((row) => [row.id, row]));
  // Chương trước theo thứ tự chương; mục theo chương rồi thứ tự trong chương.
  const groupOrder = (id: string | null) =>
    id ? (groupById.get(id)?.sortOrder ?? 0) + 1 : 0;
  const order = (link: ClassSessionLink): [number, number, number] => {
    if (link.classGroupId) return [0, groupOrder(link.classGroupId), 0];
    const item = itemById.get(link.classItemId!);
    return [1, groupOrder(item?.groupId ?? null), item?.sortOrder ?? 0];
  };
  for (const [sessionId, rows] of groupBy(links, (row) => row.sessionId)) {
    result.set(
      sessionId,
      rows
        .sort((a, b) => {
          const [x, y] = [order(a), order(b)];
          return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
        })
        .flatMap((link): SessionLinkView[] => {
          if (link.classGroupId) {
            const group = groupById.get(link.classGroupId);
            return group
              ? [{ groupId: group.id, itemId: null, title: group.title }]
              : [];
          }
          const item = itemById.get(link.classItemId!);
          if (!item) return [];
          return [
            {
              groupId: null,
              itemId: item.id,
              title:
                item.title ?? contents.get(classContentIdOf(item))?.title ?? '',
            },
          ];
        }),
    );
  }
  return result;
}

/** Buổi theo thời gian; cùng giờ thì buổi thường trước. */
export function bySessionTime(a: ClassSession, b: ClassSession): number {
  return (
    a.startsAt.getTime() - b.startsAt.getTime() ||
    (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER)
  );
}

/** Dựng view cho các buổi (cùng hoặc khác lớp) kèm giáo viên, map, trùng lịch. */
export async function buildSessionViews(
  manager: EntityManager,
  tenantId: string,
  sessions: ClassSession[],
  people?: SessionPeople,
): Promise<ClassSessionView[]> {
  const loaded = people ?? (await loadSessionPeople(manager, sessions));
  const [links, conflicts] = await Promise.all([
    loadSessionLinks(
      manager,
      sessions.map((row) => row.id),
    ),
    loadConflicts(manager, tenantId, sessions, loaded),
  ]);
  const refs = await loadPersonRefs(manager, tenantId, [
    ...new Set([...loaded.teachers.values()].flat()),
  ]);
  const makeupTargets = sessions.flatMap((row) => row.makeupForSessionId ?? []);
  const known = new Map(sessions.map((row) => [row.id, row]));
  const missing = makeupTargets.filter((id) => !known.has(id));
  if (missing.length > 0) {
    for (const row of await manager
      .getRepository(ClassSession)
      .findBy({ id: In(missing) })) {
      known.set(row.id, row);
    }
  }
  return [...sessions].sort(bySessionTime).map((session) => {
    const target = session.makeupForSessionId
      ? known.get(session.makeupForSessionId)
      : undefined;
    return {
      id: session.id,
      kind: session.kind,
      seq: session.seq,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      timeOverridden: session.timeOverridden,
      status: session.status,
      cancelReason: session.cancelReason,
      location: session.location,
      note: session.note,
      makeupFor: target ? { id: target.id, seq: target.seq } : null,
      customTeachers: session.customTeachers,
      teachers: personRefs(loaded.teachers.get(session.id) ?? [], refs),
      movedWarning: session.movedWarning,
      links: links.get(session.id) ?? [],
      conflicts: conflicts.get(session.id) ?? [],
    };
  });
}
