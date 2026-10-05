import {
  ASSIGNABLE_TENANT_ROLES,
  MembershipStatus,
  TenantRole,
  type Gender,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { emptyToUndefined, trimToNull } from '../../common/transforms';
import {
  EmailField,
  FullNameField,
  GenderField,
  PhoneField,
  composeDecorators,
} from '../../common/validators/fields';
import { IsDateOfBirth } from '../../common/validators/is-date-of-birth';
import { NewPassword } from '../../common/validators/new-password';

/** Danh sách role cấp cho thành viên; không nhận `TENANT_OWNER`. */
function AssignableRoles(minSize: number): PropertyDecorator {
  return composeDecorators(
    IsArray({ message: 'Vai trò không hợp lệ' }),
    ...(minSize > 0
      ? [
          ArrayMinSize(minSize, {
            message: 'Vui lòng chọn ít nhất một vai trò',
          }),
        ]
      : []),
    ArrayUnique({ message: 'Vai trò bị trùng' }),
    IsIn([...ASSIGNABLE_TENANT_ROLES], {
      each: true,
      message:
        'Vai trò không hợp lệ hoặc không được cấp qua quản lý thành viên',
    }),
  );
}

export class ListMembershipsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(TenantRole), { message: 'Vai trò không hợp lệ' })
  role?: TenantRole;

  @IsOptional()
  @IsIn(Object.values(MembershipStatus), { message: 'Trạng thái không hợp lệ' })
  status?: MembershipStatus;

  /** Tìm theo họ tên hoặc email. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;
}

export class AddMemberByEmailDto {
  @EmailField()
  email: string;

  @AssignableRoles(1)
  roles: TenantRole[];
}

/** Tạo account mới (bắt đổi mật khẩu khi đăng nhập lần đầu) và thêm vào tenant. */
export class CreateMemberAccountDto {
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

  /** Mật khẩu tạm do admin nhập; để trống thì hệ thống sinh. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @NewPassword()
  password?: string;

  @AssignableRoles(1)
  roles: TenantRole[];
}

/** PATCH: bỏ trường nào thì giữ nguyên. Với Owner, `roles` là các role ngoài `TENANT_OWNER`. */
export class UpdateMembershipDto {
  @IsOptional()
  @AssignableRoles(0)
  roles?: TenantRole[];

  @IsOptional()
  @IsIn(Object.values(MembershipStatus), { message: 'Trạng thái không hợp lệ' })
  status?: MembershipStatus;
}

export class AddGuardianDto {
  @IsUUID('all', { message: 'Vui lòng chọn phụ huynh' })
  parentMembershipId: string;

  /** Vd. "Mẹ", "Bố". */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Quan hệ không hợp lệ' })
  @MaxLength(50, { message: 'Quan hệ tối đa 50 ký tự' })
  relationship?: string | null;
}
