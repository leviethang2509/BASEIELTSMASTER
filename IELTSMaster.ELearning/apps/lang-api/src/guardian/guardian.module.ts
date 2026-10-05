import { Module } from '@nestjs/common';
import { ClassroomsModule } from '../classrooms/classrooms.module';
import { TenantsModule } from '../tenants/tenants.module';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';

/** Khu vực "Con của tôi" của phụ huynh (req-3 Step 13, R19). */
@Module({
  imports: [TenantsModule, ClassroomsModule],
  controllers: [GuardianController],
  providers: [GuardianService],
})
export class GuardianModule {}
