import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  isClassroomClosed,
} from '@lang/shared';
import type { EntityManager } from 'typeorm';
import type { TenantContext } from '../tenants/tenant-context';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';

export const CLASSROOM_NOT_FOUND = 'Không tìm thấy lớp học';
export const NOT_CLASS_TEACHER = 'Bạn không phụ trách lớp học này';
export const CLASSROOM_CLOSED =
  'Lớp học đã kết thúc hoặc đã huỷ, chỉ xem được, không sửa được';

/** Owner/Admin quản lý mọi lớp (D11). */
export function isClassManager(ctx: TenantContext): boolean {
  return hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES);
}

/** Lớp thuộc tenant; khoá dòng khi đọc trong transaction ghi. */
export async function findClassroom(
  manager: EntityManager,
  tenantId: string,
  id: string,
  lock = false,
): Promise<Classroom> {
  const classroom = await manager.getRepository(Classroom).findOne({
    where: { id, tenantId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!classroom) throw new NotFoundException(CLASSROOM_NOT_FOUND);
  return classroom;
}

/** Quyền của người đang thao tác trên một lớp. */
export interface ClassroomAccess {
  classroom: Classroom;
  /** Owner/Admin: thông tin, trạng thái, giáo viên, học viên. */
  canManage: boolean;
  /** Là giáo viên của lớp (danh sách `classroom_teachers`). */
  isTeacher: boolean;
  /** Giáo viên của lớp hoặc Owner/Admin, lớp chưa kết thúc/huỷ (E1–E2). */
  canEditCurriculum: boolean;
}

/**
 * Nạp lớp và quyền (plan mục 5): Owner/Admin mọi lớp; Teacher chỉ lớp mình
 * phụ trách, lớp khác 403. Student/Parent xem lớp ở khu vực học viên (Step 9,
 * 13), không qua helper này.
 */
export async function loadClassroomAccess(
  manager: EntityManager,
  ctx: TenantContext,
  id: string,
  lock = false,
): Promise<ClassroomAccess> {
  const classroom = await findClassroom(manager, ctx.tenantId, id, lock);
  const canManage = isClassManager(ctx);
  const isTeacher = await manager
    .getRepository(ClassroomTeacher)
    .existsBy({ classroomId: id, membershipId: ctx.membershipId });
  if (!canManage && !isTeacher) throw new ForbiddenException(NOT_CLASS_TEACHER);
  return {
    classroom,
    canManage,
    isTeacher,
    canEditCurriculum: !isClassroomClosed(classroom.status),
  };
}

/** Lớp đã kết thúc/huỷ: không sửa giáo trình lớp, giáo viên, học viên. */
export function assertClassroomOpen(classroom: Classroom): void {
  if (isClassroomClosed(classroom.status)) {
    throw new ConflictException(CLASSROOM_CLOSED);
  }
}
