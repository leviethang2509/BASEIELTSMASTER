import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ContentVisibility,
  LessonSectionStatus,
  LessonStatus,
  TenantRole,
  TenantStatus,
  type ExamContentIssue,
  type LessonSectionInput,
} from '@lang/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { EntityManager } from 'typeorm';
import { Category } from '../catalog/category.entity';
import { LessonBlueprint } from '../catalog/lesson-blueprint.entity';
import { LessonBlueprintsService } from '../catalog/lesson-blueprints.service';
import { LessonModule } from '../catalog/lesson-module.entity';
import { validationMessages } from '../common/validation';
import type { TenantContext } from '../tenants/tenant-context';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import {
  InMemoryRepository,
  stubQueryBuilderRepository,
} from '../testing/in-memory-repository';
import { ClassItem } from '../classrooms/class-item.entity';
import { CurriculumItem } from '../training/curriculum-item.entity';
import { User } from '../users/user.entity';
import {
  CreateLessonDto,
  SaveLessonContentDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { LessonAttemptLookup } from './lesson-attempt-lookup';
import { LessonContentService } from './lesson-content.service';
import { LessonPart } from './lesson-part.entity';
import { LessonQuestion } from './lesson-question.entity';
import { LessonSection } from './lesson-section.entity';
import { Lesson } from './lesson.entity';
import { LessonsService, cloneLessonTitle } from './lessons.service';

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
const adminCtx = context([TenantRole.TENANT_ADMIN]);
const teacherCtx = context([TenantRole.TEACHER]);

/** Lượt học giả: đánh dấu version nào đã có lượt học. */
class FakeAttemptLookup extends LessonAttemptLookup {
  readonly versions: { lessonId: string; version: number }[] = [];

  constructor() {
    super(null as never);
  }

  override hasAttempts(
    _manager: EntityManager,
    lessonId: string,
    version?: number,
  ): Promise<boolean> {
    return Promise.resolve(
      this.versions.some(
        (row) =>
          row.lessonId === lessonId &&
          (version === undefined || row.version === version),
      ),
    );
  }

  override countByVersion(lessonId: string): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    for (const row of this.versions) {
      if (row.lessonId !== lessonId) continue;
      counts.set(row.version, (counts.get(row.version) ?? 0) + 1);
    }
    return Promise.resolve(counts);
  }
}

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

/** Giải thích gắn câu phía trên, kèm lựa chọn đã tick để kiểm không lộ. */
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

/** Đoạn lý thuyết có furigana, không có câu hỏi. */
const theory = (text: string) => [
  {
    type: 'p',
    children: [
      { text },
      { type: 'ruby', rt: 'にほんご', children: [{ text: '日本語' }] },
      { text: '' },
    ],
  },
];

const section = (name: string, rawData: unknown[]): LessonSectionInput => ({
  name,
  rawData,
});

const MINNA_MODULES = [
  'Từ vựng',
  'Ngữ pháp',
  'Hội thoại',
  'Luyện tập',
  'Bài tập',
];

