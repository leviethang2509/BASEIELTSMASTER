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
  SystemRole,
  UserStatus,
  type AdminUser,
  type AdminUserPasswordResult,
} from '@lang/shared';
import { Permissions, SystemRoles } from '../../auth/decorators';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/current-user.decorator';
import type { Paginated } from '../../common/pagination';
import { ParseIdPipe } from '../../common/pipes';
import { AdminUsersService } from './admin-users.service';
import {
  ChangeSystemRoleDto,
  CreateUserDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/admin-user.dto';

@Controller('admin/users')
@Permissions(PermissionKey.SYSTEM_USERS_MANAGE)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto): Promise<Paginated<AdminUser>> {
    return this.users.list(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<AdminUserPasswordResult> {
    return this.users.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe()) id: string): Promise<AdminUser> {
    return this.users.get(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<AdminUser> {
    return this.users.update(actor, id, dto);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  lock(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AdminUser> {
    return this.users.setStatus(actor, id, UserStatus.LOCKED);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  unlock(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AdminUser> {
    return this.users.setStatus(actor, id, UserStatus.ACTIVE);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<AdminUserPasswordResult> {
    return this.users.resetPassword(actor, id, dto);
  }

  @Patch(':id/system-role')
  @Permissions(PermissionKey.SYSTEM_ROLES_ASSIGN)
  @SystemRoles(SystemRole.SYSTEM_OWNER)
  changeSystemRole(
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: ChangeSystemRoleDto,
  ): Promise<AdminUser> {
    return this.users.changeSystemRole(id, dto);
  }
}
