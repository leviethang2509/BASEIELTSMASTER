import { randomUUID } from 'node:crypto';
import { MEDIA_SIZE_LIMITS, MediaKind } from '@lang/shared';
import { BadRequestException } from '@nestjs/common';

// Kiểm tra file upload và đặt key trên R2. Tách khỏi service để test không cần
// dựng R2Service.

/** File nhận từ multer (`FileInterceptor`). */
export type UploadedFile = Express.Multer.File;

/**
 * Phần mở rộng suy từ mimetype — tên file người dùng gửi lên không đáng tin.
 * Chỉ liệt kê những mimetype mà phần sau dấu `/` khác đuôi quen thuộc.
 */
const EXTENSIONS: Record<string, string> = {
  jpeg: 'jpg',
  'svg+xml': 'svg',
  mpeg: 'mp3',
  'x-m4a': 'm4a',
  'mp4a-latm': 'm4a',
  'x-wav': 'wav',
  quicktime: 'mov',
  'x-matroska': 'mkv',
  'x-msvideo': 'avi',
};

const LABELS: Record<MediaKind, string> = {
  [MediaKind.IMAGE]: 'Ảnh',
  [MediaKind.AUDIO]: 'Audio',
  [MediaKind.VIDEO]: 'Video',
};

/** Giới hạn của multer: loại lớn nhất, sau đó kiểm theo từng loại. */
export const MAX_ANY_BYTES = Math.max(...Object.values(MEDIA_SIZE_LIMITS));

/** Media của đề: mỗi tenant một prefix riêng (dùng cả khi liệt kê và xoá). */
export const examMediaPrefix = (tenantId: string) =>
  `tenants/${tenantId}/exam-media/`;

/**
 * Logo trung tâm: đặt theo người upload vì lúc đăng ký tenant chưa tồn tại nên
 * chưa có `tenantId`.
 */
export const brandingPrefix = (userId: string) => `users/${userId}/branding/`;

/** Loại media theo mimetype; `null` là định dạng không nhận. */
export function mediaKindOf(mimetype: string): MediaKind | null {
  const type = mimetype.split(';')[0].trim().toLowerCase();
  if (type.startsWith('image/')) return MediaKind.IMAGE;
  if (type.startsWith('audio/')) return MediaKind.AUDIO;
  if (type.startsWith('video/')) return MediaKind.VIDEO;
  return null;
}

export function extensionOf(mimetype: string): string {
  const subtype = mimetype.split(';')[0].trim().toLowerCase().split('/')[1];
  if (!subtype) return 'bin';
  // Subtype lạ (`x-…`, ký tự đặc biệt) thì lọc còn chữ và số.
  return EXTENSIONS[subtype] ?? (subtype.replace(/[^a-z0-9]/g, '') || 'bin');
}

const megabytes = (bytes: number) => Math.round(bytes / 1024 / 1024);

export function assertWithinLimit(kind: MediaKind, size: number): void {
  const limit = MEDIA_SIZE_LIMITS[kind];
  if (size > limit) {
    throw new BadRequestException(
      `${LABELS[kind]} vượt quá ${megabytes(limit)}MB.`,
    );
  }
}

/** Key ngẫu nhiên trong prefix; không dùng tên file gốc (có thể trùng/lạ). */
export function objectKey(prefix: string, extension: string): string {
  return `${prefix}${randomUUID()}.${extension}`;
}
