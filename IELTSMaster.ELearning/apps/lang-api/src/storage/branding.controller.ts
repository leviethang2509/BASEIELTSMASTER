import { MEDIA_SIZE_LIMITS, MediaKind, type MediaItem } from '@lang/shared';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import type { UploadedFile as MulterFile } from './media-file';
import { MediaService } from './media.service';

/**
 * Ảnh nhận diện (hiện chỉ logo trung tâm). Mọi user đăng nhập đều gọi được vì
 * logo chọn ngay trong form đăng ký, khi tenant chưa tồn tại; key đặt theo user.
 */
@Controller('me/branding')
export class BrandingController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_SIZE_LIMITS[MediaKind.IMAGE] },
    }),
  )
  upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<MediaItem> {
    if (!file) throw new BadRequestException('Thiếu file.');
    return this.media.uploadBrandingImage(user.id, file);
  }
}
