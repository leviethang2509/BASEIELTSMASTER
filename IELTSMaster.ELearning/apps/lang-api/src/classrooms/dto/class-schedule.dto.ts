import {
  CLASSROOM_LOCATION_MAX_LENGTH,
  CLASSROOM_MAX_MEMBERS_PER_REQUEST,
  CURRICULUM_MAX_GROUPS,
  CURRICULUM_MAX_ITEMS,
  SCHEDULE_MAX_SLOTS,
  SESSION_CANCEL_REASON_MAX_LENGTH,
  SESSION_NOTE_MAX_LENGTH,
  isValidTimeOfDay,
  type CancelClassSessionInput,
  type CreateMakeupSessionInput,
  type SaveClassScheduleInput,
  type SaveSessionLinksInput,
  type ScheduleSlot,
  type UpdateClassSessionInput,
} from '@lang/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  registerDecorator,
} from 'class-validator';
import { trimToNull } from '../../common/transforms';
import { composeDecorators, isPresent } from '../../common/validators/fields';
import {
  IsCalendarDate,
  PlannedSessionsField,
  StartDateField,
} from './classroom.dto';

function IsTimeOfDay(message: string): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isTimeOfDay',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidTimeOfDay(value),
      },
    });
  };
}

const LocationField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Phòng học/link không hợp lệ' }),
    MaxLength(CLASSROOM_LOCATION_MAX_LENGTH, {
      message: `Phòng học/link tối đa ${CLASSROOM_LOCATION_MAX_LENGTH} ký tự`,
    }),
  );

const NoteField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Ghi chú không hợp lệ' }),
    MaxLength(SESSION_NOTE_MAX_LENGTH, {
      message: `Ghi chú tối đa ${SESSION_NOTE_MAX_LENGTH} ký tự`,
    }),
  );

const MomentField = (label: string) =>
  IsISO8601({ strict: true }, { message: `${label} không hợp lệ` });

/** Danh sách giáo viên của buổi; `null` = theo giáo viên của lớp. */
const TeachersField = () =>
  composeDecorators(
    IsOptional(),
    IsArray({ message: 'Danh sách giáo viên không hợp lệ' }),
    ArrayMaxSize(CLASSROOM_MAX_MEMBERS_PER_REQUEST, {
      message: 'Danh sách giáo viên quá dài',
    }),
    IsUUID('all', { each: true, message: 'Giáo viên không hợp lệ' }),
  );

export class ScheduleSlotDto implements ScheduleSlot {
  @IsInt({ message: 'Thứ trong tuần không hợp lệ' })
  @Min(1, { message: 'Thứ trong tuần không hợp lệ' })
  @Max(7, { message: 'Thứ trong tuần không hợp lệ' })
  weekday: number;

  @IsTimeOfDay('Giờ bắt đầu không hợp lệ (HH:mm)')
  startTime: string;

  @IsTimeOfDay('Giờ kết thúc không hợp lệ (HH:mm)')
  endTime: string;
}

export class SaveClassScheduleDto implements SaveClassScheduleInput {
  @StartDateField()
  startDate: string;

  @PlannedSessionsField()
  plannedSessions: number;

  @IsBoolean({ message: '"Áp dụng ngày nghỉ" không hợp lệ' })
  applyTenantHolidays: boolean;

  @IsArray({ message: 'Lịch lặp không hợp lệ' })
  @ArrayMinSize(1, { message: 'Vui lòng thêm ít nhất một buổi trong tuần' })
  @ArrayMaxSize(SCHEDULE_MAX_SLOTS, {
    message: `Tối đa ${SCHEDULE_MAX_SLOTS} buổi mỗi tuần`,
  })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}

export class UpdateClassSessionDto implements UpdateClassSessionInput {
  @LocationField()
  location?: string | null;

  @NoteField()
  note?: string | null;

  @ValidateIf(isPresent)
  @MomentField('Giờ bắt đầu')
  startsAt?: string;

  @ValidateIf(isPresent)
  @MomentField('Giờ kết thúc')
  endsAt?: string;

  @TeachersField()
  teacherMembershipIds?: string[] | null;

  @IsOptional()
  @IsBoolean({ message: 'Giá trị không hợp lệ' })
  dismissMovedWarning?: boolean;
}

export class CancelClassSessionDto implements CancelClassSessionInput {
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Lý do không hợp lệ' })
  @MaxLength(SESSION_CANCEL_REASON_MAX_LENGTH, {
    message: `Lý do tối đa ${SESSION_CANCEL_REASON_MAX_LENGTH} ký tự`,
  })
  reason?: string | null;
}

export class CreateMakeupSessionDto implements CreateMakeupSessionInput {
  @MomentField('Giờ bắt đầu')
  startsAt: string;

  @MomentField('Giờ kết thúc')
  endsAt: string;

  @LocationField()
  location?: string | null;

  @NoteField()
  note?: string | null;

  @IsOptional()
  @IsUUID('all', { message: 'Buổi được bù không hợp lệ' })
  makeupForSessionId?: string | null;

  @TeachersField()
  teacherMembershipIds?: string[] | null;
}

export class SaveSessionLinksDto implements SaveSessionLinksInput {
  @IsArray({ message: 'Danh sách chương không hợp lệ' })
  @ArrayMaxSize(CURRICULUM_MAX_GROUPS, { message: 'Quá nhiều chương' })
  @IsUUID('all', { each: true, message: 'Chương không hợp lệ' })
  groupIds: string[];

  @IsArray({ message: 'Danh sách mục không hợp lệ' })
  @ArrayMaxSize(CURRICULUM_MAX_ITEMS, { message: 'Quá nhiều mục' })
  @IsUUID('all', { each: true, message: 'Mục giáo trình không hợp lệ' })
  itemIds: string[];
}

/** `POST t/:slug/classes/:id/conflicts`: kiểm trùng lịch trước khi thêm thành viên. */
export class MemberConflictsDto {
  @IsArray({ message: 'Danh sách thành viên không hợp lệ' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất một thành viên' })
  @ArrayMaxSize(CLASSROOM_MAX_MEMBERS_PER_REQUEST, {
    message: `Tối đa ${CLASSROOM_MAX_MEMBERS_PER_REQUEST} thành viên`,
  })
  @IsUUID('all', { each: true, message: 'Thành viên không hợp lệ' })
  membershipIds: string[];
}

/** Khoảng ngày của lịch (`from`–`to` tính cả hai đầu). */
export class CalendarRangeQueryDto {
  @IsCalendarDate('Ngày bắt đầu không hợp lệ (YYYY-MM-DD)')
  from: string;

  @IsCalendarDate('Ngày kết thúc không hợp lệ (YYYY-MM-DD)')
  to: string;
}

export class CenterCalendarQueryDto extends CalendarRangeQueryDto {
  @IsOptional()
  @IsUUID('all', { message: 'Khoá học không hợp lệ' })
  courseId?: string;

  /** Membership giáo viên. */
  @IsOptional()
  @IsUUID('all', { message: 'Giáo viên không hợp lệ' })
  teacherId?: string;
}
