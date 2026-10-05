import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { BrandingController } from './branding.controller';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { R2Service } from './r2.service';

/**
 * Lưu trữ file trên Cloudflare R2. Export service để module khác dùng lại
 * (ghi âm Speaking ở Step 13) thay vì khai báo provider lần nữa.
 */
@Module({
  imports: [TenantsModule],
  controllers: [MediaController, BrandingController],
  providers: [R2Service, MediaService],
  exports: [R2Service, MediaService],
})
export class StorageModule {}
