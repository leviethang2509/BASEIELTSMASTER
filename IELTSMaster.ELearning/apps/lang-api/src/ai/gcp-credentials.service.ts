import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation';

/** Credentials rút ra từ service account JSON, dạng `google-auth-library` nhận trực tiếp. */
export interface GcpCredentials {
  client_email: string;
  private_key: string;
}

interface ServiceAccountJson {
  client_email?: string;
  private_key?: string;
  project_id?: string;
}

/**
 * Credentials Google Cloud (chép từ LC). Ưu tiên `GCP_SERVICE_ACCOUNT_JSON_BASE64`
 * (decode trong bộ nhớ, hợp với Docker), sau đó file ở
 * `GOOGLE_APPLICATION_CREDENTIALS` – đọc luôn lúc khởi động (đường dẫn tương
 * đối tính từ thư mục chạy API) để lỗi cấu hình hiện ngay và không phụ thuộc
 * `process.env`. Thiếu hoặc sai thì `reason` khác `null`, API vẫn khởi động.
 */
@Injectable()
export class GcpCredentialsService {
  private readonly logger = new Logger(GcpCredentialsService.name);
  readonly credentials: GcpCredentials | null = null;
  readonly projectId?: string;
  /** Lý do chưa dùng được; `null` = đã cấu hình xong. */
  readonly reason: string | null;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    let projectId = config.get('GCP_PROJECT_ID', { infer: true })?.trim();
    const base64 = config.get('GCP_SERVICE_ACCOUNT_JSON_BASE64', {
      infer: true,
    });
    const path = config.get('GOOGLE_APPLICATION_CREDENTIALS', { infer: true });

    let problem: string | null = null;
    const source = base64
      ? { name: 'GCP_SERVICE_ACCOUNT_JSON_BASE64', read: () => decode(base64) }
      : path
        ? {
            name: 'GOOGLE_APPLICATION_CREDENTIALS',
            read: () => readFileSync(resolve(path), 'utf8'),
          }
        : null;

    if (source) {
      try {
        const parsed = JSON.parse(source.read()) as ServiceAccountJson;
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error('thiếu client_email hoặc private_key');
        }
        this.credentials = {
          client_email: parsed.client_email,
          // JSON đi qua biến môi trường hay bị escape '\n' thành '\\n'.
          private_key: parsed.private_key.replace(/\\n/g, '\n'),
        };
        projectId ||= parsed.project_id;
      } catch (err) {
        problem = `${source.name} không hợp lệ: ${(err as Error).message}`;
      }
    }

    this.projectId = projectId || undefined;
    this.reason =
      problem ??
      (!this.credentials
        ? 'thiếu GCP_SERVICE_ACCOUNT_JSON_BASE64 hoặc GOOGLE_APPLICATION_CREDENTIALS'
        : !this.projectId
          ? 'thiếu GCP_PROJECT_ID'
          : null);
    if (problem) this.logger.error(problem);
  }

  isConfigured(): boolean {
    return this.reason === null;
  }
}

function decode(base64: string): string {
  return Buffer.from(base64.trim(), 'base64').toString('utf8');
}
