import type { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation';
import { R2Service } from './r2.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://signed.test/x')),
}));

// Command đã gửi qua client giả; dùng biến module vì field của lớp con khởi tạo
// sau constructor của lớp cha (nơi client được tạo).
let sent: { constructor: { name: string }; input: Record<string, unknown> }[] =
  [];
let result: unknown = {};
let clientOptions: S3ClientConfig | null = null;

class TestR2Service extends R2Service {
  protected createClient(options: S3ClientConfig): S3Client {
    clientOptions = options;
    return {
      send: (command: unknown) => {
        sent.push(
          command as {
            constructor: { name: string };
            input: Record<string, unknown>;
          },
        );
        return Promise.resolve(result);
      },
    } as unknown as S3Client;
  }
}

const FULL_ENV = {
  R2_ACCOUNT_ID: 'acc-1',
  R2_ACCESS_KEY_ID: 'key-1',
  R2_SECRET_ACCESS_KEY: 'secret-1',
  R2_PUBLIC_BUCKET: 'lang-simulator-public',
  // Dấu `/` thừa ở cuối phải bị bỏ khi ghép URL.
  R2_PUBLIC_BASE_URL: 'https://cdn.test/',
  R2_PRIVATE_BUCKET: 'lang-simulator-private',
};

const configOf = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService<
    EnvironmentVariables,
    true
  >;

const service = (values: Record<string, string> = FULL_ENV) =>
  new TestR2Service(configOf(values));

beforeEach(() => {
  sent = [];
  result = {};
  clientOptions = null;
  jest.mocked(getSignedUrl).mockClear();
  // Bỏ cảnh báo "R2 chưa cấu hình" khỏi output test.
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('chưa cấu hình R2', () => {
  it('nêu đúng biến còn thiếu và mọi thao tác trả 501', async () => {
    const r2 = service({
      R2_ACCOUNT_ID: 'acc-1',
      R2_ACCESS_KEY_ID: ' ',
      R2_PUBLIC_BUCKET: 'pub',
      R2_PUBLIC_BASE_URL: 'https://cdn.test',
    });

    expect(r2.isConfigured()).toBe(false);
    expect(r2.configReason()).toBe(
      'thiếu biến môi trường R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET',
    );

    const error = await r2
      .put('public', 'a.webp', Buffer.from('x'), 'image/webp')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(501);
    await expect(r2.presignedGetUrl('a.webm')).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});

describe('đã cấu hình R2', () => {
  it('endpoint theo account và URL công khai bỏ dấu / thừa', () => {
    const r2 = service();

    expect(r2.isConfigured()).toBe(true);
    expect(r2.configReason()).toBeNull();
    expect(clientOptions?.endpoint).toBe(
      'https://acc-1.r2.cloudflarestorage.com',
    );
    expect(r2.publicUrl('tenants/t1/exam-media/a.webp')).toBe(
      'https://cdn.test/tenants/t1/exam-media/a.webp',
    );
  });

  it('put / delete dùng đúng bucket theo scope', async () => {
    const r2 = service();

    await r2.put('public', 'a.webp', Buffer.from('x'), 'image/webp');
    await r2.delete('private', 'r.webm');

    expect(sent[0].constructor.name).toBe('PutObjectCommand');
    expect(sent[0].input).toMatchObject({
      Bucket: 'lang-simulator-public',
      Key: 'a.webp',
      ContentType: 'image/webp',
    });
    expect(sent[1].constructor.name).toBe('DeleteObjectCommand');
    expect(sent[1].input).toMatchObject({
      Bucket: 'lang-simulator-private',
      Key: 'r.webm',
    });
  });

  it('list: bỏ key rỗng, mới nhất trước', async () => {
    const r2 = service();
    result = {
      Contents: [
        { Key: 'p/cu.webp', Size: 1, LastModified: new Date('2026-09-01') },
        { Size: 2, LastModified: new Date('2026-09-10') },
        { Key: 'p/moi.mp3', Size: 3, LastModified: new Date('2026-09-15') },
      ],
    };

    await expect(r2.list('public', 'p/')).resolves.toEqual([
      { key: 'p/moi.mp3', size: 3, uploadedAt: '2026-09-15T00:00:00.000Z' },
      { key: 'p/cu.webp', size: 1, uploadedAt: '2026-09-01T00:00:00.000Z' },
    ]);
    expect(sent[0].input).toMatchObject({
      Bucket: 'lang-simulator-public',
      Prefix: 'p/',
    });
  });

  it('presigned URL lấy từ bucket private, hạn 600 giây', async () => {
    const r2 = service();

    await expect(r2.presignedGetUrl('r.webm')).resolves.toBe(
      'https://signed.test/x',
    );
    expect(jest.mocked(getSignedUrl)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: { Bucket: 'lang-simulator-private', Key: 'r.webm' },
      }),
      { expiresIn: 600 },
    );
  });
});
