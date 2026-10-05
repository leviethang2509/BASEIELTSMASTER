import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ServicePlanSummary } from '@lang/shared';
import type { Repository } from 'typeorm';
import { toPlanSummary } from './plan.mapper';
import { ServicePlan } from './service-plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(ServicePlan)
    private readonly plans: Repository<ServicePlan>,
  ) {}

  /** Gói đang áp dụng, chọn được khi đăng ký tenant. */
  async listActive(): Promise<ServicePlanSummary[]> {
    const plans = await this.plans.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', maxMembers: 'ASC' },
    });
    return plans.map(toPlanSummary);
  }
}
