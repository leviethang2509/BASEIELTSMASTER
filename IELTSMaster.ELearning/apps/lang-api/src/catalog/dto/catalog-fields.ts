import {
  CATALOG_CODE_MAX_LENGTH,
  CATALOG_CODE_PATTERN,
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  normalizeCatalogCode,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { trimString, trimToNull } from '../../common/transforms';
import { composeDecorators } from '../../common/validators/fields';

const toCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeCatalogCode(value) : value;

/** Mã danh mục/loại đề/module; tự đổi sang in hoa. */
export const CatalogCodeField = (label: string) =>
  composeDecorators(
    Transform(toCode),
    IsString({ message: `${label} không hợp lệ` }),
    IsNotEmpty({ message: `Vui lòng nhập ${label.toLowerCase()}` }),
    MaxLength(CATALOG_CODE_MAX_LENGTH, {
      message: `${label} tối đa ${CATALOG_CODE_MAX_LENGTH} ký tự`,
    }),
    Matches(CATALOG_CODE_PATTERN, {
      message: `${label} chỉ gồm chữ in hoa không dấu, số và dấu "-" hoặc "_" ở giữa`,
    }),
  );

export const CatalogNameField = (label: string) =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: `${label} không hợp lệ` }),
    IsNotEmpty({ message: `Vui lòng nhập ${label.toLowerCase()}` }),
    MaxLength(CATALOG_NAME_MAX_LENGTH, {
      message: `${label} tối đa ${CATALOG_NAME_MAX_LENGTH} ký tự`,
    }),
  );

/** Tuỳ chọn; chuỗi rỗng thành `null`. */
export const CatalogDescriptionField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(CATALOG_DESCRIPTION_MAX_LENGTH, {
      message: `Mô tả tối đa ${CATALOG_DESCRIPTION_MAX_LENGTH} ký tự`,
    }),
  );

export const IsActiveField = () =>
  IsBoolean({ message: 'Trạng thái sử dụng không hợp lệ' });
