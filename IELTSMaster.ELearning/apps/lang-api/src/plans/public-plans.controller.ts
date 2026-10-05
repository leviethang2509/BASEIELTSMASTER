import { Controller, Get } from '@nestjs/common';
import type { ServicePlanSummary } from '@lang/shared';
import { Public } from '../auth/decorators';
import { PlansService } from './plans.service';

@Public()
@Controller('public/plans')
export class PublicPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(): Promise<ServicePlanSummary[]> {
    return this.plans.listActive();
  }
}
