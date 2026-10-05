import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import {
  InMemoryRepository,
  stubQueryBuilderRepository,
} from '../testing/in-memory-repository';
import {
  CreateExamBlueprintDto,
  type ExamModuleInputDto,
} from './dto/exam-blueprint.dto';
import { ExamBlueprint } from './exam-blueprint.entity';
import { ExamBlueprintsService } from './exam-blueprints.service';
import { Category } from './category.entity';
import { ExamModule } from './exam-module.entity';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

const listening: ExamModuleInputDto = {
  name: 'Listening',
  code: 'LISTENING',
  referenceDurationMinutes: 30,
};
const reading: ExamModuleInputDto = {
  name: 'Reading',
  code: 'READING',
  referenceDurationMinutes: 60,
};

function setup() {
  const timestamps = () => ({ updatedAt: new Date() });
  const categories = new InMemoryRepository<Category>(timestamps);
  const blueprints = new InMemoryRepository<ExamBlueprint>(timestamps);
  const modules = new InMemoryRepository<ExamModule>(timestamps);
  const dataSource = new InMemoryDataSource()
    .register(Category, categories)
    .register(ExamBlueprint, blueprints)
    .register(ExamModule, modules);
  const service = new ExamBlueprintsService(
    dataSource.asDataSource(),
    blueprints.asRepository(),
    categories.asRepository(),
    modules.asRepository(),
    stubQueryBuilderRepository(),
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

  return { service, blueprints, modules, addCategory };
}

describe('ExamBlueprintsService', () => {
  it('tenant tạo loại đề trong danh mục hệ thống hoặc của mình; module theo thứ tự gửi lên', async () => {
    const { service, addCategory } = setup();
    const system = await addCategory(null, 'EN');
    const own = await addCategory(TENANT_A, 'KO');

    const ielts = await service.create(TENANT_A, 'a', {
      categoryId: system.id,
      code: 'IELTS',
      name: 'IELTS nội bộ',
      modules: [reading, listening],
    });
    expect(ielts).toMatchObject({
      scope: 'tenant',
      category: { id: system.id, scope: 'system' },
      isActive: true,
      description: null,
    });
    expect(
      ielts.modules.map((module) => [module.code, module.sortOrder]),
    ).toEqual([
      ['READING', 0],
      ['LISTENING', 1],
    ]);

    await expect(
      service.create(TENANT_A, 'a', {
        categoryId: own.id,
        code: 'TOPIK',
        name: 'TOPIK',
        modules: [listening],
      }),
    ).resolves.toMatchObject({ category: { scope: 'tenant' } });
  });

  it('chặn danh mục không thuộc phạm vi, danh mục ngừng dùng, mã trùng', async () => {
    const { service, addCategory, blueprints } = setup();
    const system = await addCategory(null, 'EN');
    const tenantB = await addCategory(TENANT_B, 'ZH');
    const inactive = await addCategory(null, 'OLD', false);
    const input = {
      code: 'TEST',
      name: 'Test',
      modules: [listening],
    };

    await expect(
      service.create(TENANT_A, 'a', { ...input, categoryId: tenantB.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Loại đề hệ thống không thuộc danh mục của tenant.
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
        modules: [listening, { ...reading, code: 'LISTENING' }],
      }),
    ).rejects.toThrow('Mã module bị trùng: LISTENING');

    await service.create(null, 'o', { ...input, categoryId: system.id });
    await service.create(TENANT_A, 'a', { ...input, categoryId: system.id });
    await expect(
      service.create(TENANT_A, 'a', { ...input, categoryId: system.id }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(blueprints.rows).toHaveLength(2);
  });

  it('lưu module: giữ id khi sửa, sắp xếp lại, xoá module bỏ đi, thêm module mới', async () => {
    const { service, addCategory, modules } = setup();
    const system = await addCategory(null, 'EN');
    const created = await service.create(null, 'o', {
      categoryId: system.id,
      code: 'IELTS',
      name: 'IELTS',
      modules: [listening, reading],
    });
    const [listeningRow, readingRow] = created.modules;

    const updated = await service.update(null, 'editor', created.id, {
      name: 'IELTS Academic',
      modules: [
        { ...reading, id: readingRow.id, referenceDurationMinutes: 65 },
        { name: 'Writing', code: 'WRITING', referenceDurationMinutes: 60 },
      ],
    });

    expect(updated.name).toBe('IELTS Academic');
    expect(
      updated.modules.map((module) => [
        module.code,
        module.sortOrder,
        module.referenceDurationMinutes,
      ]),
    ).toEqual([
      ['READING', 0, 65],
      ['WRITING', 1, 60],
    ]);
    expect(updated.modules[0].id).toBe(readingRow.id);
    expect(modules.rows.some((row) => row.id === listeningRow.id)).toBe(false);
  });

  it('không nhận module của loại đề khác; tenant không sửa loại đề hệ thống', async () => {
    const { service, addCategory } = setup();
    const system = await addCategory(null, 'EN');
    const toeic = await service.create(null, 'o', {
      categoryId: system.id,
      code: 'TOEIC',
      name: 'TOEIC',
      modules: [listening],
    });
    const own = await service.create(TENANT_A, 'a', {
      categoryId: system.id,
      code: 'MOCK',
      name: 'Mock',
      modules: [reading],
    });

    await expect(
      service.update(TENANT_A, 'a', own.id, {
        modules: [{ ...listening, id: toeic.modules[0].id }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update(TENANT_A, 'a', toeic.id, { name: 'Sửa' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(TENANT_A, toeic.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('giữ được danh mục cũ đã ngừng dùng, nhưng không đổi sang danh mục ngừng dùng', async () => {
    const { service, addCategory } = setup();
    const en = await addCategory(TENANT_A, 'EN');
    const old = await addCategory(TENANT_A, 'OLD', false);
    const blueprint = await service.create(TENANT_A, 'a', {
      categoryId: en.id,
      code: 'MOCK',
      name: 'Mock',
      modules: [reading],
    });

    await expect(
      service.update(TENANT_A, 'a', blueprint.id, { categoryId: old.id }),
    ).rejects.toThrow('ngừng dùng');
    await expect(
      service.update(TENANT_A, 'a', blueprint.id, {
        categoryId: en.id,
        isActive: false,
      }),
    ).resolves.toMatchObject({ isActive: false, category: { id: en.id } });
  });

  it('tenant thấy loại đề hệ thống trước rồi của mình, không thấy tenant khác', async () => {
    const { service, addCategory } = setup();
    const system = await addCategory(null, 'EN');
    const tenantB = await addCategory(TENANT_B, 'ZH');
    const create = (owner: string | null, categoryId: string, code: string) =>
      service.create(owner, 'x', {
        categoryId,
        code,
        name: code,
        modules: [listening],
      });
    await create(TENANT_A, system.id, 'A_MOCK');
    await create(null, system.id, 'TOEIC');
    await create(TENANT_B, tenantB.id, 'HSK');

    const list = await service.list(TENANT_A);
    expect(list.map((row) => [row.code, row.scope])).toEqual([
      ['TOEIC', 'system'],
      ['A_MOCK', 'tenant'],
    ]);
    expect((await service.list(null)).map((row) => row.code)).toEqual([
      'TOEIC',
    ]);
  });
});

describe('CreateExamBlueprintDto', () => {
  async function errors(body: object): Promise<string[]> {
    const dto = plainToInstance(CreateExamBlueprintDto, body);
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
    code: ' ielts ',
    name: 'IELTS',
    modules: [
      { name: 'Listening', code: 'listening', referenceDurationMinutes: 30 },
    ],
  };

  it('đổi mã sang in hoa', async () => {
    const dto = plainToInstance(CreateExamBlueprintDto, valid);
    expect(await validate(dto)).toEqual([]);
    expect(dto.code).toBe('IELTS');
    expect(dto.modules[0].code).toBe('LISTENING');
  });

  it.each([0, 47, 185, '30'])(
    'thời lượng %p không hợp lệ',
    async (referenceDurationMinutes) => {
      expect(
        await errors({
          ...valid,
          modules: [{ ...valid.modules[0], referenceDurationMinutes }],
        }),
      ).toEqual([expect.stringContaining('bội số của 5')]);
    },
  );

  it('bắt buộc ít nhất 1 module, mã đúng định dạng', async () => {
    expect(await errors({ ...valid, modules: [] })).toEqual([
      'Loại đề phải có ít nhất 1 module',
    ]);
    expect(await errors({ ...valid, code: 'IELTS ACADEMIC' })).toEqual([
      expect.stringContaining('chữ in hoa không dấu'),
    ]);
  });
});
