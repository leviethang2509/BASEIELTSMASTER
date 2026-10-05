import { Controller, Get, Param } from '@nestjs/common';
import type { PublicTenant } from '@lang/shared';
import { Public } from '../auth/decorators';
import { TenantsService } from './tenants.service';

@Public()
@Controller('public/tenants')
export class PublicTenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':slug')
  get(@Param('slug') slug: string): Promise<PublicTenant> {
    return this.tenants.getPublic(slug);
  }
}
