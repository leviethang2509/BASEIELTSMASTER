import { MediaKind } from '@lang/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import sharp from 'sharp';
import type { UploadedFile } from './media-file';
import { MediaService } from './media.service';
import type { R2Service } from './r2.service';

function setup(configReason: string | null = null) {
  const put = jest.fn<Promise<void>, [string, string, Buffer, string]>(() =>
    Promise.resolve(),
  );
  const remove = jest.fn(() => Promise.resolve());
  const list = jest.fn(() => Promise.resolve([]));
  const r2 = {
    put,
    delete: remove,
    list,
    publicUrl: (key: string) => `https://cdn.test/${key}`,
    configReason: () => configReason,
  } as unknown as R2Service;
  return { service: new MediaService(r2), put, remove, list };
}

const file = (mimetype: string, buffer: Buffer, size = buffer.length) =>
  ({ mimetype, buffer, size }) as UploadedFile;

let png: Buffer;

beforeAll(async () => {
  png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: '#268bd2' },
  })
    .png()
    .toBuffer();
});

describe('upload media của đề', () => {
  it('ảnh: convert webp, key trong prefix của tenant', async () => {
    const { service, put } = setup();

    const item = await service.uploadExamMedia('t1', file('image/png', png));

    expect(put).toHaveBeenCalledTimes(1);
    const [scope, key, body, contentType] = put.mock.calls[0];
    expect(scope).toBe('public');
    expect(key).toMatch(/^tenants\/t1\/exam-media\/[0-9a-f-]{36}\.webp$/);
    expect(contentType).toBe('image/webp');
    // Đúng là file webp: "RIFF....WEBP".
    expect(body.subarray(0, 4).toString()).toBe('RIFF');
    expect(body.subarray(8, 12).toString()).toBe('WEBP');
    expect(item).toMatchObject({
      key,
      kind: MediaKind.IMAGE,
      size: body.length,
      url: `https://cdn.test/${key}`,
    });
  });

  it('audio/video: giữ nguyên file và mimetype gốc', async () => {
    const { service, put } = setup();
    const raw = Buffer.from('ID3 audio');

    const item = await service.uploadExamMedia('t1', file('audio/mpeg', raw));

    const [, key, body, contentType] = put.mock.calls[0];
    expect(key).toMatch(/\.mp3$/);
    expect(contentType).toBe('audio/mpeg');
    expect(body).toBe(raw);
    expect(item.kind).toBe(MediaKind.AUDIO);
  });

  it('từ chối định dạng lạ, file quá giới hạn và ảnh hỏng', async () => {
    const { service, put } = setup();

    await expect(
      service.uploadExamMedia('t1', file('application/pdf', Buffer.from('%'))),
    ).rejects.toThrow('Chỉ nhận file ảnh, audio hoặc video.');
    await expect(
      service.uploadExamMedia(
        't1',
        file('audio/mpeg', Buffer.from('x'), 60 * 1024 * 1024),
      ),
    ).rejects.toThrow('Audio vượt quá 50MB.');
    await expect(
      service.uploadExamMedia('t1', file('image/png', Buffer.from('không'))),
    ).rejects.toThrow(new BadRequestException('Không đọc được file ảnh.'));
    expect(put).not.toHaveBeenCalled();
  });
});

describe('thư viện media', () => {
  it('liệt kê: loại suy từ đuôi file, kèm URL công khai', async () => {
    const { service, list } = setup();
    list.mockResolvedValue([
      {
        key: 'tenants/t1/exam-media/a.mp3',
        size: 10,
        uploadedAt: '2026-09-16T00:00:00.000Z',
      },
      {
        key: 'tenants/t1/exam-media/b.webp',
        size: 20,
        uploadedAt: '2026-09-15T00:00:00.000Z',
      },
    ] as never);

    await expect(service.listExamMedia('t1')).resolves.toEqual([
      {
        key: 'tenants/t1/exam-media/a.mp3',
        url: 'https://cdn.test/tenants/t1/exam-media/a.mp3',
        kind: MediaKind.AUDIO,
        size: 10,
        uploadedAt: '2026-09-16T00:00:00.000Z',
      },
      {
        key: 'tenants/t1/exam-media/b.webp',
        url: 'https://cdn.test/tenants/t1/exam-media/b.webp',
        kind: MediaKind.IMAGE,
        size: 20,
        uploadedAt: '2026-09-15T00:00:00.000Z',
      },
    ]);
    expect(list).toHaveBeenCalledWith('public', 'tenants/t1/exam-media/');
  });

  it('chỉ xoá được file của tenant mình', async () => {
    const { service, remove } = setup();

    await expect(
      service.deleteExamMedia('t1', 'tenants/t2/exam-media/a.webp'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.deleteExamMedia('t1', 'users/u1/branding/a.webp'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();

    await service.deleteExamMedia('t1', 'tenants/t1/exam-media/a.webp');
    expect(remove).toHaveBeenCalledWith(
      'public',
      'tenants/t1/exam-media/a.webp',
    );
  });

  it('status phản ánh cấu hình R2', () => {
    expect(setup().service.status()).toEqual({
      configured: true,
      reason: null,
    });
    expect(
      setup('thiếu biến môi trường R2_ACCOUNT_ID').service.status(),
    ).toEqual({
      configured: false,
      reason: 'thiếu biến môi trường R2_ACCOUNT_ID',
    });
  });
});

describe('logo trung tâm', () => {
  it('chỉ nhận ảnh, key đặt theo user', async () => {
    const { service, put } = setup();

    await expect(
      service.uploadBrandingImage('u1', file('audio/mpeg', Buffer.from('x'))),
    ).rejects.toThrow('Logo phải là file ảnh.');

    const item = await service.uploadBrandingImage(
      'u1',
      file('image/png', png),
    );
    expect(item.key).toMatch(/^users\/u1\/branding\/[0-9a-f-]{36}\.webp$/);
    expect(put.mock.calls[0][3]).toBe('image/webp');
  });
});
