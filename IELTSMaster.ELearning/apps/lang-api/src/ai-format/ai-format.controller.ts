import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  type AiFormatJob,
  type AiFormatStarted,
  type AiStatus,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { AiFormatService } from './ai-format.service';
import { AiFormatDto } from './dto/ai-format.dto';

/**
 * Định dạng đề bằng AI (req-5 plan 5, 6.1): người soạn đề; quyền sửa đề, bật
 * AI, hạn mức kiểm trong service. Job chỉ người tạo xem/huỷ được.
 */
@Controller('t/:slug')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...EXAM_AUTHOR_ROLES)
export class AiFormatController {
  constructor(private readonly aiFormat: AiFormatService) {}

  @Get('ai/status')
  status(@TenantCtx() ctx: TenantContext): Promise<AiStatus> {
    return this.aiFormat.status(ctx);
  }

  @Post('exams/:id/ai-format')
  start(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: AiFormatDto,
  ): Promise<AiFormatStarted> {
    return this.aiFormat.start(ctx, actor.id, id, dto);
  }

  @Get('exams/:id/ai-format/:jobId')
  find(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('jobId', ParseIdPipe()) jobId: string,
  ): AiFormatJob {
    return this.aiFormat.find(ctx, actor.id, id, jobId);
  }

  @Delete('exams/:id/ai-format/:jobId')
  cancel(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('jobId', ParseIdPipe()) jobId: string,
  ): Promise<AiFormatJob> {
    return this.aiFormat.cancel(ctx, actor.id, id, jobId);
  }
}
