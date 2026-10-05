import {
  normalizeEmail,
  RESERVED_TENANT_SLUGS,
  TENANT_SLUG_MAX_LENGTH,
  TENANT_SLUG_MIN_LENGTH,
  TENANT_SLUG_PATTERN,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNotIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { trimString, trimToNull } from '../../common/transforms';

const toSlug = ({ value }: { value: unknown }) => {
  const trimmed = trimToNull({ value });
  return typeof trimmed === 'string' ? trimmed.toLowerCase() : trimmed;
};

const toOptionalEmail = ({ value }: { value: unknown }) => {
  const trimmed = trimToNull({ value });
  return typeof trimmed === 'string' ? normalizeEmail(trimmed) : trimmed;
};

/** Đăng ký tenant (`POST /tenants`) và sửa & gửi lại (`PUT /tenants/:id`). */
export class TenantFormDto {
  @Transform(trimString)
  @IsString({ message: 'Tên trung tâm không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên trung tâm' })
  @MaxLength(150, { message: 'Tên trung tâm tối đa 150 ký tự' })
  name: string;

  /** Để trống: đăng ký dùng slug gợi ý từ tên, gửi lại giữ slug cũ. */
  @IsOptional()
  @Transform(toSlug)
  @IsString({ message: 'Đường dẫn không hợp lệ' })
  @Length(TENANT_SLUG_MIN_LENGTH, TENANT_SLUG_MAX_LENGTH, {
    message: `Đường dẫn phải từ ${TENANT_SLUG_MIN_LENGTH} đến ${TENANT_SLUG_MAX_LENGTH} ký tự`,
  })
  @Matches(TENANT_SLUG_PATTERN, {
    message:
      'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch nối ở giữa',
  })
  @IsNotIn([...RESERVED_TENANT_SLUGS], {
    message: 'Đường dẫn này đã được hệ thống dành riêng',
  })
  slug?: string | null;

  @IsUUID('all', { message: 'Vui lòng chọn gói dịch vụ' })
  planId: string;

  /** URL logo đã upload qua `POST /me/branding/upload`; trống thì dùng chữ cái đầu của tên. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Logo không hợp lệ' })
  @MaxLength(1024, { message: 'Đường dẫn logo quá dài' })
  @Matches(/^https?:\/\/\S+$/, { message: 'Logo phải là URL http(s)' })
  logoUrl?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Mô tả không hợp lệ' })
  @MaxLength(2000, { message: 'Mô tả tối đa 2000 ký tự' })
  description?: string | null;

  @IsOptional()
  @Transform(toOptionalEmail)
  @IsEmail({}, { message: 'Email trung tâm không hợp lệ' })
  @MaxLength(254, { message: 'Email quá dài' })
  email?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Số điện thoại không hợp lệ' })
  @MaxLength(30, { message: 'Số điện thoại tối đa 30 ký tự' })
  @Matches(/^[0-9+().\s-]*$/, {
    message: 'Số điện thoại chỉ gồm chữ số và các ký tự + ( ) . -',
  })
  phone?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Địa chỉ không hợp lệ' })
  @MaxLength(500, { message: 'Địa chỉ tối đa 500 ký tự' })
  address?: string | null;
}

export class SlugSuggestionQueryDto {
  @Transform(trimString)
  @IsString({ message: 'Vui lòng nhập tên trung tâm' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên trung tâm' })
  @MaxLength(150, { message: 'Tên trung tâm tối đa 150 ký tự' })
  name: string;
}
