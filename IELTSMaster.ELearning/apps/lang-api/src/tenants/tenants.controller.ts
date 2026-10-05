import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { OwnedTenant } from '@lang/shared';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
import { SlugSuggestionQueryDto, TenantFormDto } from './dto/tenant.dto';
import { TenantsService } from './tenants.service';

/** Tenant do chính user đăng ký. */
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  register(
    @CurrentUser() user: RequestUser,
    @Body() dto: TenantFormDto,
  ): Promise<OwnedTenant> {
    return this.tenants.register(user.id, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: RequestUser): Promise<OwnedTenant[]> {
    return this.tenants.listMine(user.id);
  }

  @Get('slug-suggestion')
  async suggestSlug(
    @Query() query: SlugSuggestionQueryDto,
  ): Promise<{ slug: string }> {
    return { slug: await this.tenants.suggestSlug(query.name) };
  }

  @Put(':id')
  resubmit(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: TenantFormDto,
  ): Promise<OwnedTenant> {
    return this.tenants.resubmit(user.id, id, dto);
  }
}
