import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AttemptStatus,
  ContentVisibility,
  ExamSectionStatus,
  ExamStatus,
  TenantRole,
  TenantStatus,
  type ExamContentIssue,
  type ExamSectionInput,
} from '@lang/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ExamBlueprint } from '../catalog/exam-blueprint.entity';
import { ExamBlueprintsService } from '../catalog/exam-blueprints.service';
import { Category } from '../catalog/category.entity';
import { ExamModule } from '../catalog/exam-module.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import {
  InMemoryRepository,
  stubQueryBuilderRepository,
} from '../testing/in-memory-repository';
import { validationMessages } from '../common/validation';
import { User } from '../users/user.entity';
import { SaveExamContentDto, UpdateExamDto } from './dto/exam.dto';
import { ExamContentService } from './exam-content.service';
import { ExamPart } from './exam-part.entity';
import { ExamQuestion } from './exam-question.entity';
import { ExamSection } from './exam-section.entity';
import { Exam } from './exam.entity';
import { ExamsService, cloneTitle } from './exams.service';

const TENANT = 'tenant-a';
const OWNER = 'user-owner';
const TEACHER = 'user-teacher';
const OTHER_TEACHER = 'user-teacher-2';

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

/** Câu MC 1 đáp án; `checked` = chỉ số đáp án đúng, `null` = chưa tick (lỗi). */
function mcQuestion(id: string, checked: number | null = 0) {
  return [
    {
      type: 'indicator',
      id,
      kind: 'question',
      qtype: 'mc-single',
      children: [{ text: '' }],
    },
    { type: 'p', children: [{ text: `Câu hỏi ${id}` }] },
    ...['A', 'B', 'C'].map((text, index) => ({
      type: 'p',
      listStyleType: 'todo',
      indent: 1,
      checked: index === checked,
      children: [{ text }],
    })),
  ];
}

function part(id: string, ...questions: unknown[][]) {
  return [
    { type: 'indicator', id, kind: 'part', children: [{ text: '' }] },
    ...questions.flat(),
  ];
}

const section = (
  name: string,
  rawData: unknown[],
  durationMinutes = 30,
): ExamSectionInput => ({ name, durationMinutes, rawData });

async function setup() {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const categories = new InMemoryRepository<Category>(timestamps);
  const blueprints = new InMemoryRepository<ExamBlueprint>(timestamps);
  const modules = new InMemoryRepository<ExamModule>(timestamps);
  const exams = new InMemoryRepository<Exam>(() => ({
    ...timestamps(),
    deletedAt: null,
    publishedAt: null,
  }));
  const sections = new InMemoryRepository<ExamSection>();
  const parts = new InMemoryRepository<ExamPart>();
  const questions = new InMemoryRepository<ExamQuestion>();
  const attempts = new InMemoryRepository<ExamAttempt>(timestamps);
  const users = new InMemoryRepository<User>(timestamps);

  // `insert` của repository giả không chạy default của cột.
  const insertSections = sections.insert.bind(sections);
  sections.insert = (rows) =>
    insertSections(
      (Array.isArray(rows) ? rows : [rows]).map((row) =>
        Object.assign({ createdAt: new Date() }, row),
      ),
    );

  const dataSource = new InMemoryDataSource()
    .register(Category, categories)
    .register(ExamBlueprint, blueprints)
    .register(ExamModule, modules)
    .register(Exam, exams)
    .register(ExamSection, sections)
    .register(ExamPart, parts)
    .register(ExamQuestion, questions)
    .register(ExamAttempt, attempts)
    .register(User, users)
    .asDataSource();
  const blueprintsService = new ExamBlueprintsService(
    dataSource,
    blueprints.asRepository(),
    categories.asRepository(),
    modules.asRepository(),
    stubQueryBuilderRepository(),
  );
  const examsService = new ExamsService(
    dataSource,
    blueprintsService,
    exams.asRepository(),
    sections.asRepository(),
    blueprints.asRepository(),
    categories.asRepository(),
    attempts.asRepository(),
    users.asRepository(),
  );
  const contentService = new ExamContentService(
    dataSource,
    examsService,
    sections.asRepository(),
    attempts.asRepository(),
    users.asRepository(),
  );

  const category = await categories.save(
    categories.create({
      tenantId: null,
      code: 'EN',
      name: 'Tiếng Anh',
      isActive: true,
    }),
  );
  const ielts = await blueprints.save(
    blueprints.create({
      tenantId: null,
      categoryId: category.id,
      code: 'IELTS',
      name: 'IELTS',
      isActive: true,
    }),
  );
  for (const [sortOrder, [name, minutes]] of (
    [
      ['Listening', 30],
      ['Reading', 60],
      ['Writing', 60],
      ['Speaking', 15],
    ] as const
  ).entries()) {
    await modules.save(
      modules.create({
        blueprintId: ielts.id,
        code: name.toUpperCase(),
        name,
        sortOrder,
        referenceDurationMinutes: minutes,
      }),
    );
  }

  const createExam = (ctx = ownerCtx, actorId = OWNER) =>
    examsService.create(ctx, actorId, {
      blueprintId: ielts.id,
      title: 'IELTS thử',
    });

  const addAttempt = (examId: string, examVersion: number) =>
    attempts.save(
      attempts.create({
        tenantId: TENANT,
        examId,
        examVersion,
        userId: 'student',
        membershipId: 'student-membership',
        status: AttemptStatus.IN_PROGRESS,
      }),
    );

  const questionsOf = (sectionIds: string[]) =>
    questions.rows.filter((row) => sectionIds.includes(row.sectionId));

  return {
    examsService,
    contentService,
    blueprints,
    sections,
    parts,
    exams,
    ielts,
    createExam,
    addAttempt,
    questionsOf,
    attempts,
  };
}

