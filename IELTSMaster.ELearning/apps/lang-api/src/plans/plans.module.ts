import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './plans.service';
import { PublicPlansController } from './public-plans.controller';
import { ServicePlan } from './service-plan.entity';

/** Gói dịch vụ. CRUD cho System Owner/Admin thêm ở Step 7. */
@Module({
  imports: [TypeOrmModule.forFeature([ServicePlan])],
  controllers: [PublicPlansController],
  providers: [PlansService],
  exports: [TypeOrmModule, PlansService],
})
export class PlansModule {}
