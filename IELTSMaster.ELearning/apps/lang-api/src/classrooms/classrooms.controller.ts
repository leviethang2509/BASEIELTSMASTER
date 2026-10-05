import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  TENANT_MANAGER_ROLES,
  type AttemptReview,
  type ClassAttendance,
  type ClassCurriculum,
  type ClassFinalComment,
  type ClassGradebook,
  type ClassItemAttemptRow,
  type ClassLogEntry,
  type ClassScheduleView,
  type ClassStudentAttempts,
  type ClassSessionView,
  type ClassroomDetail,
  type ClassroomListItem,
  type ClassroomMembers,
  type MemberScheduleConflicts,
  type ScheduleChangeSummary,
  type VoidClassAttemptResult,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import type { Response as ExpressResponse } from 'express';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import type { Paginated } from '../common/pagination';
import { ParseIdPipe } from '../common/pipes';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { ClassAttemptsService } from './class-attempts.service';
import { ClassCurriculumService } from './class-curriculum.service';
import { ClassProgressService } from './class-progress.service';
import { ClassStudentAttemptsService } from './class-student-attempts.service';
import { ClassMembersService } from './class-members.service';
import { ClassScheduleService } from './class-schedule.service';
import { ClassSessionsService } from './class-sessions.service';
import { ClassroomsService } from './classrooms.service';
import { SaveClassCurriculumDto } from './dto/class-curriculum.dto';
import { SaveFinalCommentDto } from './dto/class-progress.dto';
import {
  CancelClassSessionDto,
  CreateMakeupSessionDto,
  MemberConflictsDto,
  SaveClassScheduleDto,
  SaveSessionLinksDto,
  UpdateClassSessionDto,
} from './dto/class-schedule.dto';
import { ListClassLogsQueryDto } from './dto/class-logs.dto';
import {
  AddClassroomMembersDto,
  ChangeClassroomStatusDto,
  CreateClassroomDto,
  ListClassroomsQueryDto,
  UpdateClassroomDto,
} from './dto/classroom.dto';

/**
 * Lớp học (plan mục 5): Owner/Admin tạo/sửa/đổi trạng thái/xoá, thêm/xoá giáo
 * viên & học viên, sửa lịch lặp; giáo viên của lớp xem lớp, sửa giáo trình lớp
 * và thao tác trên buổi học. Teacher ngoài lớp bị chặn trong service
 * (`loadClassroomAccess`).
 */
