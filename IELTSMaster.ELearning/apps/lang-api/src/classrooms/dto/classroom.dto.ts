import {
  CATALOG_CODE_PATTERN,
  CLASSROOM_CODE_MAX_LENGTH,
  CLASSROOM_DESCRIPTION_MAX_LENGTH,
  CLASSROOM_LOCATION_MAX_LENGTH,
  CLASSROOM_MAX_MEMBERS_PER_REQUEST,
  CLASSROOM_MAX_STUDENTS,
  CLASSROOM_NAME_MAX_LENGTH,
  COURSE_MAX_PLANNED_SESSIONS,
  ClassroomStatus,
  isValidCalendarDate,
  normalizeCatalogCode,
  type AddClassroomMembersInput,
  type ChangeClassroomStatusInput,
  type CreateClassroomInput,
  type UpdateClassroomInput,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  registerDecorator,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimString, trimToNull } from '../../common/transforms';
import { composeDecorators, isPresent } from '../../common/validators/fields';

const toCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeCatalogCode(value) : value;

/** Ngày `YYYY-MM-DD` đúng lịch. */
export function IsCalendarDate(message: string): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidCalendarDate(value),
      },
    });
  };
}

/** Mã lớp: quy tắc mã khoá học, tự đổi sang in hoa (người dùng chốt Step 7). */
const CodeField = () =>
  composeDecorators(
    Transform(toCode),
    IsString({ message: 'Mã lớp không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập mã lớp' }),
    MaxLength(CLASSROOM_CODE_MAX_LENGTH, {
      message: `Mã lớp tối đa ${CLASSROOM_CODE_MAX_LENGTH} ký tự`,
    }),
    Matches(CATALOG_CODE_PATTERN, {
      message:
        'Mã lớp chỉ gồm chữ in hoa không dấu, số và dấu "-" hoặc "_" ở giữa',
    }),
  );

const NameField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Tên lớp không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập tên lớp' }),
    MaxLength(CLASSROOM_NAME_MAX_LENGTH, {
      message: `Tên lớp tối đa ${CLASSROOM_NAME_MAX_LENGTH} ký tự`,
    }),
  );

const DescriptionField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(CLASSROOM_DESCRIPTION_MAX_LENGTH, {
      message: `Mô tả tối đa ${CLASSROOM_DESCRIPTION_MAX_LENGTH} ký tự`,
    }),
  );

export const StartDateField = () =>
  IsCalendarDate('Ngày bắt đầu không hợp lệ (YYYY-MM-DD)');

export const PlannedSessionsField = () =>
  composeDecorators(
    IsInt({ message: 'Số buổi phải là số nguyên' }),
    Min(1, { message: 'Số buổi tối thiểu là 1' }),
    Max(COURSE_MAX_PLANNED_SESSIONS, {
      message: `Số buổi tối đa ${COURSE_MAX_PLANNED_SESSIONS}`,
    }),
  );

const MaxStudentsField = () =>
  composeDecorators(
    IsOptional(),
    IsInt({ message: 'Sĩ số tối đa phải là số nguyên' }),
    Min(1, { message: 'Sĩ số tối đa tối thiểu là 1' }),
    Max(CLASSROOM_MAX_STUDENTS, {
      message: `Sĩ số tối đa không vượt quá ${CLASSROOM_MAX_STUDENTS}`,
    }),
  );

const LocationField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Phòng học/link không hợp lệ' }),
    MaxLength(CLASSROOM_LOCATION_MAX_LENGTH, {
      message: `Phòng học/link tối đa ${CLASSROOM_LOCATION_MAX_LENGTH} ký tự`,
    }),
  );

/** Tham số chuyên cần của lớp; `null` = theo trung tâm (R11.1–2, Step 11). */
const LateWeightField = () =>
  composeDecorators(
    IsOptional(),
    IsNumber(
      { maxDecimalPlaces: 2 },
      { message: 'Hệ số nộp muộn là số từ 0 đến 1, tối đa 2 chữ số thập phân' },
    ),
    Min(0, { message: 'Hệ số nộp muộn là số từ 0 đến 1' }),
    Max(1, { message: 'Hệ số nộp muộn là số từ 0 đến 1' }),
  );

const WarningThresholdField = () =>
  composeDecorators(
    IsOptional(),
    IsInt({ message: 'Ngưỡng cảnh báo phải là số nguyên' }),
    Min(0, { message: 'Ngưỡng cảnh báo từ 0 đến 100' }),
    Max(100, { message: 'Ngưỡng cảnh báo từ 0 đến 100' }),
  );

export class ListClassroomsQueryDto extends PaginationQueryDto {
  /** Tìm theo tên hoặc mã lớp. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsIn(Object.values(ClassroomStatus), { message: 'Trạng thái không hợp lệ' })
  status?: ClassroomStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Khoá học không hợp lệ' })
  courseId?: string;

  /** Lớp có giáo viên này (membership); Teacher luôn chỉ thấy lớp của mình. */
  @IsOptional()
  @IsUUID('all', { message: 'Giáo viên không hợp lệ' })
  teacherId?: string;
}

export class CreateClassroomDto implements CreateClassroomInput {
  @IsUUID('all', { message: 'Vui lòng chọn khoá học' })
  courseId: string;

  @CodeField()
  code: string;

  @NameField()
  name: string;

  @DescriptionField()
  description?: string | null;

  @StartDateField()
  startDate: string;

  @IsOptional()
  @PlannedSessionsField()
  plannedSessions?: number | null;

  @MaxStudentsField()
  maxStudents?: number | null;

  @LocationField()
  location?: string | null;

  @IsOptional()
  @IsUUID('all', { message: 'Giáo trình không hợp lệ' })
  sourceCurriculumId?: string | null;
}

/**
 * PATCH: bỏ trường nào thì giữ nguyên; trường tuỳ chọn gửi `null` để xoá.
 * Ngày bắt đầu, số buổi sửa qua thời khoá biểu (người dùng chốt Step 8).
 */
export class UpdateClassroomDto implements UpdateClassroomInput {
  @ValidateIf(isPresent)
  @CodeField()
  code?: string;

  @ValidateIf(isPresent)
  @NameField()
  name?: string;

  @DescriptionField()
  description?: string | null;

  @MaxStudentsField()
  maxStudents?: number | null;

  @LocationField()
  location?: string | null;

  @LateWeightField()
  lateWeight?: number | null;

  @WarningThresholdField()
  warningThreshold?: number | null;
}

export class ChangeClassroomStatusDto implements ChangeClassroomStatusInput {
  @IsIn(Object.values(ClassroomStatus), { message: 'Trạng thái không hợp lệ' })
  status: ClassroomStatus;
}

export class AddClassroomMembersDto implements AddClassroomMembersInput {
  @IsArray({ message: 'Danh sách thành viên không hợp lệ' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất một thành viên' })
  @ArrayMaxSize(CLASSROOM_MAX_MEMBERS_PER_REQUEST, {
    message: `Mỗi lần thêm tối đa ${CLASSROOM_MAX_MEMBERS_PER_REQUEST} thành viên`,
  })
  @IsUUID('all', { each: true, message: 'Thành viên không hợp lệ' })
  membershipIds: string[];
}
