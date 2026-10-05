import { validateEnv } from './env.validation';

const base = {
  DB_HOST: '127.0.0.1',
  DB_USERNAME: 'postgres',
  DB_NAME: 'lang_simulator_dev',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('áp giá trị mặc định và ép kiểu số', () => {
    const env = validateEnv({ ...base, PORT: '4000' });
    expect(env.PORT).toBe(4000);
    expect(env.DB_PORT).toBe(5432);
    expect(env.DB_PASSWORD).toBe('');
    expect(env.DB_SCHEMA).toBe('public');
    expect(env.DB_LOGGING).toBe(false);
    expect(env.NODE_ENV).toBe('development');
  });

  it('thời hạn token và cookie có giá trị mặc định', () => {
    const env = validateEnv(base);
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(env.REFRESH_EXPIRES_IN).toBe('30d');
    expect(env.COOKIE_SECURE).toBe(false);
    expect(validateEnv({ ...base, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(
      true,
    );
  });

  it('thời hạn token sai định dạng thì dừng', () => {
    expect(() =>
      validateEnv({ ...base, JWT_ACCESS_EXPIRES_IN: '15 phút' }),
    ).toThrow(/JWT_ACCESS_EXPIRES_IN/);
  });

  it('đọc DB_LOGGING dạng chuỗi', () => {
    expect(validateEnv({ ...base, DB_LOGGING: 'true' }).DB_LOGGING).toBe(true);
  });

  it('thiếu JWT_SECRET thì dừng', () => {
    const { JWT_SECRET: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/JWT_SECRET/);
  });

  it('JWT_SECRET ngắn hơn 32 ký tự thì dừng', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('DB_SCHEMA có ký tự không an toàn thì dừng', () => {
    expect(() =>
      validateEnv({ ...base, DB_SCHEMA: 'lang; drop schema public' }),
    ).toThrow(/DB_SCHEMA/);
  });

  it('PORT không phải số thì dừng', () => {
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('biến R2 để trống coi như chưa đặt (API vẫn khởi động)', () => {
    // `.env.example` ship sẵn các dòng `R2_…=` rỗng, không được coi là lỗi.
    const env = validateEnv({
      ...base,
      R2_ACCOUNT_ID: '',
      R2_ACCESS_KEY_ID: '   ',
      R2_SECRET_ACCESS_KEY: '',
      R2_PUBLIC_BUCKET: '',
      R2_PUBLIC_BASE_URL: '',
      R2_PRIVATE_BUCKET: '',
    });
    expect(env.R2_ACCOUNT_ID).toBeUndefined();
    expect(env.R2_ACCESS_KEY_ID).toBeUndefined();
    expect(env.R2_PUBLIC_BASE_URL).toBeUndefined();
  });

  it('Gemini không bắt buộc: để trống dùng mặc định, sai backend thì dừng', () => {
    const env = validateEnv({
      ...base,
      GEMINI_BACKEND: '',
      GEMINI_MODEL: '',
      GEMINI_MAX_OUTPUT_TOKENS: '',
      GCP_PROJECT_ID: ' ',
      GOOGLE_APPLICATION_CREDENTIALS: '',
    });
    expect(env.GEMINI_BACKEND).toBeUndefined();
    expect(env.GEMINI_MODEL).toBe('gemini-3.6-flash');
    expect(env.GEMINI_MAX_OUTPUT_TOKENS).toBe(16384);
    expect(env.GEMINI_VERTEX_LOCATION).toBe('global');
    expect(env.GCP_PROJECT_ID).toBeUndefined();

    expect(
      validateEnv({ ...base, GEMINI_MAX_OUTPUT_TOKENS: '8192' })
        .GEMINI_MAX_OUTPUT_TOKENS,
    ).toBe(8192);
    expect(() => validateEnv({ ...base, GEMINI_BACKEND: 'openai' })).toThrow(
      /GEMINI_BACKEND/,
    );
  });

  it('R2 điền đủ thì giữ nguyên, URL sai định dạng thì dừng', () => {
    const env = validateEnv({
      ...base,
      R2_ACCOUNT_ID: 'acc',
      R2_PUBLIC_BASE_URL: 'https://pub-abc.r2.dev',
    });
    expect(env.R2_ACCOUNT_ID).toBe('acc');
    expect(env.R2_PUBLIC_BASE_URL).toBe('https://pub-abc.r2.dev');

    expect(() =>
      validateEnv({ ...base, R2_PUBLIC_BASE_URL: 'pub-abc.r2.dev' }),
    ).toThrow(/R2_PUBLIC_BASE_URL/);
  });
});
