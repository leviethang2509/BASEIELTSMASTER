import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  PermissionKey,
  SYSTEM_MANAGER_ROLES,
  type AdminTenant,
  type AdminTenantDetail,
} from '@lang/shared';
import { Permissions, SystemRoles } from '../../auth/decorators';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/current-user.decorator';
import type { Paginated } from '../../common/pagination';
import { ParseIdPipe } from '../../common/pipes';
import { AdminTenantsService } from './admin-tenants.service';
import {
  ChangeTenantPlanDto,
  ListAdminTenantsQueryDto,
  TenantReasonDto,
  UpdateTenantAiDto,
} from './dto/admin-tenant.dto';

/** Các thao tác đổi trạng thái trả về tenant sau khi đổi. */
@Controller('admin/tenants')
@Permissions(PermissionKey.SYSTEM_TENANTS_MANAGE)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminTenantsController {
  constructor(private readonly tenants: AdminTenantsService) {}

  @Get()
  list(
    @Query() query: ListAdminTenantsQueryDto,
  ): Promise<Paginated<AdminTenant>> {
    return this.tenants.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe()) id: string): Promise<AdminTenantDetail> {
    return this.tenants.get(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AdminTenantDetail> {
    await this.tenants.approve(actor, id);
    return this.tenants.get(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: TenantReasonDto,
  ): Promise<AdminTenantDetail> {
    await this.tenants.reject(actor, id, dto.reason);
    return this.tenants.get(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: TenantReasonDto,
  ): Promise<AdminTenantDetail> {
    await this.tenants.suspend(actor, id, dto.reason);
    return this.tenants.get(id);
  }

  @Post(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspend(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AdminTenantDetail> {
    await this.tenants.unsuspend(actor, id);
    return this.tenants.get(id);
  }

  @Patch(':id/plan')
  async changePlan(
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: ChangeTenantPlanDto,
  ): Promise<AdminTenantDetail> {
    await this.tenants.changePlan(id, dto.planId);
    return this.tenants.get(id);
  }

  @Patch(':id/ai')
  async updateAi(
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateTenantAiDto,
  ): Promise<AdminTenantDetail> {
    await this.tenants.updateAi(id, dto.enabled, dto.monthlyQuota);
    return this.tenants.get(id);
  }
}