@Controller('t/:slug/classes')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class ClassroomsController {
  constructor(
    private readonly classrooms: ClassroomsService,
    private readonly members: ClassMembersService,
    private readonly curriculum: ClassCurriculumService,
    private readonly schedule: ClassScheduleService,
    private readonly sessions: ClassSessionsService,
    private readonly classAttempts: ClassAttemptsService,
    private readonly studentAttempts: ClassStudentAttemptsService,
    private readonly progress: ClassProgressService,
  ) {}

  @Get()
  @Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  list(
    @TenantCtx() ctx: TenantContext,
    @Query() query: ListClassroomsQueryDto,
  ): Promise<Paginated<ClassroomListItem>> {
    return this.classrooms.list(ctx, query);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateClassroomDto,
  ): Promise<ClassroomDetail> {
    return this.classrooms.create(ctx, actor.id, dto);
  }

  @Get(':id')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  detail(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ClassroomDetail> {
    return this.classrooms.getDetail(ctx, id);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateClassroomDto,
  ): Promise<ClassroomDetail> {
    return this.classrooms.update(ctx, actor.id, id, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: ChangeClassroomStatusDto,
  ): Promise<ClassroomDetail> {
    return this.classrooms.changeStatus(ctx, actor.id, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.classrooms.remove(ctx, id);
  }

  @Get(':id/members')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  listMembers(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ClassroomMembers> {
    return this.members.list(ctx, id);
  }

  @Post(':id/teachers')
  @HttpCode(HttpStatus.OK)
  addTeachers(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: AddClassroomMembersDto,
  ): Promise<ClassroomMembers> {
    return this.members.addTeachers(ctx, actor.id, id, dto.membershipIds);
  }

  @Delete(':id/teachers/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeacher(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
  ): Promise<void> {
    return this.members.removeTeacher(ctx, actor.id, id, membershipId);
  }

  @Post(':id/students')
  @HttpCode(HttpStatus.OK)
  addStudents(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: AddClassroomMembersDto,
  ): Promise<ClassroomMembers> {
    return this.members.addStudents(ctx, actor.id, id, dto.membershipIds);
  }

  @Delete(':id/students/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudent(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
  ): Promise<void> {
    return this.members.removeStudent(ctx, actor.id, id, membershipId);
  }

  /** Bài làm chi tiết của một học viên trong lớp (F4). */
  @Get(':id/students/:membershipId/attempts')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  studentAttemptList(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
  ): Promise<ClassStudentAttempts> {
    return this.studentAttempts.listForStudent(ctx, id, membershipId);
  }

  @Get(':id/students/:membershipId/attempts/:attemptId')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  studentExamReview(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Param('attemptId', ParseIdPipe()) attemptId: string,
  ): Promise<AttemptReview> {
    return this.studentAttempts.examReview(ctx, id, membershipId, attemptId);
  }

  @Get(
    ':id/students/:membershipId/attempts/:attemptId/recordings/:answerId/url',
  )
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  studentExamRecordingUrl(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Param('attemptId', ParseIdPipe()) attemptId: string,
    @Param('answerId', ParseIdPipe()) answerId: string,
  ): Promise<{ url: string }> {
    return this.studentAttempts.examRecordingUrl(
      ctx,
      id,
      membershipId,
      attemptId,
      answerId,
    );
  }

  @Get(':id/students/:membershipId/lesson-attempts/:attemptId')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  studentLessonReview(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Param('attemptId', ParseIdPipe()) attemptId: string,
  ): Promise<AttemptReview> {
    return this.studentAttempts.lessonReview(ctx, id, membershipId, attemptId);
  }

  @Get(
    ':id/students/:membershipId/lesson-attempts/:attemptId/recordings/:answerId/url',
  )
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  studentLessonRecordingUrl(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Param('attemptId', ParseIdPipe()) attemptId: string,
    @Param('answerId', ParseIdPipe()) answerId: string,
  ): Promise<{ url: string }> {
    return this.studentAttempts.lessonRecordingUrl(
      ctx,
      id,
      membershipId,
      attemptId,
      answerId,
    );
  }

  /** Cảnh báo trùng lịch trước khi thêm giáo viên/học viên (R15). */
  @Post(':id/conflicts')
  @HttpCode(HttpStatus.OK)
  memberConflicts(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: MemberConflictsDto,
  ): Promise<MemberScheduleConflicts[]> {
    return this.schedule.memberConflicts(ctx, id, dto.membershipIds);
  }

  @Get(':id/schedule')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  getSchedule(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ClassScheduleView> {
    return this.schedule.get(ctx, id);
  }

  @Put(':id/schedule')
  saveSchedule(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: SaveClassScheduleDto,
  ): Promise<ClassScheduleView> {
    return this.schedule.save(ctx, actor.id, id, dto);
  }

  @Post(':id/schedule/preview')
  @HttpCode(HttpStatus.OK)
  previewSchedule(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: SaveClassScheduleDto,
  ): Promise<ScheduleChangeSummary> {
    return this.schedule.preview(ctx, id, dto);
  }

  @Post(':id/sessions/makeup')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  createMakeup(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: CreateMakeupSessionDto,
  ): Promise<ClassSessionView> {
    return this.sessions.createMakeup(ctx, actor.id, id, dto);
  }

  @Patch(':id/sessions/:sessionId')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  updateSession(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sessionId', ParseIdPipe()) sessionId: string,
    @Body() dto: UpdateClassSessionDto,
  ): Promise<ClassSessionView> {
    return this.sessions.update(ctx, actor.id, id, sessionId, dto);
  }

  @Post(':id/sessions/:sessionId/cancel')
  @HttpCode(HttpStatus.OK)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  cancelSession(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sessionId', ParseIdPipe()) sessionId: string,
    @Body() dto: CancelClassSessionDto,
  ): Promise<ClassSessionView> {
    return this.sessions.cancel(
      ctx,
      actor.id,
      id,
      sessionId,
      dto.reason ?? null,
    );
  }

  @Post(':id/sessions/:sessionId/restore')
  @HttpCode(HttpStatus.OK)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  restoreSession(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sessionId', ParseIdPipe()) sessionId: string,
  ): Promise<ClassSessionView> {
    return this.sessions.restore(ctx, actor.id, id, sessionId);
  }

  @Delete(':id/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  removeMakeup(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sessionId', ParseIdPipe()) sessionId: string,
  ): Promise<void> {
    return this.sessions.removeMakeup(ctx, actor.id, id, sessionId);
  }

  @Put(':id/sessions/:sessionId/links')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  saveSessionLinks(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sessionId', ParseIdPipe()) sessionId: string,
    @Body() dto: SaveSessionLinksDto,
  ): Promise<ClassSessionView> {
    return this.sessions.saveLinks(ctx, actor.id, id, sessionId, dto);
  }

  @Get(':id/curriculum')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  getCurriculum(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ClassCurriculum> {
    return this.curriculum.get(ctx, id);
  }

  @Put(':id/curriculum')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  saveCurriculum(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: SaveClassCurriculumDto,
  ): Promise<ClassCurriculum> {
    return this.curriculum.save(ctx, actor.id, id, dto);
  }

  @Get(':id/items/:itemId/attempts')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  itemAttempts(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('itemId', ParseIdPipe()) itemId: string,
  ): Promise<ClassItemAttemptRow[]> {
    return this.classAttempts.listForItem(ctx, id, itemId);
  }

  @Post(':id/items/:itemId/void/:attemptId')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  @HttpCode(HttpStatus.OK)
  voidAttempt(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('itemId', ParseIdPipe()) itemId: string,
    @Param('attemptId', ParseIdPipe()) attemptId: string,
  ): Promise<VoidClassAttemptResult> {
    return this.classAttempts.voidAttempt(ctx, actor.id, id, itemId, attemptId);
  }

  /** Chuyên cần của lớp (R11): Owner/Admin và giáo viên của lớp. */
  @Get(':id/progress/attendance')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  attendance(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ClassAttendance> {
    return this.progress.attendance(ctx, id);
  }

  @Get(':id/progress/gradebook')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  gradebook(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ClassGradebook> {
    return this.progress.gradebook(ctx, id);
  }

  /** Excel 2 sheet: Chuyên cần, Bảng điểm (E7.4). */
  @Get(':id/progress/export.xlsx')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportProgress(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<StreamableFile> {
    const { fileName, buffer } = await this.progress.workbook(ctx, id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    return new StreamableFile(buffer);
  }

  /** Nhận xét cuối khoá của một học viên (T5). */
  @Put(':id/students/:membershipId/comment')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  saveFinalComment(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Body() dto: SaveFinalCommentDto,
  ): Promise<ClassFinalComment | null> {
    return this.progress.saveComment(ctx, actor.id, id, membershipId, dto.text);
  }

  @Get(':id/logs')
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  logs(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Query() query: ListClassLogsQueryDto,
  ): Promise<Paginated<ClassLogEntry>> {
    return this.classrooms.logs(ctx, id, query);
  }
}
