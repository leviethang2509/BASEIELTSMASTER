import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseStatus,
  CurriculumItemLabel,
  CurriculumItemType,
  ExamStatus,
  TenantRole,
  TenantStatus,
  type CurriculumItemInput,
} from '@lang/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { EntityManager } from 'typeorm';
import { Category } from '../catalog/category.entity';
import { validationMessages } from '../common/validation';
import { ClassItem } from '../classrooms/class-item.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { Exam } from '../exams/exam.entity';
import { Lesson } from '../lessons/lesson.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { User } from '../users/user.entity';
import { assertExamNotInUse, assertLessonNotInUse } from './content-usage';
import { CourseCurriculum } from './course-curriculum.entity';
import { Course } from './course.entity';
import { CoursesService } from './courses.service';
import { CurriculaService, cloneCurriculumName } from './curricula.service';
import { CurriculumGroup } from './curriculum-group.entity';
import { CurriculumItem } from './curriculum-item.entity';
import { Curriculum } from './curriculum.entity';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { SaveCurriculumItemsDto } from './dto/curriculum.dto';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';
const OWNER = 'user-owner';
const TEACHER = 'user-teacher';
const OTHER_TEACHER = 'user-teacher-2';

const context = (roles: TenantRole[], tenantId = TENANT): TenantContext => ({
  tenantId,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId: 'membership',
  roles,
  permissions: [],
});
const ownerCtx = context([TenantRole.TENANT_OWNER]);
const teacherCtx = context([TenantRole.TEACHER]);

function setup() {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const curricula = new InMemoryRepository<Curriculum>(() => ({
    ...timestamps(),
    clonedFromId: null,
  }));
  const groups = new InMemoryRepository<CurriculumGroup>();
  const items = new InMemoryRepository<CurriculumItem>();
  const links = new InMemoryRepository<CourseCurriculum>(
    () => ({}),
    ['courseId', 'curriculumId'],
  );
  const courses = new InMemoryRepository<Course>(timestamps);
  const lessons = new InMemoryRepository<Lesson>(() => ({ deletedAt: null }));
  const exams = new InMemoryRepository<Exam>(() => ({ deletedAt: null }));
  const users = new InMemoryRepository<User>(timestamps);
  const categories = new InMemoryRepository<Category>(timestamps);
  const classrooms = new InMemoryRepository<Classroom>(timestamps);

  const dataSource = new InMemoryDataSource()
    .register(Curriculum, curricula)
    .register(CurriculumGroup, groups)
    .register(CurriculumItem, items)
    .register(ClassItem, new InMemoryRepository<ClassItem>())
    .register(CourseCurriculum, links)
    .register(Course, courses)
    .register(Classroom, classrooms)
    .register(Lesson, lessons)
    .register(Exam, exams)
    .asDataSource();
  const curriculaService = new CurriculaService(
    dataSource,
    curricula.asRepository(),
    groups.asRepository(),
    items.asRepository(),
    links.asRepository(),
    courses.asRepository(),
    lessons.asRepository(),
    exams.asRepository(),
    users.asRepository(),
  );
  const coursesService = new CoursesService(
    dataSource,
    curriculaService,
    courses.asRepository(),
    links.asRepository(),
    curricula.asRepository(),
    categories.asRepository(),
  );

  const addLesson = async (
    title: string,
    status: ExamStatus = ExamStatus.PUBLISHED,
    tenantId = TENANT,
  ) => lessons.save(lessons.create({ tenantId, title, status }));
  const addExam = async (
    title: string,
    status: ExamStatus = ExamStatus.PUBLISHED,
  ) => exams.save(exams.create({ tenantId: TENANT, title, status }));

  return {
    dataSource,
    curriculaService,
    coursesService,
    curricula,
    groups,
    items,
    links,
    courses,
    lessons,
    exams,
    categories,
    addLesson,
    addExam,
  };
}

const lessonItem = (
  contentId: string,
  extra: Partial<CurriculumItemInput> = {},
): CurriculumItemInput => ({
  itemType: CurriculumItemType.LESSON,
  contentId,
  label: CurriculumItemLabel.LESSON,
  ...extra,
});
const examItem = (
  contentId: string,
  label: CurriculumItemLabel = CurriculumItemLabel.QUIZ,
): CurriculumItemInput => ({
  itemType: CurriculumItemType.EXAM,
  contentId,
  label,
});

