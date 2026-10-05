import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  type MediaItem,
  type MediaStatus,
} from '@lang/shared';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from '../auth/decorators';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { DeleteMediaQueryDto } from './dto/media.dto';
import { MAX_ANY_BYTES, type UploadedFile as MulterFile } from './media-file';
import { MediaService } from './media.service';

/** Thư viện media của tenant, dùng cho trình soạn đề (Step 12). */
@Controller('t/:slug/media')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...EXAM_AUTHOR_ROLES)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Giao diện gọi lúc mở trang để biết nên hiện nút upload hay chỉ cho dán URL. */
  @Get('status')
  status(): MediaStatus {
    return this.media.status();
  }

  @Get()
  list(@TenantCtx() ctx: TenantContext): Promise<MediaItem[]> {
    return this.media.listExamMedia(ctx.tenantId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ANY_BYTES } }),
  )
  upload(
    @TenantCtx() ctx: TenantContext,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<MediaItem> {
    if (!file) throw new BadRequestException('Thiếu file.');
    return this.media.uploadExamMedia(ctx.tenantId, file);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Query() query: DeleteMediaQueryDto,
  ): Promise<void> {
    return this.media.deleteExamMedia(ctx.tenantId, query.key);
  }
}
