import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  PermissionKey,
  TENANT_MANAGER_ROLES,
  type HolidayImpact,
  type TenantTrainingSettings,
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
import {
  HolidayDto,
  HolidayImpactDto,
  UpdateTenantSettingsDto,
} from './dto/tenant-settings.dto';
import { TenantSettingsService } from './tenant-settings.service';

/** Cài đặt trung tâm: tham số chuyên cần, ngày nghỉ (plan mục 5: Owner/Admin). */
@Controller('t/:slug/settings')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.TENANT_SETTINGS_EDIT)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class TenantSettingsController {
  constructor(private readonly settings: TenantSettingsService) {}

  @Get()
  get(@TenantCtx() ctx: TenantContext): Promise<TenantTrainingSettings> {
    return this.settings.get(ctx);
  }

  @Patch()
  update(
    @TenantCtx() ctx: TenantContext,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantTrainingSettings> {
    return this.settings.update(ctx, dto);
  }

  @Post('holidays')
  createHoliday(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: HolidayDto,
  ): Promise<TenantTrainingSettings> {
    return this.settings.createHoliday(ctx, actor.id, dto);
  }

  @Post('holidays/impact')
  @HttpCode(HttpStatus.OK)
  impact(
    @TenantCtx() ctx: TenantContext,
    @Body() dto: HolidayImpactDto,
  ): Promise<HolidayImpact> {
    return this.settings.impact(ctx, dto);
  }

  @Patch('holidays/:id')
  updateHoliday(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: HolidayDto,
  ): Promise<TenantTrainingSettings> {
    return this.settings.updateHoliday(ctx, actor.id, id, dto);
  }

  @Delete('holidays/:id')
  removeHoliday(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<TenantTrainingSettings> {
    return this.settings.removeHoliday(ctx, actor.id, id);
  }
}
