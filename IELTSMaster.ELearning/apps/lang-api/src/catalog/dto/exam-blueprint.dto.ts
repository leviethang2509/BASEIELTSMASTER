import {
  DURATION_MAX_MINUTES,
  EXAM_BLUEPRINT_MAX_MODULES,
  EXAM_BLUEPRINT_MIN_MODULES,
  isValidDurationMinutes,
  type ExamModuleInput,
} from '@lang/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  Validate,
  ValidateIf,
  ValidateNested,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';
import { composeDecorators, isPresent } from '../../common/validators/fields';
import {
  CatalogCodeField,
  CatalogDescriptionField,
  CatalogNameField,
  IsActiveField,
} from './catalog-fields';

@ValidatorConstraint({ name: 'durationMinutes' })
class DurationMinutesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidDurationMinutes(value);
  }

  defaultMessage(): string {
    return `Thời lượng tham khảo phải là bội số của 5, từ 5 đến ${DURATION_MAX_MINUTES} phút`;
  }
}

export class ExamModuleInputDto implements ExamModuleInput {
  /** Có `id` là sửa module cũ của loại đề, không có là thêm mới. */
  @IsOptional()
  @IsUUID('all', { message: 'Module không hợp lệ' })
  id?: string;

  @CatalogNameField('Tên module')
  name: string;

  @CatalogCodeField('Mã module')
  code: string;

  @Validate(DurationMinutesConstraint)
  referenceDurationMinutes: number;

  @CatalogDescriptionField()
  description?: string | null;
}

/** Danh sách module theo thứ tự hiển thị; thay toàn bộ module của loại đề. */
const ModulesField = () =>
  composeDecorators(
    IsArray({ message: 'Danh sách module không hợp lệ' }),
    ArrayMinSize(EXAM_BLUEPRINT_MIN_MODULES, {
      message: 'Loại đề phải có ít nhất 1 module',
    }),
    ArrayMaxSize(EXAM_BLUEPRINT_MAX_MODULES, {
      message: `Loại đề tối đa ${EXAM_BLUEPRINT_MAX_MODULES} module`,
    }),
    ValidateNested({ each: true }),
    Type(() => ExamModuleInputDto),
  );

const CategoryIdField = () =>
  IsUUID('all', { message: 'Vui lòng chọn danh mục' });

export class CreateExamBlueprintDto {
  @CategoryIdField()
  categoryId: string;

  @CatalogCodeField('Mã loại đề')
  code: string;

  @CatalogNameField('Tên loại đề')
  name: string;

  @CatalogDescriptionField()
  description?: string | null;

  @IsOptional()
  @IsActiveField()
  isActive?: boolean;

  @ModulesField()
  modules: ExamModuleInputDto[];
}

/** PATCH: bỏ trường nào thì giữ nguyên; gửi `modules` là thay cả danh sách. */
export class UpdateExamBlueprintDto {
  @ValidateIf(isPresent)
  @CategoryIdField()
  categoryId?: string;

  @ValidateIf(isPresent)
  @CatalogCodeField('Mã loại đề')
  code?: string;

  @ValidateIf(isPresent)
  @CatalogNameField('Tên loại đề')
  name?: string;

  @CatalogDescriptionField()
  description?: string | null;

  @ValidateIf(isPresent)
  @IsActiveField()
  isActive?: boolean;

  @ValidateIf(isPresent)
  @ModulesField()
  modules?: ExamModuleInputDto[];
}
