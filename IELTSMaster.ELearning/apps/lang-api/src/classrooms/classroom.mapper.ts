import type {
  ClassItemView,
  ClassroomListItem,
  ClassroomRef,
  CourseRef,
  CurriculumContentRef,
  ExamUserRef,
} from '@lang/shared';
import type { ClassItem } from './class-item.entity';
import type { Classroom } from './classroom.entity';

export function toClassroomRef(classroom: Classroom): ClassroomRef {
  return {
    id: classroom.id,
    code: classroom.code,
    name: classroom.name,
    status: classroom.status,
  };
}

export function toClassroomListItem(
  classroom: Classroom,
  extra: { course: CourseRef; studentCount: number; teachers: ExamUserRef[] },
): ClassroomListItem {
  return {
    ...toClassroomRef(classroom),
    course: extra.course,
    startDate: classroom.startDate,
    endDate: classroom.endDate,
    plannedSessions: classroom.plannedSessions,
    maxStudents: classroom.maxStudents,
    location: classroom.location,
    studentCount: extra.studentCount,
    teachers: extra.teachers,
    updatedAt: classroom.updatedAt.toISOString(),
  };
}

export function toClassItemView(
  item: ClassItem,
  content: CurriculumContentRef,
  learnerCount: number,
): ClassItemView {
  return {
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    label: item.label,
    note: item.note,
    content: { id: content.id, title: content.title, status: content.status },
    opensAt: item.opensAt?.toISOString() ?? null,
    deadlineAt: item.deadlineAt?.toISOString() ?? null,
    acceptLate: item.acceptLate,
    passThreshold: item.passThreshold,
    retakeOfItemId: item.retakeOfItemId,
    learnerCount,
    removedAt: item.removedAt?.toISOString() ?? null,
  };
}

/** Id bài học/đề thi của mục (CHECK bảo đảm có đúng một). */
export function classContentIdOf(item: Pick<ClassItem, 'lessonId' | 'examId'>) {
  return (item.lessonId ?? item.examId)!;
}
