import {
  LESSON_BLUEPRINT_MAX_MODULES,
  LESSON_BLUEPRINT_MIN_MODULES,
  type LessonModuleInput,
} from '@lang/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { composeDecorators, isPresent } from '../../common/validators/fields';
import {
  CatalogCodeField,
  CatalogDescriptionField,
  CatalogNameField,
  IsActiveField,
} from './catalog-fields';

export class LessonModuleInputDto implements LessonModuleInput {
  /** Có `id` là sửa phần cũ của mẫu, không có là thêm mới. */
  @IsOptional()
  @IsUUID('all', { message: 'Phần không hợp lệ' })
  id?: string;

  @CatalogNameField('Tên phần')
  name: string;

  @CatalogCodeField('Mã phần')
  code: string;

  @CatalogDescriptionField()
  description?: string | null;
}

/** Danh sách phần theo thứ tự hiển thị; thay toàn bộ phần của mẫu. */
const ModulesField = () =>
  composeDecorators(
    IsArray({ message: 'Danh sách phần không hợp lệ' }),
    ArrayMinSize(LESSON_BLUEPRINT_MIN_MODULES, {
      message: 'Mẫu bài học phải có ít nhất 1 phần',
    }),
    ArrayMaxSize(LESSON_BLUEPRINT_MAX_MODULES, {
      message: `Mẫu bài học tối đa ${LESSON_BLUEPRINT_MAX_MODULES} phần`,
    }),
    ValidateNested({ each: true }),
    Type(() => LessonModuleInputDto),
  );

const CategoryIdField = () =>
  IsUUID('all', { message: 'Vui lòng chọn danh mục' });

export class CreateLessonBlueprintDto {
  @CategoryIdField()
  categoryId: string;

  @CatalogCodeField('Mã mẫu bài học')
  code: string;

  @CatalogNameField('Tên mẫu bài học')
  name: string;

  @CatalogDescriptionField()
  description?: string | null;

  @IsOptional()
  @IsActiveField()
  isActive?: boolean;

  @ModulesField()
  modules: LessonModuleInputDto[];
}

/** PATCH: bỏ trường nào thì giữ nguyên; gửi `modules` là thay cả danh sách. */
export class UpdateLessonBlueprintDto {
  @ValidateIf(isPresent)
  @CategoryIdField()
  categoryId?: string;

  @ValidateIf(isPresent)
  @CatalogCodeField('Mã mẫu bài học')
  code?: string;

  @ValidateIf(isPresent)
  @CatalogNameField('Tên mẫu bài học')
  name?: string;

  @CatalogDescriptionField()
  description?: string | null;

  @ValidateIf(isPresent)
  @IsActiveField()
  isActive?: boolean;

  @ValidateIf(isPresent)
  @ModulesField()
  modules?: LessonModuleInputDto[];
}