async function setup() {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const categories = new InMemoryRepository<Category>(timestamps);
  const blueprints = new InMemoryRepository<LessonBlueprint>(timestamps);
  const modules = new InMemoryRepository<LessonModule>(timestamps);
  const lessons = new InMemoryRepository<Lesson>(() => ({
    ...timestamps(),
    deletedAt: null,
    publishedAt: null,
    clonedFromId: null,
  }));
  const sections = new InMemoryRepository<LessonSection>();
  const parts = new InMemoryRepository<LessonPart>();
  const questions = new InMemoryRepository<LessonQuestion>();
  const users = new InMemoryRepository<User>(timestamps);
  const curriculumItems = new InMemoryRepository<CurriculumItem>();
  const attempts = new FakeAttemptLookup();

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
    .register(LessonBlueprint, blueprints)
    .register(LessonModule, modules)
    .register(Lesson, lessons)
    .register(LessonSection, sections)
    .register(LessonPart, parts)
    .register(LessonQuestion, questions)
    .register(User, users)
    .register(CurriculumItem, curriculumItems)
    .register(ClassItem, new InMemoryRepository<ClassItem>())
    .asDataSource();
  const blueprintsService = new LessonBlueprintsService(
    dataSource,
    blueprints.asRepository(),
    categories.asRepository(),
    modules.asRepository(),
    stubQueryBuilderRepository(),
  );
  const lessonsService = new LessonsService(
    dataSource,
    blueprintsService,
    attempts,
    lessons.asRepository(),
    sections.asRepository(),
    blueprints.asRepository(),
    categories.asRepository(),
    users.asRepository(),
  );
  const contentService = new LessonContentService(
    dataSource,
    lessonsService,
    attempts,
    sections.asRepository(),
    users.asRepository(),
  );

  const category = await categories.save(
    categories.create({
      tenantId: null,
      code: 'JA',
      name: 'Tiếng Nhật',
      isActive: true,
    }),
  );
  const minna = await blueprints.save(
    blueprints.create({
      tenantId: null,
      categoryId: category.id,
      code: 'MINNA-1-BAI',
      name: 'Minna no Nihongo – 1 bài',
      isActive: true,
    }),
  );
  // Thứ tự lưu khác thứ tự phần để kiểm sắp theo `sortOrder`.
  for (const [sortOrder, name] of [...MINNA_MODULES.entries()].reverse()) {
    await modules.save(
      modules.create({
        blueprintId: minna.id,
        code: `P${sortOrder}`,
        name,
        sortOrder,
      }),
    );
  }

  const createLesson = (ctx = ownerCtx, actorId = OWNER) =>
    lessonsService.create(ctx, actorId, {
      blueprintId: minna.id,
      title: 'Minna bài 1',
    });

  const addAttempt = (lessonId: string, version: number) =>
    attempts.versions.push({ lessonId, version });

  const questionsOf = (sectionIds: string[]) =>
    questions.rows.filter((row) => sectionIds.includes(row.sectionId));

  return {
    lessonsService,
    contentService,
    curriculumItems,
    blueprints,
    categories,
    lessons,
    sections,
    parts,
    minna,
    createLesson,
    addAttempt,
    questionsOf,
  };
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

describe('LessonsService.create', () => {
  it('bài nháp version 1, mặc định private, mỗi phần của mẫu thành 1 section trống theo thứ tự', async () => {
    const { createLesson } = await setup();
    const lesson = await createLesson();
    expect(lesson).toMatchObject({
      status: LessonStatus.DRAFT,
      visibility: ContentVisibility.PRIVATE,
      currentVersion: 1,
      contentRevision: 1,
      sectionCount: 5,
      questionCount: 0,
      hasAttempts: false,
      canEdit: true,
      clonedFrom: null,
      blueprint: { code: 'MINNA-1-BAI', category: { code: 'JA' } },
    });
    expect(lesson.sections.map((s) => s.name)).toEqual(MINNA_MODULES);
    expect(lesson).not.toHaveProperty('totalDurationMinutes');
  });

  it('tạo kèm hiển thị tenant; mẫu ngừng dùng hoặc danh mục ngừng dùng → 400', async () => {
    const { lessonsService, blueprints, categories, minna } = await setup();
    const shared = await lessonsService.create(teacherCtx, TEACHER, {
      blueprintId: minna.id,
      title: 'Công khai',
      visibility: ContentVisibility.TENANT,
    });
    expect(shared.visibility).toBe(ContentVisibility.TENANT);

    await blueprints.update(minna.id, { isActive: false });
    await expect(
      lessonsService.create(ownerCtx, OWNER, {
        blueprintId: minna.id,
        title: 'X',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await blueprints.update(minna.id, { isActive: true });
    await categories.update(minna.categoryId, { isActive: false });
    await expect(
      lessonsService.create(ownerCtx, OWNER, {
        blueprintId: minna.id,
        title: 'X',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mẫu của tenant khác → 400', async () => {
    const { lessonsService, blueprints, minna } = await setup();
    const other = await blueprints.save(
      blueprints.create({
        tenantId: 'tenant-b',
        categoryId: minna.categoryId,
        code: 'B',
        name: 'B',
        isActive: true,
      }),
    );
    await expect(
      lessonsService.create(ownerCtx, OWNER, {
        blueprintId: other.id,
        title: 'X',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('LessonContentService.save', () => {
  it('chưa có lượt học: giữ version, thay section và câu hỏi mới', async () => {
    const { contentService, createLesson, sections, parts, questionsOf } =
      await setup();
    const lesson = await createLesson();

    const first = await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 1,
      sections: [
        section('Từ vựng', theory('Học ')),
        section('Bài tập', [
          {
            type: 'indicator',
            id: 'p1',
            kind: 'part',
            children: [{ text: '' }],
          },
          ...mcQuestion('q1'),
          ...mcQuestion('q2'),
        ]),
      ],
    });
    expect(first).toMatchObject({
      currentVersion: 1,
      contentRevision: 2,
      sectionCount: 2,
      questionCount: 2,
    });
    expect(first.sections.map((s) => [s.name, s.questionCount])).toEqual([
      ['Từ vựng', 0],
      ['Bài tập', 2],
    ]);
    expect(questionsOf(first.sections.map((s) => s.id))).toHaveLength(2);
    expect(
      parts.rows.find((row) => row.sectionId === first.sections[1].id),
    ).toMatchObject({ nodeId: 'p1', kind: 'part', firstNumber: 1 });
    // Section cũ (5 phần của mẫu) bị xoá.
    expect(sections.rows.map((row) => row.id).sort()).toEqual(
      first.sections.map((s) => s.id).sort(),
    );
    // Furigana giữ nguyên trong nội dung; content_public không còn đáp án.
    expect(JSON.stringify(first.sections[0].rawData)).toContain('にほんご');
    const exercise = sections.rows.find((row) => row.name === 'Bài tập')!;
    expect(JSON.stringify(exercise.contentPublic)).not.toContain('checked');
  });

  it('có lượt học: tạo version mới, version cũ deactivated; version mới lưu tiếp thì ghi đè', async () => {
    const { contentService, createLesson, addAttempt, sections } =
      await setup();
    const lesson = await createLesson();
    addAttempt(lesson.id, 1);

    const saved = await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 1,
      sections: [section('Bài tập', mcQuestion('q1'))],
    });
    expect(saved).toMatchObject({
      currentVersion: 2,
      contentRevision: 2,
      hasAttempts: false,
      sectionCount: 1,
    });
    const byVersion = (version: number) =>
      sections.rows.filter((row) => row.version === version);
    expect(byVersion(1)).toHaveLength(5);
    expect(
      byVersion(1).every(
        (row) => row.status === LessonSectionStatus.DEACTIVATED,
      ),
    ).toBe(true);

    const again = await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 2,
      sections: [section('Bài tập 2', mcQuestion('q1'))],
    });
    expect(again.currentVersion).toBe(2);
    expect(byVersion(2).map((row) => row.name)).toEqual(['Bài tập 2']);
  });

  it('danh sách version, xem version cũ, khôi phục = lưu lại nội dung version đó', async () => {
    const { contentService, createLesson, addAttempt } = await setup();
    const lesson = await createLesson();
    addAttempt(lesson.id, 1);
    await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 1,
      sections: [section('Bài tập', mcQuestion('q1'))],
    });

    const versions = await contentService.listVersions(
      ownerCtx,
      OWNER,
      lesson.id,
    );
    expect(versions).toMatchObject({
      lesson: { id: lesson.id, currentVersion: 2 },
      contentRevision: 2,
      hasAttempts: false,
    });
    expect(
      versions.items.map((item) => [
        item.version,
        item.isCurrent,
        item.sectionCount,
        item.questionCount,
        item.attemptCount,
      ]),
    ).toEqual([
      [2, true, 1, 1, 0],
      [1, false, 5, 0, 1],
    ]);
    const old = await contentService.getVersion(ownerCtx, lesson.id, 1);
    expect(old.sections.map((s) => s.name)).toEqual(MINNA_MODULES);
    await expect(
      contentService.getVersion(ownerCtx, lesson.id, 9),
    ).rejects.toBeInstanceOf(NotFoundException);

    const restored = await contentService.restore(
      ownerCtx,
      OWNER,
      lesson.id,
      1,
      { baseRevision: 2 },
    );
    expect(restored).toMatchObject({ currentVersion: 2, contentRevision: 3 });
    expect(restored.sections.map((s) => s.name)).toEqual(MINNA_MODULES);

    addAttempt(lesson.id, 2);
    const third = await contentService.restore(ownerCtx, OWNER, lesson.id, 1, {
      baseRevision: 3,
    });
    expect(third.currentVersion).toBe(3);
    await expect(
      contentService.restore(ownerCtx, OWNER, lesson.id, 3, {
        baseRevision: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revision cũ → 409; data: URI → 400', async () => {
    const { contentService, createLesson } = await setup();
    const lesson = await createLesson();
    await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 1,
      sections: [section('R', mcQuestion('q'))],
    });
    await expect(
      contentService.save(ownerCtx, OWNER, lesson.id, {
        baseRevision: 1,
        sections: [section('R', mcQuestion('q'))],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      contentService.restore(ownerCtx, OWNER, lesson.id, 1, {
        baseRevision: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      contentService.save(ownerCtx, OWNER, lesson.id, {
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

  it('giải thích lưu riêng ở explanations, content_public chỉ còn indicator rỗng', async () => {
    const { contentService, createLesson, sections, questionsOf } =
      await setup();
    const lesson = await createLesson();
    const saved = await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 1,
      sections: [
        section('Bài tập', [
          ...mcQuestion('q1'),
          ...explanation('e1', 'Vì A đúng'),
          ...mcQuestion('q2'),
        ]),
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

describe('Quyền', () => {
  it('Teacher chỉ sửa bài của mình; Owner/Admin sửa được bài của Teacher; Teacher khác chỉ xem', async () => {
    const { contentService, lessonsService, createLesson } = await setup();
    const lesson = await createLesson(teacherCtx, TEACHER);
    const input = {
      baseRevision: 1,
      sections: [section('R', mcQuestion('q'))],
    };

    const seen = await lessonsService.getDetail(
      teacherCtx,
      OTHER_TEACHER,
      lesson.id,
    );
    expect(seen.canEdit).toBe(false);
    expect(seen.sections).toHaveLength(5);

    for (const action of [
      () => contentService.save(teacherCtx, OTHER_TEACHER, lesson.id, input),
      () =>
        lessonsService.update(teacherCtx, OTHER_TEACHER, lesson.id, {
          title: 'X',
        }),
      () =>
        lessonsService.update(teacherCtx, OTHER_TEACHER, lesson.id, {
          visibility: ContentVisibility.TENANT,
        }),
      () => lessonsService.publish(teacherCtx, OTHER_TEACHER, lesson.id),
      () => lessonsService.archive(teacherCtx, OTHER_TEACHER, lesson.id),
      () => lessonsService.remove(teacherCtx, OTHER_TEACHER, lesson.id),
      () =>
        contentService.restore(teacherCtx, OTHER_TEACHER, lesson.id, 1, {
          baseRevision: 1,
        }),
    ]) {
      await expect(action()).rejects.toBeInstanceOf(ForbiddenException);
    }

    await contentService.save(teacherCtx, TEACHER, lesson.id, input);
    await contentService.save(ownerCtx, OWNER, lesson.id, {
      ...input,
      baseRevision: 2,
    });
    const byAdmin = await contentService.save(
      adminCtx,
      'user-admin',
      lesson.id,
      {
        ...input,
        baseRevision: 3,
      },
    );
    expect(byAdmin.contentRevision).toBe(4);
  });

  it('bài của tenant khác → 404', async () => {
    const { contentService, lessonsService, createLesson } = await setup();
    const lesson = await createLesson();
    const otherTenant = { ...ownerCtx, tenantId: 'tenant-b' };
    for (const action of [
      () => lessonsService.getDetail(otherTenant, OWNER, lesson.id),
      () =>
        lessonsService.update(otherTenant, OWNER, lesson.id, { title: 'X' }),
      () => lessonsService.publish(otherTenant, OWNER, lesson.id),
      () => lessonsService.clone(otherTenant, OWNER, lesson.id),
      () => lessonsService.remove(otherTenant, OWNER, lesson.id),
      () => contentService.listVersions(otherTenant, OWNER, lesson.id),
      () => contentService.getVersion(otherTenant, lesson.id, 1),
    ]) {
      await expect(action()).rejects.toBeInstanceOf(NotFoundException);
    }
  });
});

describe('LessonsService: hiển thị', () => {
  it('người sửa được bài đổi hiển thị, không tạo version', async () => {
    const { lessonsService, createLesson } = await setup();
    const lesson = await createLesson(teacherCtx, TEACHER);
    const changed = await lessonsService.update(
      teacherCtx,
      TEACHER,
      lesson.id,
      {
        visibility: ContentVisibility.TENANT,
      },
    );
    expect(changed).toMatchObject({
      visibility: ContentVisibility.TENANT,
      title: 'Minna bài 1',
      currentVersion: 1,
      contentRevision: 1,
    });
  });

  it('DTO chặn giá trị lạ', async () => {
    expect(
      validationMessages(
        await validate(
          plainToInstance(UpdateLessonDto, { visibility: 'public' }),
        ),
      ),
    ).toEqual(['Chế độ hiển thị không hợp lệ']);
    expect(
      validationMessages(
        await validate(
          plainToInstance(CreateLessonDto, { blueprintId: 'x', title: ' ' }),
        ),
      ),
    ).toEqual(['Vui lòng chọn mẫu bài học', 'Vui lòng nhập tên bài học']);
  });
});

describe('LessonsService.clone', () => {
  it('bài đã publish → bản nháp version 1 của người nhân bản, chép nội dung + giải thích version hiện tại', async () => {
    const {
      lessonsService,
      contentService,
      createLesson,
      addAttempt,
      lessons,
      sections,
      questionsOf,
    } = await setup();
    const source = await createLesson();
    addAttempt(source.id, 1);
    // Version 2 (version 1 đã có lượt học) mới là nội dung được chép.
    await contentService.save(ownerCtx, OWNER, source.id, {
      baseRevision: 1,
      sections: [
        section('Từ vựng', theory('Học ')),
        section('Bài tập', [
          ...mcQuestion('q1'),
          ...explanation('e1', 'Giải thích 1'),
          ...mcQuestion('q2'),
        ]),
      ],
    });
    await lessonsService.publish(ownerCtx, OWNER, source.id);

    const clone = await lessonsService.clone(teacherCtx, TEACHER, source.id);
    expect(clone).toMatchObject({
      title: 'Minna bài 1 (bản sao)',
      status: LessonStatus.DRAFT,
      visibility: ContentVisibility.PRIVATE,
      currentVersion: 1,
      contentRevision: 1,
      hasAttempts: false,
      canEdit: true,
      clonedFrom: { id: source.id, title: 'Minna bài 1' },
      sectionCount: 2,
      questionCount: 2,
    });
    expect(lessons.rows.find((row) => row.id === clone.id)?.createdBy).toBe(
      TEACHER,
    );
    const original = (
      await lessonsService.getDetail(ownerCtx, OWNER, source.id)
    ).sections;
    expect(clone.sections.map((s) => [s.name, s.rawData])).toEqual(
      original.map((s) => [s.name, s.rawData]),
    );
    const cloneSectionIds = clone.sections.map((s) => s.id);
    expect(cloneSectionIds).not.toContain(original[0].id);
    expect(questionsOf(cloneSectionIds)).toHaveLength(2);
    const cloneExercise = sections.rows.find(
      (row) => row.lessonId === clone.id && row.name === 'Bài tập',
    )!;
    expect(cloneExercise.explanations).toHaveLength(1);
    expect(cloneExercise.explanations[0].numbers).toEqual([1]);
    // Bài gốc vẫn publish, nhân bản không đụng.
    expect(
      (await lessonsService.getDetail(ownerCtx, OWNER, source.id)).status,
    ).toBe(LessonStatus.PUBLISHED);
  });

  it('nháp chỉ người sửa được mới nhân bản được', async () => {
    const { lessonsService, createLesson } = await setup();
    const ownerDraft = await createLesson();
    await expect(
      lessonsService.clone(teacherCtx, TEACHER, ownerDraft.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (await lessonsService.clone(ownerCtx, OWNER, ownerDraft.id)).status,
    ).toBe(LessonStatus.DRAFT);
    const teacherDraft = await createLesson(teacherCtx, TEACHER);
    expect(
      (await lessonsService.clone(teacherCtx, TEACHER, teacherDraft.id))
        .clonedFrom?.id,
    ).toBe(teacherDraft.id);
  });

  it('tên dài bị cắt cho vừa hậu tố', () => {
    const title = cloneLessonTitle('x'.repeat(200));
    expect(title).toHaveLength(200);
    expect(title.endsWith(' (bản sao)')).toBe(true);
  });
});

describe('LessonsService.publish / archive / remove', () => {
  it('bài còn lỗi → 422 kèm issue theo section; hết lỗi → published; bài đã publish không lưu được nội dung lỗi', async () => {
    const { contentService, lessonsService, createLesson } = await setup();
    const lesson = await createLesson();
    await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 1,
      sections: [
        section('Ngữ pháp', theory('A')),
        section('Bài tập', mcQuestion('bad', null)),
      ],
    });

    const issues = await expectIssues(
      lessonsService.publish(ownerCtx, OWNER, lesson.id),
    );
    expect(issues).toEqual([
      {
        sectionIndex: 1,
        sectionName: 'Bài tập',
        indicatorId: 'bad',
        message: 'Chưa tick đáp án nào.',
        severity: 'error',
      },
    ]);

    await contentService.save(ownerCtx, OWNER, lesson.id, {
      baseRevision: 2,
      sections: [section('Bài tập', mcQuestion('bad', 1))],
    });
    const published = await lessonsService.publish(ownerCtx, OWNER, lesson.id);
    expect(published.status).toBe(LessonStatus.PUBLISHED);
    expect(published.publishedAt).not.toBeNull();
    await expect(
      lessonsService.publish(ownerCtx, OWNER, lesson.id),
    ).rejects.toBeInstanceOf(ConflictException);

    await expectIssues(
      contentService.save(ownerCtx, OWNER, lesson.id, {
        baseRevision: 3,
        sections: [section('Bài tập', mcQuestion('bad', null))],
      }),
    );
    expect(
      (await lessonsService.archive(ownerCtx, OWNER, lesson.id)).status,
    ).toBe(LessonStatus.ARCHIVED);
    await expect(
      lessonsService.archive(ownerCtx, OWNER, lesson.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      (await lessonsService.publish(ownerCtx, OWNER, lesson.id)).status,
    ).toBe(LessonStatus.PUBLISHED);
  });

  it('bài học chỉ có lý thuyết publish được (không cần câu hỏi)', async () => {
    const { lessonsService, createLesson } = await setup();
    const lesson = await createLesson();
    expect(
      (await lessonsService.publish(ownerCtx, OWNER, lesson.id)).status,
    ).toBe(LessonStatus.PUBLISHED);
  });

  it('chưa có lượt học thì xoá hẳn, có rồi thì xoá mềm', async () => {
    const { lessonsService, createLesson, addAttempt, lessons } = await setup();
    const fresh = await createLesson();
    await lessonsService.remove(ownerCtx, OWNER, fresh.id);
    expect(lessons.rows.find((row) => row.id === fresh.id)).toBeUndefined();

    const used = await createLesson();
    addAttempt(used.id, 1);
    await lessonsService.remove(ownerCtx, OWNER, used.id);
    expect(
      lessons.rows.find((row) => row.id === used.id)?.deletedAt,
    ).not.toBeNull();
  });

  it('bài đang nằm trong giáo trình → 409 (cả xoá mềm), lưu trữ vẫn được', async () => {
    const {
      lessonsService,
      createLesson,
      addAttempt,
      lessons,
      curriculumItems,
    } = await setup();
    const lesson = await createLesson();
    await lessonsService.publish(ownerCtx, OWNER, lesson.id);
    await curriculumItems.save(
      curriculumItems.create({ curriculumId: 'c1', lessonId: lesson.id }),
    );
    await expect(
      lessonsService.remove(ownerCtx, OWNER, lesson.id),
    ).rejects.toBeInstanceOf(ConflictException);
    addAttempt(lesson.id, 1);
    await expect(
      lessonsService.remove(ownerCtx, OWNER, lesson.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      lessons.rows.find((row) => row.id === lesson.id)?.deletedAt,
    ).toBeNull();

    await expect(
      lessonsService.archive(ownerCtx, OWNER, lesson.id),
    ).resolves.toMatchObject({ status: LessonStatus.ARCHIVED });
  });
});

describe('SaveLessonContentDto', () => {
  const messages = async (body: unknown) =>
    validationMessages(
      await validate(plainToInstance(SaveLessonContentDto, body)),
    );

  it('không cần thời lượng; chặn tên trống, 0 section', async () => {
    expect(
      await messages({
        baseRevision: 1,
        sections: [{ name: 'Từ vựng', rawData: [] }],
      }),
    ).toEqual([]);
    expect(
      await messages({
        baseRevision: 1,
        sections: [{ name: ' ', rawData: [] }],
      }),
    ).toEqual(['Vui lòng nhập tên section']);
    expect(await messages({ baseRevision: 1, sections: [] })).toEqual([
      'Bài học phải có ít nhất 1 section',
    ]);
  });
});
