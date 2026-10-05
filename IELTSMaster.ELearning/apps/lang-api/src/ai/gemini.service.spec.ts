import { Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';
import { GcpCredentialsService } from './gcp-credentials.service';
import { GeminiService, toGeminiError } from './gemini.service';

const BASE = {
  DB_HOST: 'localhost',
  DB_USERNAME: 'u',
  DB_NAME: 'd',
  JWT_SECRET: 'x'.repeat(32),
};

function gemini(env: Record<string, string>) {
  const config = new ConfigService(validateEnv({ ...BASE, ...env }));
  return new GeminiService(
    config as never,
    new GcpCredentialsService(config as never),
  );
}

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});

const serviceAccount = (data: object) =>
  Buffer.from(JSON.stringify(data)).toString('base64');

describe('GeminiService – cấu hình', () => {
  it('thiếu mọi biến: chưa cấu hình, route AI 501', async () => {
    const service = gemini({});
    expect(service.isConfigured()).toBe(false);
    expect(() => service.assertConfigured()).toThrow(NotImplementedException);
    await expect(
      service.generate({ systemInstruction: '', turns: [] }),
    ).rejects.toThrow(NotImplementedException);
  });

  it('vertex: cần service account + project (lấy từ JSON nếu thiếu biến)', () => {
    const key = serviceAccount({
      client_email: 'sa@p.iam.gserviceaccount.com',
      private_key: 'KEY',
      project_id: 'p',
    });
    const ok = gemini({ GCP_SERVICE_ACCOUNT_JSON_BASE64: key });
    expect(ok.backend).toBe('vertex');
    expect(ok.isConfigured()).toBe(true);

    const broken = gemini({
      GEMINI_BACKEND: 'vertex',
      GCP_SERVICE_ACCOUNT_JSON_BASE64: serviceAccount({ project_id: 'p' }),
    });
    expect(broken.reason).toMatch(/client_email/);

    const missingFile = gemini({
      GEMINI_BACKEND: 'vertex',
      GCP_PROJECT_ID: 'p',
      GOOGLE_APPLICATION_CREDENTIALS: '/khong/co/file.json',
    });
    expect(missingFile.isConfigured()).toBe(false);
  });

  it('aistudio: chỉ cần API key; bỏ trống backend thì tự chọn', () => {
    expect(gemini({ GEMINI_API_KEY: 'k' }).backend).toBe('aistudio');
    expect(gemini({ GEMINI_API_KEY: 'k' }).isConfigured()).toBe(true);
    expect(gemini({ GEMINI_BACKEND: 'aistudio' }).isConfigured()).toBe(false);
  });
});

describe('toGeminiError', () => {
  const statusError = (status: number, message = '') =>
    Object.assign(new Error(message), { status });

  it('đổi lỗi Google thành message tiếng Việt, không lộ chi tiết', () => {
    expect(toGeminiError(statusError(429)).message).toMatch(/quá tải/);
    expect(
      toGeminiError(statusError(403, 'PERMISSION_DENIED')).message,
    ).toMatch(/thiếu quyền/);
    expect(
      toGeminiError(statusError(403, 'SERVICE_DISABLED project 123')).message,
    ).toMatch(/chưa được bật/);
    expect(toGeminiError(statusError(401)).message).toMatch(/xác thực/);
    expect(toGeminiError(statusError(503)).message).toMatch(/sự cố/);
    const unknown = toGeminiError(new Error('secret detail'));
    expect(unknown.message).toBe('Không gọi được dịch vụ AI');
    expect(unknown.status).toBeNull();
  });
});
