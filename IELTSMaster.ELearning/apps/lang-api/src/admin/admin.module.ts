import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiFormatRun } from '../ai-format/ai-format-run.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { AdminPlansController } from './plans/admin-plans.controller';
import { AdminPlansService } from './plans/admin-plans.service';
import { AdminStatsController } from './stats/admin-stats.controller';
import { AdminStatsService } from './stats/admin-stats.service';
import { AdminTenantsController } from './tenants/admin-tenants.controller';
import { AdminTenantsService } from './tenants/admin-tenants.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

/** API `/admin/*` cho System Owner/Admin (plan mục 5.1). */
@Module({
  imports: [
    TenantsModule,
    TypeOrmModule.forFeature([RefreshToken, AiFormatRun]),
  ],
  controllers: [
    AdminStatsController,
    AdminUsersController,
    AdminTenantsController,
    AdminPlansController,
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminTenantsService,
    AdminPlansService,
  ],
})
export class AdminModule {}
