import {
  AttemptStatus,
  type AttemptResponses,
  type SaveAttemptResponsesInput,
  type SubmitAttemptSectionInput,
} from '@lang/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimToNull } from '../../common/transforms';
import { isAttemptResponses } from '../attempt-grading';

@ValidatorConstraint({ name: 'attemptResponses' })
class AttemptResponsesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isAttemptResponses(value);
  }

  defaultMessage(): string {
    return 'Câu trả lời không đúng định dạng';
  }
}

export class ListLearnerExamsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsUUID('all', { message: 'Danh mục không hợp lệ' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Loại đề không hợp lệ' })
  blueprintId?: string;
}

export class ListMyAttemptsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(AttemptStatus), { message: 'Trạng thái không hợp lệ' })
  status?: AttemptStatus;
}

export class SaveAttemptResponsesDto implements SaveAttemptResponsesInput {
  @Validate(AttemptResponsesConstraint)
  responses: AttemptResponses;
}

export class SubmitAttemptSectionDto implements SubmitAttemptSectionInput {
  @IsOptional()
  @Validate(AttemptResponsesConstraint)
  responses?: AttemptResponses;
}

/** Trường text đi kèm file ghi âm (multipart). */
export class UploadRecordingDto {
  @IsUUID('all', { message: 'Section không hợp lệ' })
  sectionId: string;

  @Type(() => Number)
  @IsInt({ message: 'Số câu không hợp lệ' })
  @Min(1, { message: 'Số câu không hợp lệ' })
  number: number;
}
