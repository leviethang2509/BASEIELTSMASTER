import {
  MediaKind,
  mediaKindFromExtension,
  type MediaItem,
  type MediaStatus,
} from '@lang/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import sharp from 'sharp';
import {
  assertWithinLimit,
  brandingPrefix,
  examMediaPrefix,
  extensionOf,
  mediaKindOf,
  objectKey,
  type UploadedFile,
} from './media-file';
import { R2Service } from './r2.service';

/** Ảnh luôn convert sang webp (nhẹ hơn nhiều, giữ chất lượng đủ dùng). */
const WEBP_QUALITY = 82;

/**
 * Upload media cho trình soạn đề và logo trung tâm. Tất cả vào bucket public;
 * ghi âm của học viên (bucket private) làm ở Step 13.
 */
@Injectable()
export class MediaService {
  constructor(private readonly r2: R2Service) {}

  status(): MediaStatus {
    const reason = this.r2.configReason();
    return { configured: reason === null, reason };
  }

  /** Media nhúng vào đề của tenant (ảnh, audio, video). */
  async uploadExamMedia(
    tenantId: string,
    file: UploadedFile,
  ): Promise<MediaItem> {
    const kind = mediaKindOf(file.mimetype ?? '');
    if (!kind) {
      throw new BadRequestException('Chỉ nhận file ảnh, audio hoặc video.');
    }
    assertWithinLimit(kind, file.size);
    const prefix = examMediaPrefix(tenantId);
    return kind === MediaKind.IMAGE
      ? this.storeImage(prefix, file)
      : this.store(
          prefix,
          extensionOf(file.mimetype),
          file.buffer,
          file.mimetype,
        );
  }

  /** Thư viện media của tenant; đọc thẳng R2 nên không cần bảng riêng. */
  async listExamMedia(tenantId: string): Promise<MediaItem[]> {
    const objects = await this.r2.list('public', examMediaPrefix(tenantId));
    return objects.map((object) => ({
      key: object.key,
      url: this.r2.publicUrl(object.key),
      kind: mediaKindFromExtension(object.key),
      size: object.size,
      uploadedAt: object.uploadedAt,
    }));
  }

  /** Key do client gửi lên nên phải kiểm: chỉ xoá được file của tenant mình. */
  async deleteExamMedia(tenantId: string, key: string): Promise<void> {
    if (!key.startsWith(examMediaPrefix(tenantId))) {
      throw new ForbiddenException('File này không thuộc trung tâm của bạn');
    }
    await this.r2.delete('public', key);
  }

  /** Logo trung tâm: chỉ ảnh, đặt theo người upload (tenant có thể chưa tồn tại). */
  async uploadBrandingImage(
    userId: string,
    file: UploadedFile,
  ): Promise<MediaItem> {
    if (mediaKindOf(file.mimetype ?? '') !== MediaKind.IMAGE) {
      throw new BadRequestException('Logo phải là file ảnh.');
    }
    assertWithinLimit(MediaKind.IMAGE, file.size);
    return this.storeImage(brandingPrefix(userId), file);
  }

  private async storeImage(
    prefix: string,
    file: UploadedFile,
  ): Promise<MediaItem> {
    let webp: Buffer;
    try {
      webp = await sharp(file.buffer)
        .rotate() // tôn trọng orientation EXIF
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException('Không đọc được file ảnh.');
    }
    return this.store(prefix, 'webp', webp, 'image/webp');
  }

  private async store(
    prefix: string,
    extension: string,
    body: Buffer,
    contentType: string,
  ): Promise<MediaItem> {
    const key = objectKey(prefix, extension);
    await this.r2.put('public', key, body, contentType);
    return {
      key,
      url: this.r2.publicUrl(key),
      kind: mediaKindFromExtension(key),
      size: body.length,
      uploadedAt: new Date().toISOString(),
    };
  }
}
