import type { ClassLogAction, ClassLogDetail } from '@lang/shared';
import type { EntityManager } from 'typeorm';
import { ClassChangeLog } from './class-change-log.entity';

/** Ghi một dòng nhật ký thay đổi của lớp (E2), trong transaction đang chạy. */
export async function writeClassLog(
  manager: EntityManager,
  classroomId: string,
  actorUserId: string,
  action: ClassLogAction,
  detail: ClassLogDetail = {},
): Promise<void> {
  const repository = manager.getRepository(ClassChangeLog);
  await repository.insert(
    repository.create({
      classroomId,
      actorUserId,
      action,
      detail,
      createdAt: new Date(),
    }),
  );
}
