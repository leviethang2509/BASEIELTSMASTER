import { Controller, Get } from '@nestjs/common';
import { PermissionKey, SYSTEM_MANAGER_ROLES, type AdminStats } from '@lang/shared';
import { Permissions, SystemRoles } from '../../auth/decorators';
import { AdminStatsService } from './admin-stats.service';

@Controller('admin/stats')
@Permissions(PermissionKey.SYSTEM_AUDIT_VIEW)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  get(): Promise<AdminStats> {
    return this.stats.get();
  }
}
