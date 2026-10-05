import { collectDataUrls, replaceDataUrls } from '@lang/exam-core';
import { uploadMedia } from './media-api';

// Media nhúng dạng `data:` URI — thường lọt vào khi dán HTML có ảnh. Server từ
// chối lưu nội dung còn base64 (`validateSectionShape`), nên trước khi lưu phải
// đẩy lên R2 rồi thay URL. Phần thay URL ngay trong editor Plate làm ở Step 12.

export { collectDataUrls, replaceDataUrls };

const EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/** Upload lần lượt từng data URI; trả về bảng `data URI → URL trên R2`. */
export async function uploadDataUrls(
  slug: string,
  urls: readonly string[],
): Promise<Map<string, string>> {
  const uploaded = new Map<string, string>();
  // Tuần tự chứ không song song: mỗi file có thể vài MB.
  for (const [index, url] of urls.entries()) {
    const blob = await (await fetch(url)).blob();
    const extension = EXTENSION[blob.type] ?? blob.type.split('/')[1] ?? 'bin';
    const file = new File([blob], `embedded-${index + 1}.${extension}`, {
      type: blob.type,
    });
    const media = await uploadMedia(slug, file);
    uploaded.set(url, media.url);
  }
  return uploaded;
}
