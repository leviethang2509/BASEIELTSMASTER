import {
  AttendanceMark,
  ClassLogAction,
  ClassroomStatus,
  GradebookColumnKind,
  NotificationType,
  type ClassAttendance,
  type ClassFinalComment,
  type ClassGradebook,
  type GradebookCell,
  type GradebookColumn,
  type GradebookRow,
} from '@lang/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DataSource, type EntityManager } from 'typeorm';
import {
  learnerClassLink,
  userIdsOfMemberships,
} from '../notifications/notification-targets';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { writeClassLog } from './class-logs';
import {
  attendanceColumns,
  attendanceRows,
  gradebookColumns,
  gradebookGroups,
  gradebookRows,
  loadClassProgress,
  UNGROUPED_TITLE,
  type ClassProgressData,
} from './class-progress';
import { loadClassroomAccess } from './classroom-access';
import { ClassroomStudent } from './classroom-student.entity';
import { toClassroomRef } from './classroom.mapper';

const STUDENT_NOT_FOUND = 'Không tìm thấy học viên này trong lớp';
const COMMENT_CLOSED =
  'Chỉ viết nhận xét cuối khoá khi lớp đang học hoặc đã kết thúc';

/**
 * Chuyên cần, bảng điểm, nhận xét cuối khoá và xuất Excel (req-3 Step 11;
 * R11–R12, T5). Quyền theo lớp: Owner/Admin mọi lớp, Teacher lớp mình
 * (`loadClassroomAccess`); học viên/phụ huynh xem phần của mình ở khu vực học
 * viên khi lớp đã kết thúc (`learnerSummary`).
 */
@Injectable()
export class ClassProgressService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async attendance(
    ctx: TenantContext,
    classroomId: string,
  ): Promise<ClassAttendance> {
    const manager = this.dataSource.manager;
    const access = await loadClassroomAccess(manager, ctx, classroomId);
    const data = await loadClassProgress(manager, access.classroom);
    const columns = attendanceColumns(data);
    return {
      classroom: toClassroomRef(access.classroom),
      params: data.params,
      canManageParams: access.canManage,
      columns,
      rows: attendanceRows(data, columns, new Date()),
    };
  }

  async gradebook(
    ctx: TenantContext,
    classroomId: string,
  ): Promise<ClassGradebook> {
    const manager = this.dataSource.manager;
    const access = await loadClassroomAccess(manager, ctx, classroomId);
    const data = await loadClassProgress(manager, access.classroom);
    const columns = gradebookColumns(data);
    return {
      classroom: toClassroomRef(access.classroom),
      groups: gradebookGroups(data),
      columns,
      rows: gradebookRows(data, columns),
      canComment: canComment(access.classroom.status),
    };
  }

  /** Nhận xét cuối khoá; chuỗi rỗng = xoá nhận xét (T5.1). */
  async saveComment(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    membershipId: string,
    text: string,
  ): Promise<ClassFinalComment | null> {
    const value = text.trim() === '' ? null : text.trim();
    return this.dataSource.transaction(async (manager) => {
      const access = await loadClassroomAccess(manager, ctx, classroomId, true);
      if (!canComment(access.classroom.status)) {
        throw new ConflictException(COMMENT_CLOSED);
      }
      const enrollment = await this.findEnrollment(
        manager,
        classroomId,
        membershipId,
      );
      const now = new Date();
      await manager.getRepository(ClassroomStudent).update(enrollment.id, {
        finalComment: value,
        finalCommentBy: value === null ? null : actorId,
        finalCommentAt: value === null ? null : now,
      });
      const data = await loadClassProgress(manager, access.classroom);
      const student = data.students.find(
        (row) => row.enrollment.membershipId === membershipId,
      );
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.FINAL_COMMENT_SAVED,
        {
          studentName: student?.user.fullName ?? '',
          ...(value === null ? { cleared: true } : {}),
        },
      );
      // Lớp đã kết thúc: học viên xem được ngay nên báo mỗi lần sửa (T5.3);
      // lớp đang học thì chờ lúc chuyển "Đã kết thúc" mới báo.
      if (
        value !== null &&
        access.classroom.status === ClassroomStatus.FINISHED
      ) {
        await this.notifications.notify(manager, {
          userIds: await userIdsOfMemberships(manager, [membershipId]),
          tenantId: ctx.tenantId,
          type: NotificationType.FINAL_COMMENT_PUBLISHED,
          params: { className: access.classroom.name },
          link: learnerClassLink(ctx.slug, classroomId),
          exceptUserId: actorId,
        });
      }
      if (value === null) return null;
      const author = data.commenters.get(actorId);
      return {
        text: value,
        updatedAt: now.toISOString(),
        author: author
          ? { id: author.id, fullName: author.fullName }
          : { id: actorId, fullName: '' },
      };
    });
  }

  /** File Excel 2 sheet: Chuyên cần, Bảng điểm (E7.4, R12, T5.4). */
  async workbook(
    ctx: TenantContext,
    classroomId: string,
  ): Promise<{ fileName: string; buffer: Buffer }> {
    const manager = this.dataSource.manager;
    const access = await loadClassroomAccess(manager, ctx, classroomId);
    const data = await loadClassProgress(manager, access.classroom);
    const buffer = await buildWorkbook(data, new Date());
    return {
      fileName: `bang-diem-${access.classroom.code.toLowerCase()}.xlsx`,
      buffer,
    };
  }

  private async findEnrollment(
    manager: EntityManager,
    classroomId: string,
    membershipId: string,
  ): Promise<ClassroomStudent> {
    const enrollment = await manager
      .getRepository(ClassroomStudent)
      .findOneBy({ classroomId, membershipId });
    if (!enrollment) throw new NotFoundException(STUDENT_NOT_FOUND);
    return enrollment;
  }
}

