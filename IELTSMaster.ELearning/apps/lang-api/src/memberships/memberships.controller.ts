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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  PermissionKey,
  TENANT_MANAGER_ROLES,
  type CreateMemberAccountResult,
  type DeactivationSuggestions,
  type GuardianLink,
  type MembershipDetail,
  type MembershipListItem,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
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
import {
  AddGuardianDto,
  AddMemberByEmailDto,
  CreateMemberAccountDto,
  ListMembershipsQueryDto,
  UpdateMembershipDto,
} from './dto/membership.dto';
import { MembershipsService } from './memberships.service';

@Controller('t/:slug/memberships')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.TENANT_MEMBERS_MANAGE)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @Query() query: ListMembershipsQueryDto,
  ): Promise<Paginated<MembershipListItem>> {
    return this.memberships.list(ctx, query);
  }

  @Post('add-by-email')
  addByEmail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: AddMemberByEmailDto,
  ): Promise<MembershipListItem> {
    return this.memberships.addByEmail(ctx, actor, dto);
  }

  @Post('create-account')
  createAccount(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateMemberAccountDto,
  ): Promise<CreateMemberAccountResult> {
    return this.memberships.createAccount(ctx, actor, dto);
  }

  /** Khai báo trước `:id` để không bị `ParseIdPipe` bắt. */
  @Get('deactivation-suggestions')
  deactivationSuggestions(
    @TenantCtx() ctx: TenantContext,
  ): Promise<DeactivationSuggestions> {
    return this.memberships.deactivationSuggestions(ctx);
  }

  @Get(':id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<MembershipDetail> {
    return this.memberships.getDetail(ctx, id);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateMembershipDto,
  ): Promise<MembershipListItem> {
    return this.memberships.update(ctx, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.memberships.remove(ctx, id);
  }

  @Post(':id/guardians')
  addGuardian(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: AddGuardianDto,
  ): Promise<GuardianLink> {
    return this.memberships.addGuardian(ctx, actor, id, dto);
  }

  @Delete(':id/guardians/:parentMembershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeGuardian(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('parentMembershipId', ParseIdPipe()) parentMembershipId: string,
  ): Promise<void> {
    return this.memberships.removeGuardian(ctx, id, parentMembershipId);
  }
}
