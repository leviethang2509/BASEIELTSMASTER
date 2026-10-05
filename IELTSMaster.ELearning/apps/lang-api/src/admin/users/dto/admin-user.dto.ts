import { SystemRole, UserStatus } from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';
import { emptyToUndefined, trimToNull } from '../../../common/transforms';
import {
  AddressField,
  EmailField,
  FullNameField,
  GenderField,
  PhoneField,
  isPresent,
} from '../../../common/validators/fields';
import { IsDateOfBirth } from '../../../common/validators/is-date-of-birth';
import { NewPassword } from '../../../common/validators/new-password';
import type { Gender } from '@lang/shared';

export class ListUsersQueryDto extends PaginationQueryDto {
  /** Tìm theo họ tên hoặc email. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsIn(Object.values(SystemRole), { message: 'Vai trò không hợp lệ' })
  systemRole?: SystemRole;

  @IsOptional()
  @IsIn(Object.values(UserStatus), { message: 'Trạng thái không hợp lệ' })
  status?: UserStatus;
}

/** Tạo Registered User; đổi vai trò hệ thống qua `system-role`. */
export class CreateUserDto {
  @EmailField()
  email: string;

  @FullNameField()
  fullName: string;

  @IsDateOfBirth()
  dateOfBirth: string;

  @GenderField()
  gender?: Gender | null;

  @PhoneField()
  phone?: string | null;

  @AddressField()
  address?: string | null;

  /** Mật khẩu tạm do admin nhập; để trống thì hệ thống sinh. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @NewPassword()
  password?: string;
}

/** PATCH: bỏ trường nào thì giữ nguyên. */
export class UpdateUserDto {
  @ValidateIf(isPresent)
  @EmailField()
  email?: string;

  @ValidateIf(isPresent)
  @FullNameField()
  fullName?: string;

  @ValidateIf(isPresent)
  @IsDateOfBirth()
  dateOfBirth?: string;

  @GenderField()
  gender?: Gender | null;

  @PhoneField()
  phone?: string | null;

  @AddressField()
  address?: string | null;
}

export class ResetPasswordDto {
  /** Để trống thì hệ thống sinh mật khẩu tạm. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @NewPassword()
  password?: string;
}

export class ChangeSystemRoleDto {
  @IsIn(Object.values(SystemRole), { message: 'Vai trò không hợp lệ' })
  systemRole: SystemRole;
}
