import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// `@google/genai` là ESM: chỉ import kiểu, nạp module lúc gọi lần đầu (Nest build CJS).
import type {
  Content,
  GoogleGenAI,
  Schema,
  ThinkingLevel,
} from '@google/genai' with { 'resolution-mode': 'import' };
import type {
  EnvironmentVariables,
  GeminiBackend,
} from '../config/env.validation';
import { GcpCredentialsService } from './gcp-credentials.service';

export const AI_NOT_CONFIGURED = 'Máy chủ chưa cấu hình AI (Gemini)';

/** Một lượt hội thoại: `user` = prompt, `model` = câu trả lời trước của AI. */
export interface GeminiTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiRequest {
  systemInstruction: string;
  turns: readonly GeminiTurn[];
  /** Có thì AI trả JSON đúng schema (`responseMimeType: application/json`). */
  responseSchema?: Schema;
  abortSignal?: AbortSignal;
}

export interface GeminiResult {
  text: string;
  model: string;
  /** `MAX_TOKENS` = câu trả lời bị cắt. */
  finishReason: string | null;
  usage: { promptTokens: number; outputTokens: number };
}

/** Lỗi gọi Gemini, `message` tiếng Việt cho người dùng (không có chi tiết của Google). */
export class GeminiError extends Error {
  constructor(
    message: string,
    /** Mã HTTP của Google (nếu có) – chỉ để ghi nhật ký. */
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Gọi Gemini (chép `GeminiService` của LC, bỏ ghi chi phí GCP): `vertex` qua
 * service account, `aistudio` qua API key. Thiếu cấu hình thì `assertConfigured`
 * ném 501, API vẫn khởi động.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private client: Promise<GoogleGenAI> | null = null;
  readonly backend: GeminiBackend | null;
  readonly model: string;
  private readonly maxOutputTokens: number;
  private readonly apiKey?: string;
  private readonly vertexLocation: string;
  /** Lý do chưa dùng được; `null` = đã cấu hình. */
  readonly reason: string | null;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly gcp: GcpCredentialsService,
  ) {
    this.apiKey = config.get('GEMINI_API_KEY', { infer: true })?.trim();
    this.model = config.get('GEMINI_MODEL', { infer: true });
    this.maxOutputTokens = config.get('GEMINI_MAX_OUTPUT_TOKENS', {
      infer: true,
    });
    this.vertexLocation = config.get('GEMINI_VERTEX_LOCATION', { infer: true });
    // Bỏ trống thì tự chọn: ưu tiên Vertex (credentials GCP), rồi tới API key.
    this.backend =
      config.get('GEMINI_BACKEND', { infer: true }) ??
      (gcp.isConfigured() ? 'vertex' : this.apiKey ? 'aistudio' : null);
    this.reason = !this.backend
      ? 'thiếu GEMINI_API_KEY hoặc credentials GCP'
      : this.backend === 'vertex'
        ? gcp.reason
        : this.apiKey
          ? null
          : 'thiếu GEMINI_API_KEY';
    if (this.reason) {
      this.logger.warn(`Gemini chưa dùng được – ${this.reason}`);
    }
  }

  isConfigured(): boolean {
    return this.reason === null;
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new NotImplementedException(AI_NOT_CONFIGURED);
    }
  }

  private getClient(): Promise<GoogleGenAI> {
    this.assertConfigured();
    this.client ??= this.createClient();
    return this.client;
  }

  private async createClient(): Promise<GoogleGenAI> {
    const { GoogleGenAI } = await import('@google/genai');
    return this.backend === 'vertex'
      ? new GoogleGenAI({
          vertexai: true,
          project: this.gcp.projectId,
          location: this.vertexLocation,
          googleAuthOptions: {
            credentials: this.gcp.credentials ?? undefined,
          },
        })
      : new GoogleGenAI({ apiKey: this.apiKey });
  }

  /** Gọi một lần; huỷ qua `abortSignal` thì ném lại đúng lý do huỷ. */
  async generate(request: GeminiRequest): Promise<GeminiResult> {
    const client = await this.getClient();
    try {
      const response = await client.models.generateContent({
        model: this.model,
        contents: request.turns.map((turn): Content => ({
          role: turn.role,
          parts: [{ text: turn.text }],
        })),
        config: {
          systemInstruction: request.systemInstruction,
          maxOutputTokens: this.maxOutputTokens,
          temperature: 0,
          // Thao tác là việc đối chiếu chữ, không cần suy luận dài (plan 1.2).
          thinkingConfig: { thinkingLevel: 'LOW' as ThinkingLevel },
          ...(request.responseSchema
            ? {
                responseMimeType: 'application/json',
                responseSchema: request.responseSchema,
              }
            : {}),
          abortSignal: request.abortSignal,
        },
      });
      const usage = response.usageMetadata;
      return {
        text: response.text ?? '',
        model: this.model,
        finishReason: response.candidates?.[0]?.finishReason ?? null,
        usage: {
          promptTokens: usage?.promptTokenCount ?? 0,
          // Token suy nghĩ cũng tính tiền như token trả về.
          outputTokens:
            (usage?.candidatesTokenCount ?? 0) +
            (usage?.thoughtsTokenCount ?? 0),
        },
      };
    } catch (err) {
      if (request.abortSignal?.aborted) throw request.abortSignal.reason;
      const error = toGeminiError(err);
      this.logger.warn(
        `Gemini lỗi (${error.status ?? '-'}): ${(err as Error)?.message ?? err}`,
      );
      throw error;
    }
  }
}

/** Lỗi của Google → message tiếng Việt (giữ cách phân loại của LC). */
export function toGeminiError(err: unknown): GeminiError {
  if (err instanceof GeminiError) return err;
  // `ApiError` của SDK có `status` (mã HTTP).
  const raw = (err as { status?: unknown })?.status;
  const status = typeof raw === 'number' ? raw : null;
  const message = (err as Error)?.message ?? '';
  if (/SERVICE_DISABLED|has not been used in project/i.test(message)) {
    return new GeminiError(
      'Dịch vụ AI chưa được bật trên Google Cloud, vui lòng báo quản trị hệ thống',
      status,
    );
  }
  if (
    status === 401 ||
    /API key|API_KEY_INVALID|UNAUTHENTICATED/i.test(message)
  ) {
    return new GeminiError(
      'Thông tin xác thực AI không hợp lệ, vui lòng báo quản trị hệ thống',
      status,
    );
  }
  if (status === 403 || /PERMISSION_DENIED/i.test(message)) {
    return new GeminiError(
      'Tài khoản AI thiếu quyền, vui lòng báo quản trị hệ thống',
      status,
    );
  }
  if (status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(message)) {
    return new GeminiError(
      'Dịch vụ AI đang quá tải, vui lòng thử lại sau ít phút',
      status,
    );
  }
  if (status !== null && status >= 500) {
    return new GeminiError(
      'Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau',
      status,
    );
  }
  return new GeminiError('Không gọi được dịch vụ AI', status);
}
