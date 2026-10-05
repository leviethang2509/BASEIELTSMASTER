import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation';

/**
 * Cloudflare R2 (S3-compatible). Hai bucket: `public` cho media của đề (có URL
 * công khai) và `private` cho ghi âm của học viên (chỉ đọc qua presigned URL).
 * Thiếu bất kỳ biến `R2_*` nào thì service coi như chưa cấu hình và mọi thao
 * tác trả 501 — API vẫn khởi động được để phần còn lại chạy bình thường.
 */

/** Bucket cần dùng: `public` có URL công khai, `private` chỉ presigned URL. */
export type R2Scope = 'public' | 'private';

/** Một object trên R2 (kết quả liệt kê theo prefix). */
export interface R2Object {
  key: string;
  size: number;
  uploadedAt: string;
}

const ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BUCKET',
  'R2_PUBLIC_BASE_URL',
  'R2_PRIVATE_BUCKET',
] as const;

/** Thời hạn link tải file bucket private (giây). */
export const PRESIGNED_URL_TTL_SECONDS = 600;

/** R2 trả tối đa 1000 key mỗi lần; thư viện media không phân trang. */
const LIST_MAX_KEYS = 1000;

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null = null;
  private readonly buckets: Record<R2Scope, string>;
  private readonly publicBase: string;
  private readonly missing: string[];

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const values = ENV_KEYS.map((key) => config.get<string>(key)?.trim() ?? '');
    this.missing = ENV_KEYS.filter((_, i) => values[i] === '');
    const [accountId, accessKeyId, secretAccessKey, pub, baseUrl, priv] =
      values;

    this.buckets = { public: pub, private: priv };
    // Bỏ dấu `/` cuối để ghép key không sinh `//`.
    this.publicBase = baseUrl.replace(/\/+$/, '');

    if (this.missing.length > 0) {
      this.logger.warn(
        `R2 chưa cấu hình (thiếu ${this.missing.join(', ')}) — upload media sẽ trả 501.`,
      );
      return;
    }
    this.client = this.createClient({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /** Tách riêng để test thay bằng client giả. */
  protected createClient(options: S3ClientConfig): S3Client {
    return new S3Client(options);
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /** Lý do R2 chưa dùng được; `null` nghĩa là đã cấu hình xong. */
  configReason(): string | null {
    return this.missing.length === 0
      ? null
      : `thiếu biến môi trường ${this.missing.join(', ')}`;
  }

  /** URL công khai của object trên bucket public. */
  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async put(
    scope: R2Scope,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.requireClient().send(
      new PutObjectCommand({
        Bucket: this.bucket(scope),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** Xoá object; R2 không báo lỗi khi key không tồn tại. */
  async delete(scope: R2Scope, key: string): Promise<void> {
    await this.requireClient().send(
      new DeleteObjectCommand({ Bucket: this.bucket(scope), Key: key }),
    );
  }

  /** Object theo prefix, mới nhất trước. */
  async list(scope: R2Scope, prefix: string): Promise<R2Object[]> {
    const result = await this.requireClient().send(
      new ListObjectsV2Command({
        Bucket: this.bucket(scope),
        Prefix: prefix,
        MaxKeys: LIST_MAX_KEYS,
      }),
    );
    return (result.Contents ?? [])
      .filter((item) => !!item.Key)
      .map((item) => ({
        key: item.Key as string,
        size: item.Size ?? 0,
        uploadedAt: (item.LastModified ?? new Date()).toISOString(),
      }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  /** Link tải tạm thời cho bucket private (ghi âm của học viên). */
  async presignedGetUrl(
    key: string,
    expiresIn = PRESIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    // `async` để lỗi "chưa cấu hình" cũng trả về promise bị reject như các hàm khác.
    const client = this.requireClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucket('private'), Key: key }),
      { expiresIn },
    );
  }

  private bucket(scope: R2Scope): string {
    return this.buckets[scope];
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new HttpException(
        `Chưa cấu hình Cloudflare R2 (${this.configReason()}).`,
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    return this.client;
  }
}
