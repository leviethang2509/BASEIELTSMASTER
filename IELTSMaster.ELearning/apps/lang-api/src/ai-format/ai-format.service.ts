import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AI_FORMAT_MAX_ATTEMPTS,
  aiInputProblem,
  formatAiBlocks,
  isExamValue,
  pickBestAttempt,
  toAiBlocks,
  validateSection,
  type ExamElement,
  type Issue,
} from '@lang/exam-core';
import {
  AiFormatRunStatus,
  TenantStatus,
  type AiFormatIssue,
  type AiFormatJob,
  type AiFormatResult,
  type AiFormatStarted,
  type AiStatus,
} from '@lang/shared';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import {
  GeminiError,
  GeminiService,
  type GeminiTurn,
} from '../ai/gemini.service';
import { ExamBlueprint } from '../catalog/exam-blueprint.entity';
import { ExamModule } from '../catalog/exam-module.entity';
import type { Exam } from '../exams/exam.entity';
import { assertCanEditExam, findExam } from '../exams/exams.service';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import {
  evaluateAiAttempt,
  shouldRetryAiAttempt,
  type AiFormatAttempt,
} from './ai-format-attempt';
import {
  AI_FORMAT_RESPONSE_SCHEMA,
  AI_FORMAT_SYSTEM_PROMPT,
  buildAiFormatPrompt,
  buildAiRetryPrompt,
} from './ai-format-prompt';
import { AiFormatRun } from './ai-format-run.entity';
import { countAiUsage } from './ai-usage';
import type { AiFormatDto } from './dto/ai-format.dto';

const TENANT_NOT_FOUND = 'Không tìm thấy trung tâm';
const AI_DISABLED = 'Trung tâm chưa được bật Trợ lý AI';
const TENANT_INACTIVE = 'Trung tâm không ở trạng thái hoạt động';
const QUOTA_EXCEEDED = (limit: number) =>
  `Trung tâm đã dùng hết ${limit} lượt AI của tháng này`;
const INVALID_CONTENT = 'Nội dung section không đúng định dạng';
const JOB_NOT_FOUND =
  'Không tìm thấy phiên định dạng (đã hết hạn hoặc bị gián đoạn), vui lòng thử lại';
const JOB_TIMEOUT = 'Định dạng bằng AI quá lâu, vui lòng thử lại';
const CALL_TIMEOUT = 'AI phản hồi quá lâu, vui lòng thử lại';
const UNEXPECTED = 'Định dạng bằng AI gặp lỗi, vui lòng thử lại';
const SERVER_RESTARTED = 'Máy chủ khởi động lại khi đang định dạng';

/** Giả định 8: mỗi lần gọi AI tối đa 120 giây, cả job tối đa 6 phút. */
export const AI_CALL_TIMEOUT_MS = 120_000;
export const AI_JOB_TIMEOUT_MS = 6 * 60_000;
/** Giả định 1: job giữ trong bộ nhớ, xoá sau 15 phút kể từ khi xong. */
export const AI_JOB_TTL_MS = 15 * 60_000;
const ERROR_MAX_LENGTH = 500;

/** Lý do huỷ job (gửi vào `AbortController.abort`). */
const CANCELLED = Symbol('cancelled');
const TIMED_OUT = Symbol('timed-out');

interface AiFormatJobState {
  id: string;
  tenantId: string;
  userId: string;
  examId: string;
  status: AiFormatRunStatus;
  attempt: number;
  result: AiFormatResult | null;
  error: string | null;
  controller: AbortController;
  /** Xong khi job dừng hẳn (đã ghi `ai_format_runs`). */
  done: Promise<void>;
}

interface JobInput {
  value: ExamElement[];
  prompt: string;
}

const toIssue = (issue: Issue): AiFormatIssue => ({
  indicatorId: issue.indicatorId,
  message: issue.message,
  severity: issue.severity,
  category: issue.category,
});

/**
 * "Định dạng bằng AI" một section (req-5 plan 4.3): kiểm quyền + hạn mức, chạy
 * job nền gọi Gemini tối đa `AI_FORMAT_MAX_ATTEMPTS` lần (mỗi lần áp thao tác
 * lên nội dung gốc rồi kiểm), ghi nhật ký `ai_format_runs`. Job chỉ người tạo
 * xem/huỷ được; API chỉ chạy 1 process nên job giữ trong `Map`.
 */