const saveBody = (body: object) =>
  plainToInstance(SaveCurriculumItemsDto, body);

describe('CurriculaService: giáo trình N5 3 chương', () => {
  it('lưu chương + mục theo thứ tự, giữ id, tăng revision; baseRevision cũ → 409', async () => {
    const { curriculaService, addLesson, addExam } = setup();
    const [b1, b2, b3, b4] = await Promise.all(
      ['Bài 1', 'Bài 2', 'Bài 3', 'Bài 4'].map((title) => addLesson(title)),
    );
    const [k1, k2, final] = await Promise.all(
      ['Kiểm tra 1', 'Kiểm tra 2', 'Thi cuối khoá'].map((title) =>
        addExam(title),
      ),
    );
    const created = await curriculaService.create(teacherCtx, TEACHER, {
      name: 'Tiếng Nhật N5',
    });
    expect(created).toMatchObject({ revision: 1, canEdit: true, groups: [] });

    const saved = await curriculaService.saveItems(
      teacherCtx,
      TEACHER,
      created.id,
      saveBody({
        baseRevision: 1,
        ungrouped: [],
        groups: [
          {
            title: 'Chương 1',
            items: [
              lessonItem(b1.id),
              lessonItem(b2.id, {
                label: CurriculumItemLabel.HOMEWORK,
                title: 'Bài tập bài 2',
                note: 'Giao về nhà',
              }),
              examItem(k1.id),
            ],
          },
          {
            title: 'Chương 2',
            items: [lessonItem(b3.id), lessonItem(b4.id), examItem(k2.id)],
          },
          {
            title: 'Chương 3',
            items: [examItem(final.id, CurriculumItemLabel.FINAL)],
          },
        ],
      }),
    );
    expect(saved.revision).toBe(2);
    expect(saved.groupCount).toBe(3);
    expect(saved.itemCount).toBe(7);
    expect(
      saved.groups.map((group) => [
        group.title,
        group.items.map((item) => item.title ?? item.content.title),
      ]),
    ).toEqual([
      ['Chương 1', ['Bài 1', 'Bài tập bài 2', 'Kiểm tra 1']],
      ['Chương 2', ['Bài 3', 'Bài 4', 'Kiểm tra 2']],
      ['Chương 3', ['Thi cuối khoá']],
    ]);
    expect(saved.groups[0].items[1]).toMatchObject({
      label: CurriculumItemLabel.HOMEWORK,
      note: 'Giao về nhà',
    });

    // Chuyển Bài 1 ra "Chưa xếp chương", bỏ chương 3: id mục/chương giữ nguyên.
    const [chapter1, chapter2] = saved.groups;
    const keep = (item: (typeof chapter1.items)[number]) => ({
      id: item.id,
      itemType: item.itemType,
      contentId: item.content.id,
      label: item.label,
      title: item.title,
      note: item.note,
    });
    const moved = await curriculaService.saveItems(
      teacherCtx,
      TEACHER,
      created.id,
      saveBody({
        baseRevision: 2,
        ungrouped: [keep(chapter1.items[0])],
        groups: [
          {
            id: chapter2.id,
            title: 'Chương 2 (mới)',
            items: chapter2.items.map(keep),
          },
          {
            id: chapter1.id,
            title: chapter1.title,
            items: chapter1.items.slice(1).map(keep),
          },
        ],
      }),
    );
    expect(moved.revision).toBe(3);
    expect(moved.ungrouped.map((item) => item.id)).toEqual([
      chapter1.items[0].id,
    ]);
    expect(moved.groups.map((group) => group.id)).toEqual([
      chapter2.id,
      chapter1.id,
    ]);
    expect(moved.groups[0].title).toBe('Chương 2 (mới)');
    expect(moved.itemCount).toBe(6);

    await expect(
      curriculaService.saveItems(
        teacherCtx,
        TEACHER,
        created.id,
        saveBody({ baseRevision: 2, ungrouped: [], groups: [] }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('trùng bài/đề, nhãn sai loại, bài nháp, bài tenant khác, id lạ → 400', async () => {
    const { curriculaService, addLesson, addExam } = setup();
    const lesson = await addLesson('Bài 1');
    const exam = await addExam('Kiểm tra 1');
    const draft = await addLesson('Nháp', ExamStatus.DRAFT);
    const foreign = await addLesson('Khác', ExamStatus.PUBLISHED, OTHER_TENANT);
    const { id } = await curriculaService.create(ownerCtx, OWNER, {
      name: 'N5',
    });
    const save = (ungrouped: object[], groups: object[] = []) =>
      curriculaService.saveItems(
        ownerCtx,
        OWNER,
        id,
        saveBody({ baseRevision: 1, ungrouped, groups }),
      );

    for (const bad of [
      [lessonItem(lesson.id), lessonItem(lesson.id)],
      [examItem(exam.id), examItem(exam.id, CurriculumItemLabel.FINAL)],
      [lessonItem(lesson.id, { label: CurriculumItemLabel.QUIZ })],
      [lessonItem(draft.id)],
      [lessonItem(foreign.id)],
      [lessonItem(exam.id)],
      [
        {
          ...lessonItem(lesson.id),
          id: '8f1d5c0e-7a8b-4c2d-9e0f-1a2b3c4d5e6f',
        },
      ],
    ]) {
      await expect(save(bad)).rejects.toBeInstanceOf(BadRequestException);
    }
    // Trùng giữa "Chưa xếp chương" và một chương cũng bị chặn.
    await expect(
      save(
        [lessonItem(lesson.id)],
        [{ title: 'C1', items: [lessonItem(lesson.id)] }],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      save([lessonItem(lesson.id), examItem(exam.id)]),
    ).resolves.toMatchObject({ itemCount: 2 });
  });

  it('bài/đề đã lưu trữ: mục sẵn có giữ được (hiện trạng thái), không thêm mới được', async () => {
    const { curriculaService, addLesson, lessons } = setup();
    const kept = await addLesson('Bài cũ');
    const later = await addLesson('Bài mới');
    const { id } = await curriculaService.create(ownerCtx, OWNER, {
      name: 'N5',
    });
    await curriculaService.saveItems(
      ownerCtx,
      OWNER,
      id,
      saveBody({
        baseRevision: 1,
        ungrouped: [lessonItem(kept.id)],
        groups: [],
      }),
    );
    await lessons.update(kept.id, { status: ExamStatus.ARCHIVED });
    await lessons.update(later.id, { status: ExamStatus.ARCHIVED });

    const detail = await curriculaService.saveItems(
      ownerCtx,
      OWNER,
      id,
      saveBody({
        baseRevision: 2,
        ungrouped: [lessonItem(kept.id)],
        groups: [],
      }),
    );
    expect(detail.ungrouped[0].content.status).toBe(ExamStatus.ARCHIVED);
    await expect(
      curriculaService.saveItems(
        ownerCtx,
        OWNER,
        id,
        saveBody({
          baseRevision: 3,
          ungrouped: [lessonItem(kept.id), lessonItem(later.id)],
          groups: [],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CurriculaService: quyền, nhân bản, xoá', () => {
  it('Teacher sửa/lưu mục/xoá giáo trình người khác → 403; Owner sửa được mọi giáo trình', async () => {
    const { curriculaService } = setup();
    const own = await curriculaService.create(teacherCtx, TEACHER, {
      name: 'Của GV1',
    });

    const otherView = await curriculaService.getDetail(
      teacherCtx,
      OTHER_TEACHER,
      own.id,
    );
    expect(otherView.canEdit).toBe(false);
    expect(otherView.creator).toBeNull(); // user giả không có trong bảng users
    for (const attempt of [
      () =>
        curriculaService.update(teacherCtx, OTHER_TEACHER, own.id, {
          name: 'Sửa',
        }),
      () =>
        curriculaService.saveItems(
          teacherCtx,
          OTHER_TEACHER,
          own.id,
          saveBody({ baseRevision: 1, ungrouped: [], groups: [] }),
        ),
      () => curriculaService.remove(teacherCtx, OTHER_TEACHER, own.id),
    ]) {
      await expect(attempt()).rejects.toBeInstanceOf(ForbiddenException);
    }

    await expect(
      curriculaService.update(ownerCtx, OWNER, own.id, { name: 'Owner sửa' }),
    ).resolves.toMatchObject({ name: 'Owner sửa', canEdit: true });
    // Tenant khác coi như không tồn tại.
    await expect(
      curriculaService.getDetail(
        context([TenantRole.TENANT_OWNER], OTHER_TENANT),
        OWNER,
        own.id,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('nhân bản: bản của người nhân bản, chép chương + mục, không chép khoá học đang gắn', async () => {
    const { curriculaService, coursesService, addLesson, addExam, links } =
      setup();
    const lesson = await addLesson('Bài 1');
    const exam = await addExam('Kiểm tra 1');
    const source = await curriculaService.create(teacherCtx, TEACHER, {
      name: 'N5',
      description: 'Giáo trình chuẩn',
    });
    await curriculaService.saveItems(
      teacherCtx,
      TEACHER,
      source.id,
      saveBody({
        baseRevision: 1,
        ungrouped: [lessonItem(lesson.id)],
        groups: [{ title: 'Chương 1', items: [examItem(exam.id)] }],
      }),
    );
    const course = await coursesService.create(ownerCtx, OWNER, {
      code: 'N5',
      name: 'Tiếng Nhật N5',
    });
    await coursesService.attachCurriculum(
      ownerCtx,
      OWNER,
      course.id,
      source.id,
    );

    const copy = await curriculaService.clone(
      teacherCtx,
      OTHER_TEACHER,
      source.id,
    );
    expect(copy).toMatchObject({
      name: 'N5 (bản sao)',
      description: 'Giáo trình chuẩn',
      revision: 1,
      canEdit: true,
      clonedFrom: { id: source.id, name: 'N5' },
      courses: [],
    });
    expect(copy.ungrouped.map((item) => item.content.id)).toEqual([lesson.id]);
    expect(copy.groups).toHaveLength(1);
    expect(copy.groups[0].id).not.toBe(
      (await curriculaService.getDetail(ownerCtx, OWNER, source.id)).groups[0]
        .id,
    );
    expect(copy.groups[0].items[0].content.id).toBe(exam.id);
    expect(links.rows).toHaveLength(1);
    expect(cloneCurriculumName('x'.repeat(200))).toHaveLength(200);
  });

  it('xoá giáo trình đang gắn khoá học → 409; bỏ gắn rồi xoá được (mục xoá theo)', async () => {
    const { curriculaService, coursesService, curricula } = setup();
    const curriculum = await curriculaService.create(ownerCtx, OWNER, {
      name: 'N5',
    });
    const course = await coursesService.create(ownerCtx, OWNER, {
      code: 'N5-SANG',
      name: 'N5 buổi sáng',
    });
    await coursesService.attachCurriculum(
      ownerCtx,
      OWNER,
      course.id,
      curriculum.id,
    );

    await expect(
      curriculaService.remove(ownerCtx, OWNER, curriculum.id),
    ).rejects.toThrow('N5 buổi sáng');
    await coursesService.detachCurriculum(ownerCtx, course.id, curriculum.id);
    await curriculaService.remove(ownerCtx, OWNER, curriculum.id);
    expect(curricula.rows).toHaveLength(0);
  });
});

describe('CoursesService', () => {
  it('tạo khoá học, mã trùng 409, danh mục ngừng dùng/của tenant khác 400, lưu trữ', async () => {
    const { coursesService, categories } = setup();
    const ja = await categories.save(
      categories.create({
        tenantId: null,
        code: 'JA',
        name: 'Tiếng Nhật',
        isActive: true,
      }),
    );
    const off = await categories.save(
      categories.create({
        tenantId: TENANT,
        code: 'OFF',
        name: 'Ngừng',
        isActive: false,
      }),
    );
    const foreign = await categories.save(
      categories.create({
        tenantId: OTHER_TENANT,
        code: 'B',
        name: 'B',
        isActive: true,
      }),
    );

    const course = await coursesService.create(ownerCtx, OWNER, {
      code: 'N5',
      name: 'Tiếng Nhật N5',
      categoryId: ja.id,
      level: 'N5',
      plannedSessions: 24,
    });
    expect(course).toMatchObject({
      code: 'N5',
      status: CourseStatus.ACTIVE,
      category: { id: ja.id },
      plannedSessions: 24,
      curriculumCount: 0,
      curricula: [],
    });
    await expect(
      coursesService.create(ownerCtx, OWNER, { code: 'N5', name: 'Trùng' }),
    ).rejects.toBeInstanceOf(ConflictException);
    for (const categoryId of [off.id, foreign.id]) {
      await expect(
        coursesService.create(ownerCtx, OWNER, {
          code: 'N4',
          name: 'N4',
          categoryId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }

    await expect(
      coursesService.update(ownerCtx, OWNER, course.id, {
        status: CourseStatus.ARCHIVED,
        categoryId: null,
        plannedSessions: null,
      }),
    ).resolves.toMatchObject({
      status: CourseStatus.ARCHIVED,
      category: null,
      plannedSessions: null,
    });
  });

  it('gắn giáo trình vào 2 khoá học; gắn lại 409; xoá khoá học giữ giáo trình', async () => {
    const { coursesService, curriculaService, courses, curricula } = setup();
    const curriculum = await curriculaService.create(teacherCtx, TEACHER, {
      name: 'N5',
    });
    const morning = await coursesService.create(ownerCtx, OWNER, {
      code: 'N5-SANG',
      name: 'N5 sáng',
    });
    const evening = await coursesService.create(ownerCtx, OWNER, {
      code: 'N5-TOI',
      name: 'N5 tối',
    });
    for (const course of [morning, evening]) {
      const detail = await coursesService.attachCurriculum(
        ownerCtx,
        OWNER,
        course.id,
        curriculum.id,
      );
      expect(detail.curricula.map((row) => row.id)).toEqual([curriculum.id]);
      expect(detail.curriculumCount).toBe(1);
    }
    await expect(
      coursesService.attachCurriculum(
        ownerCtx,
        OWNER,
        morning.id,
        curriculum.id,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      (
        await curriculaService.getDetail(teacherCtx, TEACHER, curriculum.id)
      ).courses.map((course) => course.name),
    ).toEqual(['N5 sáng', 'N5 tối']);

    await coursesService.remove(ownerCtx, morning.id);
    expect(courses.rows.map((row) => row.id)).toEqual([evening.id]);
    expect(curricula.rows).toHaveLength(1);
    await expect(
      coursesService.detachCurriculum(ownerCtx, evening.id, 'khong-gan'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('DTO: mã tự in hoa, sai định dạng; số buổi; URL ảnh bìa', async () => {
    const messages = async <T extends object>(cls: new () => T, body: object) =>
      validationMessages(await validate(plainToInstance(cls, body)));
    const dto = plainToInstance(CreateCourseDto, {
      code: ' n5-2026 ',
      name: ' N5 ',
      coverUrl: '',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ code: 'N5-2026', name: 'N5', coverUrl: null });
    expect(
      await messages(CreateCourseDto, {
        code: 'N5 2026',
        name: 'N5',
        plannedSessions: 0,
        coverUrl: 'javascript:alert(1)',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Mã khoá học chỉ gồm'),
        'Số buổi dự kiến tối thiểu là 1',
        'Ảnh bìa phải là URL http(s)',
      ]),
    );
    expect(await messages(UpdateCourseDto, { status: 'deleted' })).toEqual([
      'Trạng thái không hợp lệ',
    ]);
  });
});

describe('Chặn xoá bài học/đề thi đang nằm trong giáo trình', () => {
  it('có mục trỏ tới → 409, không có thì qua', async () => {
    const { dataSource, items } = setup();
    const manager: EntityManager = dataSource.manager;
    await items.save(
      items.create({ curriculumId: 'c', lessonId: 'lesson-1', examId: null }),
    );
    await items.save(
      items.create({ curriculumId: 'c', lessonId: null, examId: 'exam-1' }),
    );
    await expect(
      assertLessonNotInUse(manager, 'lesson-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(assertExamNotInUse(manager, 'exam-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(assertLessonNotInUse(manager, 'lesson-2')).resolves.toBe(
      undefined,
    );
    await expect(assertExamNotInUse(manager, 'exam-2')).resolves.toBe(
      undefined,
    );
  });
});
