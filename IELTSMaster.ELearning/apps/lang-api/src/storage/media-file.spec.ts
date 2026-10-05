import { MediaKind } from '@lang/shared';
import { BadRequestException } from '@nestjs/common';
import {
  assertWithinLimit,
  brandingPrefix,
  examMediaPrefix,
  extensionOf,
  mediaKindOf,
  objectKey,
} from './media-file';

describe('mediaKindOf', () => {
  it.each([
    ['image/png', MediaKind.IMAGE],
    ['IMAGE/PNG', MediaKind.IMAGE],
    ['audio/webm;codecs=opus', MediaKind.AUDIO],
    ['video/mp4', MediaKind.VIDEO],
    ['application/pdf', null],
    ['', null],
  ])('%s → %s', (mimetype, expected) => {
    expect(mediaKindOf(mimetype)).toBe(expected);
  });
});

describe('extensionOf', () => {
  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/svg+xml', 'svg'],
    ['audio/mpeg', 'mp3'],
    ['audio/x-m4a', 'm4a'],
    ['audio/webm;codecs=opus', 'webm'],
    ['video/quicktime', 'mov'],
    // Không suy được đuôi thì dùng `bin` chứ không để rỗng.
    ['video/', 'bin'],
    ['video', 'bin'],
    ['audio/+++', 'bin'],
  ])('%s → %s', (mimetype, expected) => {
    expect(extensionOf(mimetype)).toBe(expected);
  });
});

describe('assertWithinLimit', () => {
  it('quá giới hạn thì báo lỗi kèm tên loại và số MB', () => {
    expect(() =>
      assertWithinLimit(MediaKind.IMAGE, 5 * 1024 * 1024 + 1),
    ).toThrow(new BadRequestException('Ảnh vượt quá 5MB.'));
    expect(() => assertWithinLimit(MediaKind.AUDIO, 60 * 1024 * 1024)).toThrow(
      'Audio vượt quá 50MB.',
    );
    expect(() =>
      assertWithinLimit(MediaKind.VIDEO, 100 * 1024 * 1024),
    ).not.toThrow();
  });
});

describe('key trên R2', () => {
  it('nằm trong prefix của tenant / user và không dùng tên file gốc', () => {
    const key = objectKey(examMediaPrefix('tenant-1'), 'webp');
    expect(key).toMatch(/^tenants\/tenant-1\/exam-media\/[0-9a-f-]{36}\.webp$/);
    expect(objectKey(brandingPrefix('user-1'), 'webp')).toMatch(
      /^users\/user-1\/branding\/[0-9a-f-]{36}\.webp$/,
    );
    // Hai lần upload không đè lên nhau.
    expect(objectKey(examMediaPrefix('t'), 'mp3')).not.toBe(
      objectKey(examMediaPrefix('t'), 'mp3'),
    );
  });
});
