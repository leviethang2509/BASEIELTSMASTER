import {
  SERVICE_PLAN_CODE_MAX_LENGTH,
  SERVICE_PLAN_CODE_PATTERN,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { trimString, trimToNull } from '../../../common/transforms';
import {
  composeDecorators,
  isPresent,
} from '../../../common/validators/fields';

const MAX_MEMBERS_LIMIT = 1_000_000;
const MAX_PRICE = 9_999_999_999.99;

const toCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const PlanName = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Tên gói không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập tên gói' }),
    MaxLength(100, { message: 'Tên gói tối đa 100 ký tự' }),
  );

const MaxMembers = () =>
  composeDecorators(
    IsInt({ message: 'Số thành viên tối đa phải là số nguyên' }),
    Min(1, { message: 'Số thành viên tối đa phải lớn hơn 0' }),
    Max(MAX_MEMBERS_LIMIT, {
      message: `Số thành viên tối đa không quá ${MAX_MEMBERS_LIMIT.toLocaleString('vi-VN')}`,
    }),
  );

/** Tuỳ chọn, `null` để bỏ giá. */
const Price = () =>
  composeDecorators(
    IsOptional(),
    IsNumber(
      { maxDecimalPlaces: 2 },
      { message: 'Giá phải là số, tối đa 2 chữ số thập phân' },
    ),
    Min(0, { message: 'Giá không được âm' }),
    Max(MAX_PRICE, { message: 'Giá quá lớn' }),
  );

const Description = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(2000, { message: 'Mô tả tối đa 2000 ký tự' }),
  );

const IsActive = () =>
  IsBoolean({ message: 'Trạng thái áp dụng không hợp lệ' });

const SortOrder = () =>
  composeDecorators(
    IsInt({ message: 'Thứ tự phải là số nguyên' }),
    Min(0, { message: 'Thứ tự không được âm' }),
    Max(10_000, { message: 'Thứ tự tối đa 10000' }),
  );

export class CreatePlanDto {
  @Transform(toCode)
  @IsString({ message: 'Mã gói không hợp lệ' })
  @Length(2, SERVICE_PLAN_CODE_MAX_LENGTH, {
    message: `Mã gói phải từ 2 đến ${SERVICE_PLAN_CODE_MAX_LENGTH} ký tự`,
  })
  @Matches(SERVICE_PLAN_CODE_PATTERN, {
    message:
      'Mã gói chỉ gồm chữ thường không dấu, số và dấu "-" hoặc "_" ở giữa',
  })
  code: string;

  @PlanName()
  name: string;

  @MaxMembers()
  maxMembers: number;

  @Price()
  price?: number | null;

  @Description()
  description?: string | null;

  @IsOptional()
  @IsActive()
  isActive?: boolean;

  @IsOptional()
  @SortOrder()
  sortOrder?: number;
}

/** PATCH: không đổi được `code`; bỏ trường nào thì giữ nguyên. */
export class UpdatePlanDto {
  @ValidateIf(isPresent)
  @PlanName()
  name?: string;

  @ValidateIf(isPresent)
  @MaxMembers()
  maxMembers?: number;

  @Price()
  price?: number | null;

  @Description()
  description?: string | null;

  @ValidateIf(isPresent)
  @IsActive()
  isActive?: boolean;

  @ValidateIf(isPresent)
  @SortOrder()
  sortOrder?: number;
}