/** Viết nhận xét cuối khoá khi lớp đang học hoặc đã kết thúc (T5.2). */
function canComment(status: ClassroomStatus): boolean {
  return (
    status === ClassroomStatus.ONGOING || status === ClassroomStatus.FINISHED
  );
}

const MARK_LABELS: Record<AttendanceMark, string> = {
  [AttendanceMark.ON_TIME]: 'Đúng hạn',
  [AttendanceMark.LATE]: 'Muộn',
  [AttendanceMark.MISSED]: 'Chưa nộp',
  [AttendanceMark.IN_PROGRESS]: 'Đang làm',
  [AttendanceMark.PENDING]: 'Chưa tới hạn',
  [AttendanceMark.EXCLUDED]: 'Không tính',
};

/** Ô điểm của một cột bảng điểm dưới dạng chữ (Excel). */
function cellText(column: GradebookColumn, cell: GradebookCell): string {
  if (cell.kind === GradebookColumnKind.LESSON) {
    const parts: string[] = [];
    if (cell.percent !== null) parts.push(`${cell.percent}%`);
    if (cell.completed) parts.push('Đã học xong');
    else if (cell.started) parts.push('Đang học');
    return parts.join(' · ') || 'Chưa học';
  }
  if (cell.percent === null) {
    if (cell.hasPending) return 'Chờ chấm';
    return cell.attempts.length === 0 ? 'Chưa thi' : 'Chưa có điểm';
  }
  const verdict = cell.passed ? 'Đậu' : 'Trượt';
  const pending = cell.hasPending ? ' · còn lượt chờ chấm' : '';
  const threshold =
    column.passThreshold === null ? '' : ` (ngưỡng ${column.passThreshold}%)`;
  return `${cell.percent}% · ${verdict}${threshold}${pending}`;
}

async function buildWorkbook(
  data: ClassProgressData,
  now: Date,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = now;

  const columns = attendanceColumns(data);
  const rows = attendanceRows(data, columns, now);
  const sheet = workbook.addWorksheet('Chuyên cần');
  sheet.addRow([`Lớp ${data.classroom.code} – ${data.classroom.name}`]).font = {
    bold: true,
  };
  sheet.addRow([
    `Hệ số nộp muộn ${data.params.lateWeight} · ngưỡng cảnh báo ${data.params.warningThreshold}%`,
  ]);
  sheet.addRow([]);
  sheet.addRow([
    'Học viên',
    'Email',
    'Trạng thái',
    ...columns.map((column) =>
      column.attemptIndex > 1
        ? `${column.title} (lần ${column.attemptIndex})`
        : column.title,
    ),
    'Đúng hạn',
    'Muộn',
    'Chưa nộp',
    'Số mục tính',
    'Tỉ lệ chuyên cần',
  ]).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([
      row.student.fullName,
      row.student.email,
      studentStatus(row.student),
      ...row.cells.map((cell) => MARK_LABELS[cell.mark]),
      row.rate.onTime,
      row.rate.late,
      row.rate.missed,
      row.rate.counted,
      row.rate.percent === null ? '—' : `${row.rate.percent}%`,
    ]);
  }
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 28;

  const gradeColumns = gradebookColumns(data);
  const gradeRows = gradebookRows(data, gradeColumns);
  const grades = workbook.addWorksheet('Bảng điểm');
  grades.addRow([`Lớp ${data.classroom.code} – ${data.classroom.name}`]).font =
    { bold: true };
  grades.addRow([]);
  grades.addRow([
    'Học viên',
    'Email',
    'Trạng thái',
    ...gradeColumns.map((column) =>
      column.groupTitle
        ? `${column.groupTitle} · ${column.title}`
        : column.title,
    ),
    ...groupAverageHeaders(data, gradeRows),
    'Nhận xét cuối khoá',
  ]).font = { bold: true };
  for (const row of gradeRows) {
    grades.addRow([
      row.student.fullName,
      row.student.email,
      studentStatus(row.student),
      ...row.cells.map((cell, index) => cellText(gradeColumns[index]!, cell)),
      ...row.groupAverages.map((average) =>
        average.percent === null ? '—' : `${average.percent}%`,
      ),
      row.comment?.text ?? '',
    ]);
  }
  grades.getColumn(1).width = 28;
  grades.getColumn(2).width = 28;
  // Cột Nhận xét cuối khoá (cột cuối).
  grades.getColumn(grades.columnCount).width = 50;

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

function groupAverageHeaders(
  data: ClassProgressData,
  rows: GradebookRow[],
): string[] {
  const titleOf = new Map<string | null, string>([
    [null, UNGROUPED_TITLE],
    ...data.groups.map((group) => [group.id, group.title] as const),
  ]);
  return (rows[0]?.groupAverages ?? []).map(
    (average) => `TB ${titleOf.get(average.groupId) ?? UNGROUPED_TITLE}`,
  );
}

function studentStatus(student: {
  removed: boolean;
  inactive: boolean;
}): string {
  if (student.removed) return 'Đã rời lớp';
  return student.inactive ? 'Đã ngừng' : 'Đang học';
}
