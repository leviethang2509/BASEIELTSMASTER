import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsModule } from '../tenants/tenants.module';
import { MeContextsController } from './me-contexts.controller';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { StudentGuardian } from './student-guardian.entity';

@Module({
  imports: [TenantsModule, TypeOrmModule.forFeature([StudentGuardian])],
  controllers: [MembershipsController, MeContextsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
