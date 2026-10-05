import { CategoryColor, CategoryIconName } from '@lang/shared';
import { IsIn, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { composeDecorators, isPresent } from '../../common/validators/fields';
import {
  CatalogCodeField,
  CatalogDescriptionField,
  CatalogNameField,
  IsActiveField,
} from './catalog-fields';

const IconField = () =>
  IsIn(Object.values(CategoryIconName), { message: 'Biểu tượng không hợp lệ' });

const ColorField = () =>
  IsIn(Object.values(CategoryColor), { message: 'Màu không hợp lệ' });

const SortOrderField = () =>
  composeDecorators(
    IsInt({ message: 'Thứ tự phải là số nguyên' }),
    Min(0, { message: 'Thứ tự không được âm' }),
    Max(10_000, { message: 'Thứ tự tối đa 10000' }),
  );

export class CreateCategoryDto {
  @CatalogCodeField('Mã danh mục')
  code: string;

  @CatalogNameField('Tên danh mục')
  name: string;

  @CatalogDescriptionField()
  description?: string | null;

  @IsOptional()
  @IconField()
  icon?: CategoryIconName;

  @IsOptional()
  @ColorField()
  color?: CategoryColor;

  @IsOptional()
  @SortOrderField()
  sortOrder?: number;

  @IsOptional()
  @IsActiveField()
  isActive?: boolean;
}

/** PATCH: bỏ trường nào thì giữ nguyên. */
export class UpdateCategoryDto {
  @ValidateIf(isPresent)
  @CatalogCodeField('Mã danh mục')
  code?: string;

  @ValidateIf(isPresent)
  @CatalogNameField('Tên danh mục')
  name?: string;

  @CatalogDescriptionField()
  description?: string | null;

  @ValidateIf(isPresent)
  @IconField()
  icon?: CategoryIconName;

  @ValidateIf(isPresent)
  @ColorField()
  color?: CategoryColor;

  @ValidateIf(isPresent)
  @SortOrderField()
  sortOrder?: number;

  @ValidateIf(isPresent)
  @IsActiveField()
  isActive?: boolean;
}
