import type { MediaItem, MediaStatus } from '@lang/shared';
import { api } from './api';

// Media của đề nằm trong phạm vi tenant; logo trung tâm đặt theo user vì lúc
// đăng ký tenant chưa tồn tại.

const mediaPath = (slug: string) => `/t/${slug}/media`;

export function getMediaStatus(slug: string): Promise<MediaStatus> {
  return api.get<MediaStatus>(`${mediaPath(slug)}/status`);
}

export function listMedia(slug: string): Promise<MediaItem[]> {
  return api.get<MediaItem[]>(mediaPath(slug));
}

export function uploadMedia(slug: string, file: File): Promise<MediaItem> {
  return api.upload<MediaItem>(`${mediaPath(slug)}/upload`, file);
}

export function deleteMedia(slug: string, key: string): Promise<void> {
  return api.delete<void>(`${mediaPath(slug)}?key=${encodeURIComponent(key)}`);
}

/** Logo trung tâm (chỉ ảnh, tối đa 5MB). */
export function uploadBrandingImage(file: File): Promise<MediaItem> {
  return api.upload<MediaItem>('/me/branding/upload', file);
}
