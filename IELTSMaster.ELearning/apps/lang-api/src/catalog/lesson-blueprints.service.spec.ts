import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import {
  InMemoryRepository,
  stubQueryBuilderRepository,
} from '../testing/in-memory-repository';
import { Category } from './category.entity';
import {
  CreateLessonBlueprintDto,
  type LessonModuleInputDto,
} from './dto/lesson-blueprint.dto';
import { LessonBlueprint } from './lesson-blueprint.entity';
import { LessonBlueprintsService } from './lesson-blueprints.service';
import { LessonModule } from './lesson-module.entity';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

const vocabulary: LessonModuleInputDto = { name: 'Từ vựng', code: 'TU-VUNG' };
const grammar: LessonModuleInputDto = { name: 'Ngữ pháp', code: 'NGU-PHAP' };

/** `lessonCounts`: dòng đếm bài học theo mẫu mà truy vấn giả trả về. */
function setup(lessonCounts: { blueprintId: string; count: number }[] = []) {
  const timestamps = () => ({ updatedAt: new Date() });
  const categories = new InMemoryRepository<Category>(timestamps);
  const blueprints = new InMemoryRepository<LessonBlueprint>(timestamps);
  const modules = new InMemoryRepository<LessonModule>(timestamps);
  const dataSource = new InMemoryDataSource()
    .register(Category, categories)
    .register(LessonBlueprint, blueprints)
    .register(LessonModule, modules);
  const service = new LessonBlueprintsService(
    dataSource.asDataSource(),
    blueprints.asRepository(),
    categories.asRepository(),
    modules.asRepository(),
    stubQueryBuilderRepository(lessonCounts),
  );

  const addCategory = async (
    tenantId: string | null,
    code: string,
    isActive = true,
  ) =>
    categories.save(
      categories.create({
        tenantId,
        code,
        name: code,
        sortOrder: 0,
        isActive,
      }),
    );

  return { service, blueprints, modules, categories, addCategory };
}

