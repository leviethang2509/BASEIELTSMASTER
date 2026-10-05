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
} from '@nestjs/common';
import {
  PermissionKey,
  SYSTEM_MANAGER_ROLES,
  type AdminServicePlan,
} from '@lang/shared';
import { Permissions, SystemRoles } from '../../auth/decorators';
import { ParseIdPipe } from '../../common/pipes';
import { AdminPlansService } from './admin-plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/admin-plan.dto';

@Controller('admin/plans')
@Permissions(PermissionKey.SYSTEM_TENANTS_MANAGE)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminPlansController {
  constructor(private readonly plans: AdminPlansService) {}

  @Get()
  list(): Promise<AdminServicePlan[]> {
    return this.plans.list();
  }

  @Post()
  create(@Body() dto: CreatePlanDto): Promise<AdminServicePlan> {
    return this.plans.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<AdminServicePlan> {
    return this.plans.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe()) id: string): Promise<void> {
    return this.plans.remove(id);
  }
}
