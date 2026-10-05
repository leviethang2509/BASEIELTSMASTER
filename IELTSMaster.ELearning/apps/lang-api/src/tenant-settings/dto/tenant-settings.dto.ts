import {
  HOLIDAY_NAME_MAX_LENGTH,
  type HolidayImpactInput,
  type HolidayInput,
  type UpdateTenantSettingsInput,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsCalendarDate } from '../../classrooms/dto/classroom.dto';
import { trimString } from '../../common/transforms';
import { isPresent } from '../../common/validators/fields';

export class UpdateTenantSettingsDto implements UpdateTenantSettingsInput {
  @ValidateIf(isPresent)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Hệ số nộp muộn là số từ 0 đến 1, tối đa 2 chữ số thập phân' },
  )
  @Min(0, { message: 'Hệ số nộp muộn là số từ 0 đến 1' })
  @Max(1, { message: 'Hệ số nộp muộn là số từ 0 đến 1' })
  lateWeight?: number;

  @ValidateIf(isPresent)
  @IsInt({ message: 'Ngưỡng cảnh báo phải là số nguyên' })
  @Min(0, { message: 'Ngưỡng cảnh báo từ 0 đến 100' })
  @Max(100, { message: 'Ngưỡng cảnh báo từ 0 đến 100' })
  warningThreshold?: number;
}

export class HolidayDto implements HolidayInput {
  @Transform(trimString)
  @IsString({ message: 'Tên ngày nghỉ không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên ngày nghỉ' })
  @MaxLength(HOLIDAY_NAME_MAX_LENGTH, {
    message: `Tên ngày nghỉ tối đa ${HOLIDAY_NAME_MAX_LENGTH} ký tự`,
  })
  name: string;

  @IsCalendarDate('Từ ngày không hợp lệ (YYYY-MM-DD)')
  startDate: string;

  @IsCalendarDate('Đến ngày không hợp lệ (YYYY-MM-DD)')
  endDate: string;
}

export class HolidayImpactDto implements HolidayImpactInput {
  @IsOptional()
  @IsUUID('all', { message: 'Ngày nghỉ không hợp lệ' })
  holidayId?: string | null;

  @ValidateIf((dto: HolidayImpactDto) => !dto.remove)
  @IsCalendarDate('Từ ngày không hợp lệ (YYYY-MM-DD)')
  startDate?: string;

  @ValidateIf((dto: HolidayImpactDto) => !dto.remove)
  @IsCalendarDate('Đến ngày không hợp lệ (YYYY-MM-DD)')
  endDate?: string;

  @IsOptional()
  @IsBoolean({ message: 'Giá trị không hợp lệ' })
  remove?: boolean;
}