describe('LessonBlueprintsService', () => {
  it('tenant tạo mẫu trong danh mục hệ thống hoặc của mình; phần theo thứ tự gửi lên', async () => {
    const { service, addCategory } = setup();
    const system = await addCategory(null, 'JA');
    const own = await addCategory(TENANT_A, 'KO');

    const minna = await service.create(TENANT_A, 'a', {
      categoryId: system.id,
      code: 'MINNA',
      name: 'Minna no Nihongo – 1 bài',
      modules: [grammar, vocabulary],
    });
    expect(minna).toMatchObject({
      scope: 'tenant',
      category: { id: system.id, scope: 'system' },
      isActive: true,
      description: null,
    });
    expect(
      minna.modules.map((module) => [module.code, module.sortOrder]),
    ).toEqual([
      ['NGU-PHAP', 0],
      ['TU-VUNG', 1],
    ]);

    await expect(
      service.create(TENANT_A, 'a', {
        categoryId: own.id,
        code: 'SOGANG',
        name: 'Sogang',
        modules: [vocabulary],
      }),
    ).resolves.toMatchObject({ category: { scope: 'tenant' } });
  });

  it('chặn danh mục không thuộc phạm vi, danh mục ngừng dùng, mã phần trùng, mã mẫu trùng', async () => {
    const { service, addCategory, blueprints } = setup();
    const system = await addCategory(null, 'JA');
    const tenantB = await addCategory(TENANT_B, 'ZH');
    const inactive = await addCategory(null, 'OLD', false);
    const input = { code: 'TEST', name: 'Test', modules: [vocabulary] };

    await expect(
      service.create(TENANT_A, 'a', { ...input, categoryId: tenantB.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Mẫu hệ thống không thuộc danh mục của tenant.
    await expect(
      service.create(null, 'o', { ...input, categoryId: tenantB.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(TENANT_A, 'a', { ...input, categoryId: inactive.id }),
    ).rejects.toThrow('ngừng dùng');
    await expect(
      service.create(TENANT_A, 'a', {
        ...input,
        categoryId: system.id,
        modules: [vocabulary, { ...grammar, code: 'TU-VUNG' }],
      }),
    ).rejects.toThrow('Mã phần bị trùng: TU-VUNG');

    // Mã unique theo phạm vi: tenant dùng lại được mã của hệ thống.
    await service.create(null, 'o', { ...input, categoryId: system.id });
    await service.create(TENANT_A, 'a', { ...input, categoryId: system.id });
    await expect(
      service.create(TENANT_A, 'a', { ...input, categoryId: system.id }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(blueprints.rows).toHaveLength(2);
  });

  it('lưu phần: giữ id khi sửa, sắp xếp lại, xoá phần bỏ đi, thêm phần mới', async () => {
    const { service, addCategory, modules } = setup();
    const system = await addCategory(null, 'JA');
    const created = await service.create(null, 'o', {
      categoryId: system.id,
      code: 'MINNA',
      name: 'Minna',
      modules: [vocabulary, grammar],
    });
    const [vocabularyRow, grammarRow] = created.modules;

    const updated = await service.update(null, 'editor', created.id, {
      name: 'Minna no Nihongo',
      modules: [
        { ...grammar, id: grammarRow.id, description: 'Mẫu câu' },
        { name: 'Luyện nghe', code: 'NGHE' },
      ],
    });

    expect(updated.name).toBe('Minna no Nihongo');
    expect(
      updated.modules.map((module) => [
        module.code,
        module.sortOrder,
        module.description,
      ]),
    ).toEqual([
      ['NGU-PHAP', 0, 'Mẫu câu'],
      ['NGHE', 1, null],
    ]);
    expect(updated.modules[0].id).toBe(grammarRow.id);
    expect(modules.rows.some((row) => row.id === vocabularyRow.id)).toBe(false);
  });

  it('không nhận phần của mẫu khác; tenant không sửa/xoá mẫu hệ thống (403) hay của tenant khác (404)', async () => {
    const { service, addCategory } = setup();
    const system = await addCategory(null, 'JA');
    const minna = await service.create(null, 'o', {
      categoryId: system.id,
      code: 'MINNA',
      name: 'Minna',
      modules: [vocabulary],
    });
    const own = await service.create(TENANT_A, 'a', {
      categoryId: system.id,
      code: 'RIENG',
      name: 'Riêng',
      modules: [grammar],
    });
    const other = await service.create(TENANT_B, 'b', {
      categoryId: system.id,
      code: 'KHAC',
      name: 'Khác',
      modules: [grammar],
    });

    await expect(
      service.create(TENANT_A, 'a', {
        categoryId: system.id,
        code: 'MOI',
        name: 'Mới',
        modules: [{ ...vocabulary, id: minna.modules[0].id }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update(TENANT_A, 'a', own.id, {
        modules: [{ ...vocabulary, id: minna.modules[0].id }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update(TENANT_A, 'a', minna.id, { name: 'Sửa' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(TENANT_A, minna.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.remove(TENANT_A, other.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await service.remove(TENANT_A, own.id);
    expect((await service.list(TENANT_A)).map((row) => row.code)).toEqual([
      'MINNA',
    ]);
  });

  it('giữ được danh mục cũ đã ngừng dùng, nhưng không đổi sang danh mục ngừng dùng', async () => {
    const { service, addCategory } = setup();
    const ja = await addCategory(TENANT_A, 'JA');
    const old = await addCategory(TENANT_A, 'OLD', false);
    const blueprint = await service.create(TENANT_A, 'a', {
      categoryId: ja.id,
      code: 'MINNA',
      name: 'Minna',
      modules: [vocabulary],
    });

    await expect(
      service.update(TENANT_A, 'a', blueprint.id, { categoryId: old.id }),
    ).rejects.toThrow('ngừng dùng');
    await expect(
      service.update(TENANT_A, 'a', blueprint.id, {
        categoryId: ja.id,
        isActive: false,
      }),
    ).resolves.toMatchObject({ isActive: false, category: { id: ja.id } });
  });

  it('tenant thấy mẫu hệ thống trước rồi của mình, không thấy tenant khác', async () => {
    const { service, addCategory } = setup();
    const system = await addCategory(null, 'JA');
    const tenantB = await addCategory(TENANT_B, 'ZH');
    const create = (owner: string | null, categoryId: string, code: string) =>
      service.create(owner, 'x', {
        categoryId,
        code,
        name: code,
        modules: [vocabulary],
      });
    await create(TENANT_A, system.id, 'A_RIENG');
    await create(null, system.id, 'MINNA');
    await create(TENANT_B, tenantB.id, 'HSK');

    expect(
      (await service.list(TENANT_A)).map((row) => [row.code, row.scope]),
    ).toEqual([
      ['MINNA', 'system'],
      ['A_RIENG', 'tenant'],
    ]);
    expect((await service.list(null)).map((row) => row.code)).toEqual([
      'MINNA',
    ]);
  });

  it('findUsable: chỉ mẫu nhìn thấy được, còn dùng, danh mục còn dùng; phần theo thứ tự', async () => {
    const { service, addCategory, categories } = setup();
    const system = await addCategory(null, 'JA');
    const tenantB = await addCategory(TENANT_B, 'ZH');
    const minna = await service.create(null, 'o', {
      categoryId: system.id,
      code: 'MINNA',
      name: 'Minna',
      modules: [grammar, vocabulary],
    });
    const other = await service.create(TENANT_B, 'b', {
      categoryId: tenantB.id,
      code: 'HSK',
      name: 'HSK',
      modules: [vocabulary],
    });

    const usable = await service.findUsable(TENANT_A, minna.id);
    expect(usable.modules.map((module) => module.code)).toEqual([
      'NGU-PHAP',
      'TU-VUNG',
    ]);
    await expect(service.findUsable(TENANT_A, other.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await service.update(null, 'o', minna.id, { isActive: false });
    await expect(service.findUsable(TENANT_A, minna.id)).rejects.toThrow(
      'Mẫu bài học đã ngừng dùng, hãy chọn mẫu khác',
    );

    await service.update(null, 'o', minna.id, { isActive: true });
    await categories.update(system.id, { isActive: false });
    await expect(service.findUsable(TENANT_A, minna.id)).rejects.toThrow(
      'Danh mục của mẫu bài học đã ngừng dùng',
    );
  });

  it('kèm số bài học dùng mẫu (lessonCount)', async () => {
    const counts: { blueprintId: string; count: number }[] = [];
    const { service, addCategory } = setup(counts);
    const system = await addCategory(null, 'JA');
    const minna = await service.create(null, 'o', {
      categoryId: system.id,
      code: 'MINNA',
      name: 'Minna',
      modules: [vocabulary],
    });
    expect(minna.lessonCount).toBe(0);

    counts.push({ blueprintId: minna.id, count: 3 });
    expect((await service.list(TENANT_A))[0].lessonCount).toBe(3);
  });
});

describe('CreateLessonBlueprintDto', () => {
  async function errors(body: object): Promise<string[]> {
    const dto = plainToInstance(CreateLessonBlueprintDto, body);
    const result = await validate(dto);
    const messages = (items: typeof result): string[] =>
      items.flatMap((item) => [
        ...Object.values(item.constraints ?? {}),
        ...messages(item.children ?? []),
      ]);
    return messages(result);
  }

  const valid = {
    categoryId: '4b0e3d9c-5a41-4a57-9d6a-2a7f3c8b1e20',
    code: ' minna ',
    name: 'Minna no Nihongo',
    modules: [{ name: 'Từ vựng', code: 'tu-vung' }],
  };

  it('đổi mã sang in hoa, phần không cần thời lượng', async () => {
    const dto = plainToInstance(CreateLessonBlueprintDto, valid);
    expect(await validate(dto)).toEqual([]);
    expect(dto.code).toBe('MINNA');
    expect(dto.modules[0].code).toBe('TU-VUNG');
  });

  it('bắt buộc ít nhất 1 phần, mã đúng định dạng', async () => {
    expect(await errors({ ...valid, modules: [] })).toEqual([
      'Mẫu bài học phải có ít nhất 1 phần',
    ]);
    expect(
      await errors({
        ...valid,
        modules: [{ name: 'Từ vựng', code: 'TỪ VỰNG' }],
      }),
    ).toEqual([expect.stringContaining('chữ in hoa không dấu')]);
  });
});