@Injectable()
export class AiFormatService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AiFormatService.name);
  private readonly jobs = new Map<string, AiFormatJobState>();
  private readonly timers = new Set<NodeJS.Timeout>();
  /** Tạo id node trong kết quả – test thay để kết quả ổn định. */
  createNodeId?: () => string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly gemini: GeminiService,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AiFormatRun)
    private readonly runs: Repository<AiFormatRun>,
  ) {}

  /** Job đang chạy lúc API dừng đã mất (giả định 1): chốt thành lỗi, không tính lượt. */
  async onApplicationBootstrap(): Promise<void> {
    await this.runs.update(
      { status: AiFormatRunStatus.RUNNING },
      {
        status: AiFormatRunStatus.FAILED,
        counted: false,
        error: SERVER_RESTARTED,
        finishedAt: new Date(),
      },
    );
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer);
    for (const job of this.jobs.values()) job.controller.abort(CANCELLED);
  }

  async status(ctx: TenantContext): Promise<AiStatus> {
    const tenant = await this.tenants.findOneBy({ id: ctx.tenantId });
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    return {
      enabled: tenant.aiEnabled,
      configured: this.gemini.isConfigured(),
      used: tenant.aiEnabled ? await countAiUsage(this.runs, tenant.id) : 0,
      limit: tenant.aiMonthlyQuota,
    };
  }

  /**
   * Kiểm (thứ tự lỗi: đề 404 → quyền sửa 403 → tenant 403 → cấu hình 501 →
   * nội dung 400 → hạn mức 429) rồi tạo lượt `running` trong transaction khoá
   * dòng tenant (chặn bấm song song vượt hạn mức), sau đó chạy job nền.
   */
  async start(
    ctx: TenantContext,
    actorId: string,
    examId: string,
    dto: AiFormatDto,
  ): Promise<AiFormatStarted> {
    const { run, input } = await this.dataSource.transaction(
      async (manager) => {
        const tenant = await manager.getRepository(Tenant).findOne({
          where: { id: ctx.tenantId },
          lock: { mode: 'pessimistic_write' },
        });
        const exam = await findExam(manager, ctx.tenantId, examId);
        assertCanEditExam(ctx, actorId, exam);
        if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
          throw new ForbiddenException(TENANT_INACTIVE);
        }
        if (!tenant.aiEnabled) throw new ForbiddenException(AI_DISABLED);
        this.gemini.assertConfigured();

        if (!isExamValue(dto.value)) {
          throw new BadRequestException(INVALID_CONTENT);
        }
        const problem = aiInputProblem(dto.value);
        if (problem) throw new BadRequestException(problem);

        const runs = manager.getRepository(AiFormatRun);
        const limit = tenant.aiMonthlyQuota;
        if (limit !== null && (await countAiUsage(runs, tenant.id)) >= limit) {
          throw new HttpException(
            QUOTA_EXCEEDED(limit),
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const run = await runs.save(
          runs.create({
            tenantId: tenant.id,
            userId: actorId,
            examId: exam.id,
            sectionId: dto.sectionId ?? null,
            status: AiFormatRunStatus.RUNNING,
          }),
        );
        const prompt = await this.firstPrompt(manager, exam, dto, dto.value);
        return { run, input: { value: dto.value, prompt } };
      },
    );

    const job: AiFormatJobState = {
      id: run.id,
      tenantId: ctx.tenantId,
      userId: actorId,
      examId,
      status: AiFormatRunStatus.RUNNING,
      attempt: 1,
      result: null,
      error: null,
      controller: new AbortController(),
      done: Promise.resolve(),
    };
    this.jobs.set(job.id, job);
    job.done = this.runJob(job, input);
    return { jobId: job.id };
  }

  find(
    ctx: TenantContext,
    actorId: string,
    examId: string,
    jobId: string,
  ): AiFormatJob {
    return toJobView(this.findJob(ctx, actorId, examId, jobId));
  }

  /** Huỷ: dừng lần gọi đang chạy, không áp kết quả (lượt tính theo plan 1.16). */
  async cancel(
    ctx: TenantContext,
    actorId: string,
    examId: string,
    jobId: string,
  ): Promise<AiFormatJob> {
    const job = this.findJob(ctx, actorId, examId, jobId);
    if (job.status === AiFormatRunStatus.RUNNING) {
      job.controller.abort(CANCELLED);
      await job.done;
    }
    return toJobView(job);
  }

  /** Người khác (kể cả Owner) không thấy job: 404 như job không tồn tại. */
  private findJob(
    ctx: TenantContext,
    actorId: string,
    examId: string,
    jobId: string,
  ): AiFormatJobState {
    const job = this.jobs.get(jobId);
    if (
      !job ||
      job.tenantId !== ctx.tenantId ||
      job.userId !== actorId ||
      job.examId !== examId
    ) {
      throw new NotFoundException(JOB_NOT_FOUND);
    }
    return job;
  }

  private async firstPrompt(
    manager: EntityManager,
    exam: Exam,
    dto: AiFormatDto,
    value: ExamElement[],
  ): Promise<string> {
    const blueprint = await manager
      .getRepository(ExamBlueprint)
      .findOneBy({ id: exam.blueprintId });
    const module = dto.moduleId
      ? await manager
          .getRepository(ExamModule)
          .findOneBy({ id: dto.moduleId, blueprintId: exam.blueprintId })
      : null;
    return buildAiFormatPrompt({
      blueprint: blueprint?.name ?? null,
      module: module?.name ?? null,
      note: dto.note ?? null,
      blocks: formatAiBlocks(toAiBlocks(value)),
      blockCount: value.length,
    });
  }

  /** Vòng thử (plan 1.10, 1.11): dừng khi hết lỗi cấu trúc, huỷ, quá giờ hoặc lỗi hệ thống. */
  private async runJob(job: AiFormatJobState, input: JobInput): Promise<void> {
    const signal = job.controller.signal;
    const deadline = setTimeout(
      () => job.controller.abort(TIMED_OUT),
      AI_JOB_TIMEOUT_MS,
    );
    const turns: GeminiTurn[] = [{ role: 'user', text: input.prompt }];
    const attempts: AiFormatAttempt[] = [];
    const tokens = { prompt: 0, output: 0 };
    let failure: string | null = null;

    try {
      for (let n = 1; n <= AI_FORMAT_MAX_ATTEMPTS; n++) {
        job.attempt = n;
        let text: string;
        try {
          const response = await this.gemini.generate({
            systemInstruction: AI_FORMAT_SYSTEM_PROMPT,
            turns,
            responseSchema: AI_FORMAT_RESPONSE_SCHEMA,
            abortSignal: AbortSignal.any([
              signal,
              AbortSignal.timeout(AI_CALL_TIMEOUT_MS),
            ]),
          });
          tokens.prompt += response.usage.promptTokens;
          tokens.output += response.usage.outputTokens;
          text = response.text;
          const attempt = evaluateAiAttempt(
            input.value,
            text,
            response.finishReason,
            this.createNodeId,
          );
          attempts.push(attempt);
          if (!shouldRetryAiAttempt(attempt)) break;
          if (n < AI_FORMAT_MAX_ATTEMPTS) {
            turns.push(
              { role: 'model', text },
              { role: 'user', text: buildAiRetryPrompt(attempt.feedback, n) },
            );
          }
        } catch (err) {
          if (signal.aborted) break;
          failure = describeFailure(err);
          break;
        }
      }
      if (signal.reason === TIMED_OUT) failure = JOB_TIMEOUT;
      this.finish(job, input.value, attempts, failure);
    } catch (err) {
      this.logger.error(`Job ${job.id} lỗi`, (err as Error)?.stack);
      job.status = AiFormatRunStatus.FAILED;
      job.error = UNEXPECTED;
      job.result = null;
    } finally {
      clearTimeout(deadline);
    }

    await this.saveRun(job, attempts.length, tokens, failure).catch((err) =>
      this.logger.error(
        `Không ghi được ai_format_runs ${job.id}`,
        (err as Error)?.stack,
      ),
    );
    const timer = setTimeout(() => {
      this.jobs.delete(job.id);
      this.timers.delete(timer);
    }, AI_JOB_TTL_MS);
    timer.unref();
    this.timers.add(timer);
  }

  /** Chốt trạng thái job từ các lần thử đã xong. */
  private finish(
    job: AiFormatJobState,
    original: ExamElement[],
    attempts: AiFormatAttempt[],
    failure: string | null,
  ): void {
    if (job.controller.signal.reason === CANCELLED) {
      job.status = AiFormatRunStatus.CANCELLED;
      return;
    }
    // Chưa có lần gọi nào xong: lỗi hệ thống / quá giờ, không tính lượt (1.16).
    if (!attempts.length) {
      job.status = AiFormatRunStatus.FAILED;
      job.error = failure ?? UNEXPECTED;
      return;
    }
    const best = pickBestAttempt(attempts);
    const value = best?.value ?? original;
    const issues = best?.issues ?? validateSection(original);
    job.result = {
      value,
      changed: best !== null,
      issues: issues.map(toIssue),
      skippedOps: best?.problemCount ?? 0,
    };
    // Section đã định dạng sẵn (AI không đổi gì): xong, nội dung giữ nguyên.
    const done = best
      ? best.structureErrorCount === 0
      : attempts.some((attempt) => attempt.alreadyFormatted);
    job.status = done ? AiFormatRunStatus.SUCCEEDED : AiFormatRunStatus.PARTIAL;
  }

  private async saveRun(
    job: AiFormatJobState,
    completed: number,
    tokens: { prompt: number; output: number },
    failure: string | null,
  ): Promise<void> {
    const error = job.error ?? failure;
    await this.runs.update(
      { id: job.id },
      {
        status: job.status,
        attempts: completed,
        // 1.16: một lần bấm = một lượt khi đã có lần gọi AI xong.
        counted: completed > 0,
        promptTokens: tokens.prompt,
        outputTokens: tokens.output,
        issueCount: job.result
          ? job.result.issues.filter(
              (i) => i.severity === 'error' && i.category === 'structure',
            ).length
          : null,
        error: error ? error.slice(0, ERROR_MAX_LENGTH) : null,
        finishedAt: new Date(),
      },
    );
  }
}

function describeFailure(err: unknown): string {
  if (err instanceof GeminiError) return err.message;
  if (err instanceof HttpException) return err.message;
  if ((err as Error)?.name === 'TimeoutError') return CALL_TIMEOUT;
  return UNEXPECTED;
}

function toJobView(job: AiFormatJobState): AiFormatJob {
  return {
    id: job.id,
    status: job.status,
    attempt: job.attempt,
    maxAttempts: AI_FORMAT_MAX_ATTEMPTS,
    result: job.result,
    error: job.error,
  };
}
