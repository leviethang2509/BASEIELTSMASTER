import {
  AI_MONTHLY_QUOTA_OPTIONS,
  TenantStatus,
  type AiMonthlyQuota,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';
import { trimToNull } from '../../../common/transforms';
import { ReasonField } from '../../../common/validators/fields';

export class ListAdminTenantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(TenantStatus), { message: 'Trạng thái không hợp lệ' })
  status?: TenantStatus;

  /** Tìm theo tên, slug, tên hoặc email chủ trung tâm. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;
}

export class TenantReasonDto {
  @ReasonField()
  reason: string;
}

export class ChangeTenantPlanDto {
  @IsUUID('all', { message: 'Vui lòng chọn gói dịch vụ' })
  planId: string;
}

export class UpdateTenantAiDto {
  @IsBoolean({ message: 'Giá trị bật/tắt AI không hợp lệ' })
  enabled: boolean;

  /** `null` = không giới hạn; bắt buộc gửi (thiếu trường là lỗi). */
  @ValidateIf((_dto, value) => value !== null)
  @IsIn(AI_MONTHLY_QUOTA_OPTIONS, { message: 'Hạn mức AI không hợp lệ' })
  monthlyQuota: AiMonthlyQuota | null;
}
