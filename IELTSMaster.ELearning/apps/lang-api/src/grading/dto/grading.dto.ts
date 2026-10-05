import {
  AttemptStatus,
  GRADING_COMMENT_MAX_LENGTH,
  GRADING_FREE_FILTER,
  GRADING_SCOPE_TYPES,
  GradingKind,
  isValidManualScore,
  type CreateGradingDelegationInput,
  type GradeAnswerInput,
  type GradingAttemptStatus,
  type GradingScopeType,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimToNull } from '../../common/transforms';

/** Số người được chuyển giao gửi lên một lần. */
const MAX_DELEGATES = 50;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ô lọc lớp nhận uuid của lớp hoặc `free` (bài làm tự do). */
const IsClassFilter = () =>
  ValidateBy({
    name: 'classFilter',
    validator: {
      validate: (value: unknown) =>
        value === GRADING_FREE_FILTER ||
        (typeof value === 'string' && UUID_PATTERN.test(value)),
      defaultMessage: () => 'Lớp học không hợp lệ',
    },
  });

/** Phần lọc theo lớp/mục dùng chung cho đề thi và bài học. */
class ClassFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsClassFilter()
  classId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Mục giáo trình không hợp lệ' })
  itemId?: string;
}

export class ListGradingAttemptsQueryDto extends ClassFilterQueryDto {
  @IsOptional()
  @IsIn([AttemptStatus.SUBMITTED, AttemptStatus.GRADED], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: GradingAttemptStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Đề thi không hợp lệ' })
  examId?: string;

  /** Tên hoặc email học viên. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;
}

export class ListLessonGradingAttemptsQueryDto extends ClassFilterQueryDto {
  @IsOptional()
  @IsIn([AttemptStatus.SUBMITTED, AttemptStatus.GRADED], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: GradingAttemptStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Bài học không hợp lệ' })
  lessonId?: string;

  /** Tên hoặc email học viên. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;
}

export class GradeAnswerDto implements GradeAnswerInput {
  // Điểm tối đa theo từng câu kiểm lại trong service.
  @ValidateBy({
    name: 'manualScore',
    validator: {
      validate: (value) => isValidManualScore(value),
      defaultMessage: () => 'Điểm phải từ 0 đến 10, bước 0,5',
    },
  })
  score: number;

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Nhận xét không hợp lệ' })
  @MaxLength(GRADING_COMMENT_MAX_LENGTH, {
    message: `Nhận xét tối đa ${GRADING_COMMENT_MAX_LENGTH} ký tự`,
  })
  comment?: string | null;
}

/** `GET t/:slug/grading/delegations?attemptId=&kind=`. */
export class GradingDelegationQueryDto {
  @IsUUID('all', { message: 'Bài làm không hợp lệ' })
  attemptId: string;

  @IsIn([GradingKind.EXAM, GradingKind.LESSON], {
    message: 'Loại bài không hợp lệ',
  })
  kind: GradingKind;
}

/** `POST t/:slug/grading/delegations`. */
export class CreateGradingDelegationDto implements CreateGradingDelegationInput {
  @IsIn([...GRADING_SCOPE_TYPES], {
    message: 'Phạm vi chuyển giao không hợp lệ',
  })
  scopeType: GradingScopeType;

  @IsUUID('all', { message: 'Phạm vi chuyển giao không hợp lệ' })
  scopeId: string;

  @IsArray({ message: 'Danh sách giáo viên không hợp lệ' })
  @ArrayNotEmpty({ message: 'Chọn ít nhất một giáo viên' })
  @ArrayMaxSize(MAX_DELEGATES, {
    message: `Tối đa ${MAX_DELEGATES} giáo viên mỗi lần`,
  })
  @IsUUID('all', { each: true, message: 'Giáo viên không hợp lệ' })
  delegateMembershipIds: string[];
}
