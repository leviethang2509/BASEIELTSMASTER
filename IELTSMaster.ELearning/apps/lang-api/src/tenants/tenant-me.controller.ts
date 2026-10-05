import { Controller, Get, UseGuards } from '@nestjs/common';
import type { TenantMembershipInfo } from '@lang/shared';
import { TenantCtx, type TenantContext } from './tenant-context';
import { TenantGuard } from './tenant.guard';
import { TenantsService } from './tenants.service';

/** Mọi thành viên (kể cả Học viên/Phụ huynh); gọi trang `/t/{slug}` cũng ghi lần vào tenant. */
@Controller('t/:slug/me')
@UseGuards(TenantGuard)
export class TenantMeController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  get(@TenantCtx() ctx: TenantContext): Promise<TenantMembershipInfo> {
    return this.tenants.getMembershipInfo(ctx);
  }
}
