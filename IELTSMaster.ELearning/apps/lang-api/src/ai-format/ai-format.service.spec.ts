import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { isIndicator, validateSectionShape } from '@lang/exam-core';
import {
  AiFormatRunStatus,
  TenantRole,
  TenantStatus,
  type AiFormatJob,
} from '@lang/shared';
import {
  AI_NOT_CONFIGURED,
  GeminiError,
  type GeminiRequest,
  type GeminiResult,
  type GeminiService,
} from '../ai/gemini.service';
import { ExamBlueprint } from '../catalog/exam-blueprint.entity';
import { ExamModule } from '../catalog/exam-module.entity';
import { Exam } from '../exams/exam.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { AiFormatRun } from './ai-format-run.entity';
import { AiFormatService } from './ai-format.service';
import { countAiUsage } from './ai-usage';

const TENANT = 'tenant-a';
const OWNER = 'user-owner';
const TEACHER = 'user-teacher';
const OTHER_TEACHER = 'user-teacher-2';
const EXAM = 'exam-1';

const context = (roles: TenantRole[]): TenantContext => ({
  tenantId: TENANT,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId: 'membership',
  roles,
  permissions: [],
});
const ownerCtx = context([TenantRole.TENANT_OWNER]);
const teacherCtx = context([TenantRole.TEACHER]);

const p = (text: string) => ({ type: 'p', children: [{ text }] });

/** Đoạn đề dán vào: TFNG 2 câu + MC 1 câu, chưa có indicator. */
const PASTED = [
  p('Questions 1-2'), // 0
  p('Do the statements agree with the passage?'), // 1
  p('1 The fire started in a bakery.'), // 2
  p('2 The fire lasted two weeks.'), // 3
  p('Question 3'), // 4
  p('When did the fire start?'), // 5
  p('A 1566'), // 6
  p('B 1666'), // 7
];

const GOOD_OPS = [
  { op: 'indicator', before: 0, kind: 'subpart' },
  { op: 'indicator', before: 2, kind: 'question', qtype: 'tfng' },
  { op: 'pairs', blocks: [2, 3], answers: ['TRUE', 'FALSE'] },
  { op: 'indicator', before: 4, kind: 'subpart' },
  { op: 'indicator', before: 5, kind: 'question', qtype: 'mc-single' },
  { op: 'choices', blocks: [6, 7], correct: [7] },
];
/** Đúng cấu trúc nhưng văn bản không có đáp án: chỉ lỗi nhóm `answer`. */
const NO_ANSWER_OPS = GOOD_OPS.map((op) =>
  op.op === 'pairs'
    ? { ...op, answers: ['', ''] }
    : op.op === 'choices'
      ? { ...op, correct: [] }
      : op,
);
/** Thiếu cặp ghép: 1 lỗi cấu trúc. */
const ONE_ERROR_OPS = GOOD_OPS.filter((op) => op.op !== 'pairs');
/** Thiếu cả cặp ghép lẫn lựa chọn: 2 lỗi cấu trúc. */
const TWO_ERROR_OPS = ONE_ERROR_OPS.filter((op) => op.op !== 'choices');

const json = (ops: unknown[]) => JSON.stringify({ ops });

type Reply = string | Error | ((signal?: AbortSignal) => Promise<string>);

/** Gemini giả: trả lần lượt các câu trả lời đã xếp sẵn. */
class FakeGemini {
  configured = true;
  replies: Reply[] = [];
  calls: GeminiRequest[] = [];

  isConfigured() {
    return this.configured;
  }

  assertConfigured() {
    if (!this.configured) throw new NotImplementedException(AI_NOT_CONFIGURED);
  }

  async generate(request: GeminiRequest): Promise<GeminiResult> {
    this.calls.push({ ...request, turns: [...request.turns] });
    const reply = this.replies.shift();
    if (reply === undefined) throw new Error('Hết câu trả lời giả');
    if (reply instanceof Error) throw reply;
    const text =
      typeof reply === 'function' ? await reply(request.abortSignal) : reply;
    return {
      text,
      model: 'fake',
      finishReason: 'STOP',
      usage: { promptTokens: 100, outputTokens: 10 },
    };
  }
}

