import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityProviderClient } from '../auth/identity-provider.client';
import { MembershipRole } from '../memberships/membership-role.entity';
import { Membership } from '../memberships/membership.entity';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';
import { PublicTenantsController } from './public-tenants.controller';
import { TenantMeController } from './tenant-me.controller';
import { Tenant } from './tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

/**
 * Dang ky tenant va `TenantGuard`. Guard doc quyen tenant tu AuthService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Membership, MembershipRole]),
    PlansModule,
    UsersModule,
  ],
  controllers: [TenantsController, PublicTenantsController, TenantMeController],
  providers: [TenantsService, IdentityProviderClient],
  exports: [TypeOrmModule, PlansModule, UsersModule, IdentityProviderClient],
})
export class TenantsModule {}