/** Giải thích gắn câu `questionId`, kèm lựa chọn đã tick để kiểm không lộ. */
function explanation(id: string, content: string) {
  return [
    { type: 'indicator', id, kind: 'explanation', children: [{ text: '' }] },
    { type: 'p', children: [{ text: content }] },
    {
      type: 'p',
      listStyleType: 'todo',
      indent: 1,
      checked: true,
      children: [{ text: 'Lựa chọn trong giải thích' }],
    },
  ];
}

async function expectIssues(
  promise: Promise<unknown>,
): Promise<ExamContentIssue[]> {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(UnprocessableEntityException);
  return (
    (error as UnprocessableEntityException).getResponse() as {
      issues: ExamContentIssue[];
    }
  ).issues;
}

describe('ExamsService.create', () => {
  it('tạo đề nháp version 1, mỗi module thành 1 section trống theo thứ tự', async () => {
    const { createExam } = await setup();
    const exam = await createExam();
    expect(exam).toMatchObject({
      status: ExamStatus.DRAFT,
      currentVersion: 1,
      contentRevision: 1,
      sectionCount: 4,
      totalDurationMinutes: 165,
      hasAttempts: false,
      canEdit: true,
    });
    expect(exam.sections.map((s) => [s.name, s.durationMinutes])).toEqual([
      ['Listening', 30],
      ['Reading', 60],
      ['Writing', 60],
      ['Speaking', 15],
    ]);
  });

  it('không tạo được từ loại đề ngừng dùng', async () => {
    const { createExam, blueprints, ielts } = await setup();
    await blueprints.update(ielts.id, { isActive: false });
    await expect(createExam()).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ExamContentService.save', () => {
  it('chưa có bài làm: giữ version, thay section và câu hỏi mới', async () => {
    const { contentService, createExam, sections, parts, questionsOf } =
      await setup();
    const exam = await createExam();

    const first = await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 1,
      sections: [
        section('Reading', part('p1', mcQuestion('q1'), mcQuestion('q2'))),
      ],
    });
    expect(first).toMatchObject({
      currentVersion: 1,
      contentRevision: 2,
      sectionCount: 1,
      questionCount: 2,
    });
    expect(questionsOf(first.sections.map((s) => s.id))).toHaveLength(2);
    expect(
      parts.rows.find((row) => row.sectionId === first.sections[0].id),
    ).toMatchObject({ nodeId: 'p1', kind: 'part', firstNumber: 1 });

    const second = await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 2,
      sections: [
        section('Listening', [mcQuestion('q9', 2)].flat(), 45),
        section('Reading', part('p1', mcQuestion('q1'))),
      ],
    });
    expect(second).toMatchObject({ currentVersion: 1, contentRevision: 3 });
    const ids = second.sections.map((s) => s.id);
    // Section cũ bị xoá (DB xoá theo cả part/câu hỏi).
    expect(sections.rows.map((row) => row.id).sort()).toEqual([...ids].sort());
    const saved = questionsOf(ids);
    expect(saved.map((q) => [q.nodeId, q.number, q.answerKey])).toEqual([
      ['q9', 1, { indexes: [2] }],
      ['q1', 1, { indexes: [0] }],
    ]);
    // content_public không còn đáp án.
    expect(JSON.stringify(sections.rows[0].contentPublic)).not.toContain(
      'checked',
    );
  });

  it('có bài làm (kể cả đang làm): tạo version mới, version cũ deactivated', async () => {
    const { contentService, createExam, addAttempt, sections } = await setup();
    const exam = await createExam();
    await addAttempt(exam.id, 1);

    const saved = await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 1,
      sections: [section('Reading', mcQuestion('q1'))],
    });
    expect(saved).toMatchObject({
      currentVersion: 2,
      contentRevision: 2,
      hasAttempts: false,
      sectionCount: 1,
    });
    const byVersion = (version: number) =>
      sections.rows.filter((row) => row.version === version);
    expect(byVersion(1)).toHaveLength(4);
    expect(
      byVersion(1).every((row) => row.status === ExamSectionStatus.DEACTIVATED),
    ).toBe(true);
    expect(byVersion(2).map((row) => row.status)).toEqual([
      ExamSectionStatus.ACTIVE,
    ]);

    // Version 2 chưa có bài làm: lưu tiếp ghi đè trong version 2.
    const again = await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 2,
      sections: [section('Reading 2', mcQuestion('q1'))],
    });
    expect(again.currentVersion).toBe(2);
    expect(byVersion(2).map((row) => row.name)).toEqual(['Reading 2']);
  });

  it('khôi phục version cũ = lưu lại nội dung version đó', async () => {
    const { contentService, createExam, addAttempt } = await setup();
    const exam = await createExam();
    await addAttempt(exam.id, 1);
    await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 1,
      sections: [section('Reading', mcQuestion('q1'))],
    });

    // Version 2 chưa có bài làm → ghi đè version 2 bằng nội dung version 1.
    const restored = await contentService.restore(ownerCtx, OWNER, exam.id, 1, {
      baseRevision: 2,
    });
    expect(restored).toMatchObject({ currentVersion: 2, contentRevision: 3 });
    expect(restored.sections.map((s) => s.name)).toEqual([
      'Listening',
      'Reading',
      'Writing',
      'Speaking',
    ]);

    // Version hiện tại có bài làm → khôi phục tạo version 3.
    await addAttempt(exam.id, 2);
    const third = await contentService.restore(ownerCtx, OWNER, exam.id, 1, {
      baseRevision: 3,
    });
    expect(third.currentVersion).toBe(3);
    await expect(
      contentService.restore(ownerCtx, OWNER, exam.id, 3, { baseRevision: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Teacher chỉ sửa được đề của mình; Owner sửa được đề của Teacher', async () => {
    const { contentService, examsService, createExam } = await setup();
    const exam = await createExam(teacherCtx, TEACHER);
    const input = {
      baseRevision: 1,
      sections: [section('R', mcQuestion('q'))],
    };

    await expect(
      contentService.save(teacherCtx, OTHER_TEACHER, exam.id, input),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      examsService.publish(teacherCtx, OTHER_TEACHER, exam.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (await examsService.getDetail(teacherCtx, OTHER_TEACHER, exam.id))
        .canEdit,
    ).toBe(false);

    await contentService.save(teacherCtx, TEACHER, exam.id, input);
    const byOwner = await contentService.save(ownerCtx, OWNER, exam.id, {
      ...input,
      baseRevision: 2,
    });
    expect(byOwner.contentRevision).toBe(3);
  });

  it('Teacher không sửa metadata/lưu trữ/xoá/khôi phục đề người khác; đề tenant khác → 404', async () => {
    const { contentService, examsService, createExam } = await setup();
    const exam = await createExam(teacherCtx, TEACHER);

    for (const action of [
      () =>
        examsService.update(teacherCtx, OTHER_TEACHER, exam.id, { title: 'X' }),
      () => examsService.archive(teacherCtx, OTHER_TEACHER, exam.id),
      () => examsService.remove(teacherCtx, OTHER_TEACHER, exam.id),
      () =>
        contentService.restore(teacherCtx, OTHER_TEACHER, exam.id, 1, {
          baseRevision: 1,
        }),
    ]) {
      await expect(action()).rejects.toBeInstanceOf(ForbiddenException);
    }

    const otherTenant = { ...ownerCtx, tenantId: 'tenant-b' };
    for (const action of [
      () => examsService.getDetail(otherTenant, OWNER, exam.id),
      () => examsService.update(otherTenant, OWNER, exam.id, { title: 'X' }),
      () => examsService.publish(otherTenant, OWNER, exam.id),
      () => examsService.remove(otherTenant, OWNER, exam.id),
      () => contentService.listVersions(otherTenant, OWNER, exam.id),
    ]) {
      await expect(action()).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it('revision cũ → 409; data: URI → 400', async () => {
    const { contentService, createExam } = await setup();
    const exam = await createExam();
    await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 1,
      sections: [section('R', mcQuestion('q'))],
    });
    await expect(
      contentService.save(ownerCtx, OWNER, exam.id, {
        baseRevision: 1,
        sections: [section('R', mcQuestion('q'))],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      contentService.save(ownerCtx, OWNER, exam.id, {
        baseRevision: 2,
        sections: [
          section('R', [
            {
              type: 'img',
              url: 'data:image/png;base64,AAA',
              children: [{ text: '' }],
            },
          ]),
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Giải thích', () => {
  it('lưu riêng ở explanations, content_public chỉ còn indicator rỗng, không đổi số câu', async () => {
    const { contentService, createExam, sections, questionsOf } = await setup();
    const exam = await createExam();
    const saved = await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 1,
      sections: [
        section(
          'Reading',
          part(
            'p1',
            mcQuestion('q1'),
            explanation('e1', 'Vì A đúng'),
            mcQuestion('q2'),
          ),
        ),
      ],
    });
    expect(saved.questionCount).toBe(2);
    expect(
      questionsOf([saved.sections[0].id]).map((q) => [q.nodeId, q.number]),
    ).toEqual([
      ['q1', 1],
      ['q2', 2],
    ]);
    const row = sections.rows[0];
    expect(row.explanations).toEqual([
      {
        nodeId: 'e1',
        numbers: [1],
        blocks: explanation('e1', 'Vì A đúng').slice(1),
      },
    ]);
    const publicJson = JSON.stringify(row.contentPublic);
    expect(publicJson).toContain('"kind":"explanation"');
    expect(publicJson).not.toContain('Vì A đúng');
    expect(publicJson).not.toContain('Lựa chọn trong giải thích');
  });
});

describe('ExamsService: hiển thị', () => {
  it('mặc định tenant; người sửa được đề đổi được, Teacher đề người khác 403', async () => {
    const { examsService, createExam } = await setup();
    const exam = await createExam();
    expect(exam.visibility).toBe(ContentVisibility.TENANT);

    const changed = await examsService.update(ownerCtx, OWNER, exam.id, {
      visibility: ContentVisibility.PRIVATE,
    });
    expect(changed).toMatchObject({
      visibility: ContentVisibility.PRIVATE,
      title: 'IELTS thử',
    });
    await expect(
      examsService.update(teacherCtx, TEACHER, exam.id, {
        visibility: ContentVisibility.TENANT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('DTO chặn giá trị lạ', async () => {
    const errors = await validate(
      plainToInstance(UpdateExamDto, { visibility: 'public' }),
    );
    expect(validationMessages(errors)).toEqual([
      'Chế độ hiển thị không hợp lệ',
    ]);
  });
});

describe('ExamsService.clone', () => {
  it('đề đã publish → bản nháp version 1 của người nhân bản, chép nội dung version hiện tại', async () => {
    const {
      examsService,
      contentService,
      createExam,
      addAttempt,
      exams,
      sections,
      questionsOf,
      attempts,
    } = await setup();
    const source = await createExam();
    await contentService.save(ownerCtx, OWNER, source.id, {
      baseRevision: 1,
      sections: [
        section(
          'Reading',
          part('p1', mcQuestion('q1'), explanation('e1', 'x')),
        ),
      ],
    });
    await addAttempt(source.id, 1);
    // Version 2 (version 1 đã có bài làm) mới là nội dung được chép.
    await contentService.save(ownerCtx, OWNER, source.id, {
      baseRevision: 2,
      sections: [
        section('Reading', part('p1', mcQuestion('q1'), mcQuestion('q2'))),
        section('Writing', [], 60),
      ],
    });
    await examsService.update(ownerCtx, OWNER, source.id, {
      visibility: ContentVisibility.PRIVATE,
    });
    await examsService.publish(ownerCtx, OWNER, source.id);

    const clone = await examsService.clone(teacherCtx, TEACHER, source.id);
    expect(clone).toMatchObject({
      title: 'IELTS thử (bản sao)',
      status: ExamStatus.DRAFT,
      visibility: ContentVisibility.PRIVATE,
      currentVersion: 1,
      contentRevision: 1,
      hasAttempts: false,
      canEdit: true,
      creator: null,
      clonedFrom: { id: source.id, title: 'IELTS thử' },
      sectionCount: 2,
      questionCount: 2,
    });
    expect(exams.rows.find((row) => row.id === clone.id)?.createdBy).toBe(
      TEACHER,
    );
    const original = (await examsService.getDetail(ownerCtx, OWNER, source.id))
      .sections;
    expect(clone.sections.map((s) => [s.name, s.rawData])).toEqual(
      original.map((s) => [s.name, s.rawData]),
    );
    // Section/câu hỏi mới, không đụng đề gốc; không chép bài làm.
    const cloneSectionIds = clone.sections.map((s) => s.id);
    expect(cloneSectionIds).not.toContain(original[0].id);
    expect(questionsOf(cloneSectionIds)).toHaveLength(2);
    expect(sections.rows.filter((row) => row.examId === clone.id)).toHaveLength(
      2,
    );
    expect(attempts.rows.filter((row) => row.examId === clone.id)).toEqual([]);
  });

  it('nháp/lưu trữ chỉ người sửa được đề mới nhân bản được; đề tenant khác 404', async () => {
    const { examsService, createExam } = await setup();
    const ownerDraft = await createExam();
    await expect(
      examsService.clone(teacherCtx, TEACHER, ownerDraft.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (await examsService.clone(ownerCtx, OWNER, ownerDraft.id)).status,
    ).toBe(ExamStatus.DRAFT);

    const teacherDraft = await createExam(teacherCtx, TEACHER);
    expect(
      (await examsService.clone(teacherCtx, TEACHER, teacherDraft.id)).title,
    ).toBe('IELTS thử (bản sao)');

    await expect(
      examsService.clone(
        { ...ownerCtx, tenantId: 'tenant-b' },
        OWNER,
        ownerDraft.id,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tên dài bị cắt cho vừa hậu tố', () => {
    const title = cloneTitle('x'.repeat(200));
    expect(title).toHaveLength(200);
    expect(title.endsWith(' (bản sao)')).toBe(true);
  });
});

describe('ExamsService.publish', () => {
  it('đề còn lỗi → 422 kèm issue theo section; hết lỗi → published', async () => {
    const { contentService, examsService, createExam } = await setup();
    const exam = await createExam();
    await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 1,
      sections: [
        section('Listening', mcQuestion('ok')),
        section('Reading', mcQuestion('bad', null)),
      ],
    });

    const issues = await expectIssues(
      examsService.publish(ownerCtx, OWNER, exam.id),
    );
    expect(issues).toEqual([
      {
        sectionIndex: 1,
        sectionName: 'Reading',
        indicatorId: 'bad',
        message: 'Chưa tick đáp án nào.',
        severity: 'error',
      },
    ]);

    await contentService.save(ownerCtx, OWNER, exam.id, {
      baseRevision: 2,
      sections: [section('Reading', mcQuestion('bad', 1))],
    });
    const published = await examsService.publish(ownerCtx, OWNER, exam.id);
    expect(published.status).toBe(ExamStatus.PUBLISHED);
    expect(published.publishedAt).not.toBeNull();
    await expect(
      examsService.publish(ownerCtx, OWNER, exam.id),
    ).rejects.toBeInstanceOf(ConflictException);

    // Đề đã publish: lưu nội dung còn lỗi bị chặn, lưu trữ rồi publish lại được.
    await expectIssues(
      contentService.save(ownerCtx, OWNER, exam.id, {
        baseRevision: 3,
        sections: [section('Reading', mcQuestion('bad', null))],
      }),
    );
    expect((await examsService.archive(ownerCtx, OWNER, exam.id)).status).toBe(
      ExamStatus.ARCHIVED,
    );
    expect((await examsService.publish(ownerCtx, OWNER, exam.id)).status).toBe(
      ExamStatus.PUBLISHED,
    );
  });
});

describe('SaveExamContentDto', () => {
  const messages = async (body: unknown) =>
    validationMessages(
      await validate(plainToInstance(SaveExamContentDto, body)),
    );

  it('chặn duration sai, tên trống, 0 section', async () => {
    expect(
      await messages({
        baseRevision: 1,
        sections: [{ name: ' ', durationMinutes: 47, rawData: [] }],
      }),
    ).toEqual([
      'Vui lòng nhập tên section',
      'Thời lượng section phải là bội số của 5, từ 5 đến 180 phút',
    ]);
    expect(await messages({ baseRevision: 1, sections: [] })).toEqual([
      'Đề phải có ít nhất 1 section',
    ]);
    expect(
      await messages({
        baseRevision: 1,
        sections: [{ name: 'R', durationMinutes: 180, rawData: [] }],
      }),
    ).toEqual([]);
  });
});