/** Câu trả lời treo tới khi bị huỷ; `started` xong khi AI bắt đầu được gọi. */
function hanging() {
  let markStarted: () => void = () => undefined;
  const started = new Promise<void>((resolve) => (markStarted = resolve));
  const reply = (signal?: AbortSignal) =>
    new Promise<string>((_, reject) => {
      markStarted();
      signal?.addEventListener('abort', () => reject(signal.reason));
    });
  return { reply, started };
}

async function setup({
  aiEnabled = true,
  quota = null as 100 | 1000 | null,
} = {}) {
  const tenants = new InMemoryRepository<Tenant>();
  const exams = new InMemoryRepository<Exam>();
  const blueprints = new InMemoryRepository<ExamBlueprint>();
  const modules = new InMemoryRepository<ExamModule>();
  const runs = new InMemoryRepository<AiFormatRun>(() => ({
    status: AiFormatRunStatus.RUNNING,
    attempts: 0,
    counted: false,
    promptTokens: 0,
    outputTokens: 0,
    issueCount: null,
    error: null,
    startedAt: new Date(),
    finishedAt: null,
  }));
  const dataSource = new InMemoryDataSource()
    .register(Tenant, tenants)
    .register(Exam, exams)
    .register(ExamBlueprint, blueprints)
    .register(ExamModule, modules)
    .register(AiFormatRun, runs)
    .asDataSource();

  await tenants.save(
    tenants.create({
      id: TENANT,
      status: TenantStatus.ACTIVE,
      aiEnabled,
      aiMonthlyQuota: quota,
    }),
  );
  await blueprints.save(
    blueprints.create({ id: 'bp', name: 'IELTS Academic' }),
  );
  await modules.save(
    modules.create({ id: 'mod-reading', blueprintId: 'bp', name: 'Reading' }),
  );
  await exams.save(
    exams.create({
      id: EXAM,
      tenantId: TENANT,
      blueprintId: 'bp',
      createdBy: TEACHER,
    }),
  );

  const gemini = new FakeGemini();
  const service = new AiFormatService(
    dataSource,
    gemini as unknown as GeminiService,
    tenants.asRepository(),
    runs.asRepository(),
  );
  let id = 0;
  service.createNodeId = () => `n${++id}`;

  const start = (
    body: { value?: unknown[]; note?: string; moduleId?: string } = {},
    ctx = ownerCtx,
    actor = OWNER,
  ) =>
    service.start(ctx, actor, EXAM, {
      value: PASTED,
      ...body,
    });

  /** Chờ job chạy xong (Gemini giả trả ngay nên chỉ cần vài vòng event loop). */
  const settle = async (jobId: string, actor = OWNER): Promise<AiFormatJob> => {
    for (let i = 0; i < 100; i++) {
      const job = service.find(ownerCtx, actor, EXAM, jobId);
      const run = runs.rows.find((r) => r.id === jobId);
      if (job.status !== AiFormatRunStatus.RUNNING && run?.finishedAt) {
        return job;
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    throw new Error('Job chưa xong');
  };

  const runOf = (jobId: string) => runs.rows.find((r) => r.id === jobId)!;

  return { service, gemini, runs, tenants, start, settle, runOf };
}

type Setup = Awaited<ReturnType<typeof setup>>;
let current: Setup | null = null;
const use = async (options?: Parameters<typeof setup>[0]) =>
  (current = await setup(options));
afterEach(() => current?.service.onModuleDestroy());

describe('AiFormatService – vòng thử', () => {
  it('lần đầu hết lỗi: 1 lần gọi, succeeded, tính 1 lượt', async () => {
    const { gemini, start, settle, runOf } = await use();
    gemini.replies = [json(GOOD_OPS)];
    const { jobId } = await start({
      note: 'Đề IELTS',
      moduleId: 'mod-reading',
    });
    const job = await settle(jobId);

    expect(gemini.calls).toHaveLength(1);
    const prompt = gemini.calls[0].turns[0].text;
    expect(prompt).toContain('Exam type: IELTS Academic');
    expect(prompt).toContain('Module of this section: Reading');
    expect(prompt).toContain('Đề IELTS');
    expect(prompt).toContain('[2] p: "1 The fire started in a bakery."');
    expect(gemini.calls[0].responseSchema).toBeDefined();

    expect(job.status).toBe(AiFormatRunStatus.SUCCEEDED);
    expect(job.attempt).toBe(1);
    expect(job.result?.changed).toBe(true);
    expect(job.result?.issues).toEqual([]);
    const value = job.result!.value;
    expect(validateSectionShape(value)).toEqual([]);
    expect(value.filter((b) => isIndicator(b as never))).toHaveLength(4);

    expect(runOf(jobId)).toMatchObject({
      status: AiFormatRunStatus.SUCCEEDED,
      attempts: 1,
      counted: true,
      promptTokens: 100,
      outputTokens: 10,
      issueCount: 0,
      error: null,
      examId: EXAM,
      userId: OWNER,
    });
    expect(runOf(jobId).finishedAt).toBeInstanceOf(Date);
  });

  it('chỉ thiếu đáp án: không thử lại, kết quả kèm vấn đề nhóm answer', async () => {
    const { gemini, start, settle } = await use();
    gemini.replies = [json(NO_ANSWER_OPS)];
    const job = await settle((await start()).jobId);

    expect(gemini.calls).toHaveLength(1);
    expect(job.status).toBe(AiFormatRunStatus.SUCCEEDED);
    expect(job.result?.issues.length).toBeGreaterThan(0);
    expect(job.result?.issues.every((i) => i.category === 'answer')).toBe(true);
  });

  it('dừng sớm khi lần 2 hết lỗi cấu trúc; lần 2 nhận phản hồi lỗi', async () => {
    const { gemini, start, settle, runOf } = await use();
    gemini.replies = [json(ONE_ERROR_OPS), json(GOOD_OPS), json(GOOD_OPS)];
    const { jobId } = await start();
    const job = await settle(jobId);

    expect(gemini.calls).toHaveLength(2);
    const turns = gemini.calls[1].turns;
    expect(turns.map((t) => t.role)).toEqual(['user', 'model', 'user']);
    expect(turns[1].text).toBe(json(ONE_ERROR_OPS));
    expect(turns[2].text).toContain('attempt 1/3');
    expect(turns[2].text).toContain('Chưa có cặp ghép nào');
    expect(job.status).toBe(AiFormatRunStatus.SUCCEEDED);
    expect(runOf(jobId)).toMatchObject({
      attempts: 2,
      counted: true,
      promptTokens: 200,
      outputTokens: 20,
    });
  });

  it('đủ 3 lần vẫn lỗi: partial, chọn lần ít lỗi cấu trúc nhất', async () => {
    const { gemini, start, settle, runOf } = await use();
    gemini.replies = [json(TWO_ERROR_OPS), json(ONE_ERROR_OPS), '{hỏng'];
    const { jobId } = await start();
    const job = await settle(jobId);

    expect(gemini.calls).toHaveLength(3);
    expect(gemini.calls[2].turns).toHaveLength(5);
    expect(job.status).toBe(AiFormatRunStatus.PARTIAL);
    expect(job.attempt).toBe(3);
    expect(job.result?.changed).toBe(true);
    const errors = job.result!.issues.filter(
      (i) => i.severity === 'error' && i.category === 'structure',
    );
    expect(errors).toHaveLength(1);
    // Lần 2 có lựa chọn checkbox (lần 1 không có).
    expect(
      job.result!.value.filter(
        (b) => (b as { listStyleType?: string }).listStyleType === 'todo',
      ),
    ).toHaveLength(2);
    expect(runOf(jobId)).toMatchObject({
      status: AiFormatRunStatus.PARTIAL,
      attempts: 3,
      counted: true,
      issueCount: 1,
    });
  });

  it('không lần nào áp được: giữ nội dung gốc, vẫn tính lượt', async () => {
    const { gemini, start, settle, runOf } = await use();
    gemini.replies = ['không phải JSON', json([]), json([{ op: 'xoá hết' }])];
    const { jobId } = await start();
    const job = await settle(jobId);

    expect(gemini.calls).toHaveLength(3);
    expect(gemini.calls[1].turns[2].text).toContain('JSON hợp lệ');
    expect(gemini.calls[2].turns[4].text).toContain('không có thao tác nào');
    expect(job.status).toBe(AiFormatRunStatus.PARTIAL);
    expect(job.result).toMatchObject({ changed: false, value: PASTED });
    expect(runOf(jobId).counted).toBe(true);
  });

  it('section đã định dạng sẵn, AI trả danh sách rỗng: dừng ngay, giữ nguyên', async () => {
    const { gemini, start, settle, runOf } = await use();
    gemini.replies = [json(GOOD_OPS)];
    const formatted = (await settle((await start()).jobId)).result!.value;

    gemini.calls = [];
    gemini.replies = [json([]), json(GOOD_OPS)];
    const { jobId } = await start({ value: formatted });
    const job = await settle(jobId);

    expect(gemini.calls).toHaveLength(1);
    expect(job.status).toBe(AiFormatRunStatus.SUCCEEDED);
    expect(job.result).toMatchObject({ changed: false, value: formatted });
    expect(runOf(jobId)).toMatchObject({ attempts: 1, counted: true });
  });

  it('thao tác bị bỏ cũng thử lại và báo đúng số thao tác', async () => {
    const { gemini, start, settle } = await use();
    const typo = [
      ...GOOD_OPS,
      { op: 'removeText', block: 5, match: 'không có trong đề' },
    ];
    gemini.replies = [json(typo), json(GOOD_OPS)];
    const job = await settle((await start()).jobId);

    expect(gemini.calls).toHaveLength(2);
    expect(gemini.calls[1].turns[2].text).toContain('Thao tác #6 bị bỏ');
    expect(job.result?.skippedOps).toBe(0);
  });
});

describe('AiFormatService – đếm lượt (plan 1.16)', () => {
  it('lỗi hệ thống ngay lần gọi đầu: failed, không tính lượt', async () => {
    const { gemini, start, settle, runOf, runs } = await use();
    gemini.replies = [
      new GeminiError('Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau', 503),
    ];
    const { jobId } = await start();
    const job = await settle(jobId);

    expect(job.status).toBe(AiFormatRunStatus.FAILED);
    expect(job.error).toBe('Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau');
    expect(job.result).toBeNull();
    expect(runOf(jobId)).toMatchObject({
      status: AiFormatRunStatus.FAILED,
      attempts: 0,
      counted: false,
      error: 'Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau',
    });
    expect(await countAiUsage(runs.asRepository(), TENANT)).toBe(0);
  });

  it('lỗi hệ thống ở lần 2: dùng kết quả lần 1, vẫn tính lượt', async () => {
    const { gemini, start, settle, runOf } = await use();
    gemini.replies = [json(ONE_ERROR_OPS), new Error('mạng')];
    const { jobId } = await start();
    const job = await settle(jobId);

    expect(job.status).toBe(AiFormatRunStatus.PARTIAL);
    expect(job.result?.changed).toBe(true);
    expect(job.error).toBeNull();
    expect(runOf(jobId)).toMatchObject({
      attempts: 1,
      counted: true,
      error: 'Định dạng bằng AI gặp lỗi, vui lòng thử lại',
    });
  });

  it('huỷ trước khi lần gọi đầu xong: cancelled, không tính lượt', async () => {
    const { gemini, service, start, runOf, runs } = await use();
    const call = hanging();
    gemini.replies = [call.reply];
    const { jobId } = await start();
    await call.started;
    expect(await countAiUsage(runs.asRepository(), TENANT)).toBe(1);

    const job = await service.cancel(ownerCtx, OWNER, EXAM, jobId);
    expect(job.status).toBe(AiFormatRunStatus.CANCELLED);
    expect(job.result).toBeNull();
    expect(runOf(jobId)).toMatchObject({
      status: AiFormatRunStatus.CANCELLED,
      attempts: 0,
      counted: false,
    });
    expect(await countAiUsage(runs.asRepository(), TENANT)).toBe(0);
  });

  it('huỷ ở lần 2: không áp kết quả nhưng tính lượt', async () => {
    const { gemini, service, start, runOf } = await use();
    const call = hanging();
    gemini.replies = [json(ONE_ERROR_OPS), call.reply];
    const { jobId } = await start();
    await call.started;

    const job = await service.cancel(ownerCtx, OWNER, EXAM, jobId);
    expect(job.status).toBe(AiFormatRunStatus.CANCELLED);
    expect(job.result).toBeNull();
    expect(runOf(jobId)).toMatchObject({ attempts: 1, counted: true });
    // Huỷ lại job đã dừng: không đổi gì.
    expect((await service.cancel(ownerCtx, OWNER, EXAM, jobId)).status).toBe(
      AiFormatRunStatus.CANCELLED,
    );
  });

  it('API khởi động lại: lượt đang chạy thành failed, không tính', async () => {
    const { service, runs } = await use();
    await runs.save(runs.create({ tenantId: TENANT, userId: OWNER }));
    await service.onApplicationBootstrap();
    expect(runs.rows[0]).toMatchObject({
      status: AiFormatRunStatus.FAILED,
      counted: false,
    });
  });
});

describe('AiFormatService – kiểm tra trước khi chạy', () => {
  const expectStatus = async (promise: Promise<unknown>, status: number) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(status);
  };

  it('Teacher chỉ dùng được trên đề mình tạo (403), đề khác tenant 404', async () => {
    const { gemini, service, start, runs } = await use();
    gemini.replies = [json(GOOD_OPS)];
    await expect(start({}, teacherCtx, OTHER_TEACHER)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      service.start(ownerCtx, OWNER, 'exam-khac', { value: PASTED }),
    ).rejects.toThrow(NotFoundException);
    expect(runs.rows).toHaveLength(0);
    await expect(start({}, teacherCtx, TEACHER)).resolves.toHaveProperty(
      'jobId',
    );
  });

  it('tenant chưa bật AI: 403', async () => {
    const { start, runs } = await use({ aiEnabled: false });
    await expect(start()).rejects.toThrow(ForbiddenException);
    expect(runs.rows).toHaveLength(0);
  });

  it('server thiếu cấu hình Gemini: 501', async () => {
    const { gemini, start, runs } = await use();
    gemini.configured = false;
    await expect(start()).rejects.toThrow(NotImplementedException);
    expect(runs.rows).toHaveLength(0);
  });

  it('nội dung rỗng / sai định dạng: 400, không tính lượt', async () => {
    const { start, runs } = await use();
    await expect(start({ value: [p('')] })).rejects.toThrow(
      BadRequestException,
    );
    await expect(start({ value: [{ children: 'x' }] })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      start({ value: Array.from({ length: 2001 }, () => p('x')) }),
    ).rejects.toThrow(/2000/);
    expect(runs.rows).toHaveLength(0);
  });

  it('hết hạn mức: 429; lượt đang chạy cũng tính', async () => {
    const { gemini, start, runs } = await use({ quota: 100 });
    for (let i = 0; i < 99; i++) {
      await runs.save(
        runs.create({
          tenantId: TENANT,
          status: AiFormatRunStatus.SUCCEEDED,
          counted: true,
        }),
      );
    }
    // Lượt lỗi hệ thống không tính.
    await runs.save(
      runs.create({
        tenantId: TENANT,
        status: AiFormatRunStatus.FAILED,
        counted: false,
      }),
    );
    const call = hanging();
    gemini.replies = [call.reply];
    await start(); // lượt thứ 100, đang chạy
    await call.started;
    await expectStatus(start(), HttpStatus.TOO_MANY_REQUESTS);
  });
});

describe('AiFormatService – xem / huỷ job', () => {
  it('chỉ người tạo job xem/huỷ được, người khác 404', async () => {
    const { gemini, service, start, settle } = await use();
    gemini.replies = [json(GOOD_OPS)];
    const { jobId } = await start({}, teacherCtx, TEACHER);
    await settle(jobId, TEACHER);

    expect(service.find(teacherCtx, TEACHER, EXAM, jobId).status).toBe(
      AiFormatRunStatus.SUCCEEDED,
    );
    expect(() => service.find(ownerCtx, OWNER, EXAM, jobId)).toThrow(
      NotFoundException,
    );
    expect(() => service.find(teacherCtx, TEACHER, 'exam-2', jobId)).toThrow(
      NotFoundException,
    );
    expect(() =>
      service.find(
        { ...teacherCtx, tenantId: 'tenant-b' },
        TEACHER,
        EXAM,
        jobId,
      ),
    ).toThrow(NotFoundException);
    await expect(service.cancel(ownerCtx, OWNER, EXAM, jobId)).rejects.toThrow(
      NotFoundException,
    );
    expect(() => service.find(ownerCtx, OWNER, EXAM, 'khong-co')).toThrow(
      NotFoundException,
    );
  });

  it('trạng thái AI của tenant', async () => {
    const { gemini, service, runs } = await use({ quota: 1000 });
    await runs.save(
      runs.create({
        tenantId: TENANT,
        status: AiFormatRunStatus.SUCCEEDED,
        counted: true,
      }),
    );
    expect(await service.status(ownerCtx)).toEqual({
      enabled: true,
      configured: true,
      used: 1,
      limit: 1000,
    });
    gemini.configured = false;
    expect((await service.status(ownerCtx)).configured).toBe(false);
  });
});
