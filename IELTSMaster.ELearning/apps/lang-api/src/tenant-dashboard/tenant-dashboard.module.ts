import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Exam } from '../exams/exam.entity';
import { MembershipsModule } from '../memberships/memberships.module';
import { TenantsModule } from '../tenants/tenants.module';
import { TenantDashboardController } from './tenant-dashboard.controller';
import { TenantDashboardService } from './tenant-dashboard.service';

@Module({
  imports: [
    TenantsModule,
    MembershipsModule,
    TypeOrmModule.forFeature([Exam, ExamAttempt]),
  ],
  controllers: [TenantDashboardController],
  providers: [TenantDashboardService],
})
export class TenantDashboardModule {}
