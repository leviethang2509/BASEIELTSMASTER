import { Controller, Get } from '@nestjs/common';
import { SYSTEM_MANAGER_ROLES, type UserManual } from '@lang/shared';
import { SystemRoles } from '../auth/decorators';
import { USER_MANUAL } from './user-manual.content';

// Nội dung nằm trong API (không ở `public/` của lang-app) để chỉ System
// Owner/Admin tải được.
@Controller('admin/user-manual')
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminUserManualController {
  @Get()
  get(): UserManual {
    return USER_MANUAL;
  }
}
