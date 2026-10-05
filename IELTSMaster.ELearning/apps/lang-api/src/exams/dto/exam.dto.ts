import {
  DURATION_MAX_MINUTES,
  EXAM_DESCRIPTION_MAX_LENGTH,
  EXAM_MAX_SECTIONS,
  EXAM_MIN_SECTIONS,
  EXAM_SECTION_NAME_MAX_LENGTH,
  EXAM_TITLE_MAX_LENGTH,
  ContentVisibility,
  ExamStatus,
  isValidDurationMinutes,
  type CreateExamInput,
  type ExamSectionInput,
  type RestoreExamVersionInput,
  type SaveExamContentInput,
  type UpdateExamInput,
} from '@lang/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimString, trimToNull } from '../../common/transforms';
import { composeDecorators, isPresent } from '../../common/validators/fields';

@ValidatorConstraint({ name: 'sectionDuration' })
class SectionDurationConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidDurationMinutes(value);
  }

  defaultMessage(): string {
    return `Thời lượng section phải là bội số của 5, từ 5 đến ${DURATION_MAX_MINUTES} phút`;
  }
}

const BlueprintIdField = () =>
  IsUUID('all', { message: 'Vui lòng chọn loại đề' });

const TitleField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Tên đề không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập tên đề' }),
    MaxLength(EXAM_TITLE_MAX_LENGTH, {
      message: `Tên đề tối đa ${EXAM_TITLE_MAX_LENGTH} ký tự`,
    }),
  );

/** Tuỳ chọn; chuỗi rỗng thành `null`. */
const DescriptionField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(EXAM_DESCRIPTION_MAX_LENGTH, {
      message: `Mô tả tối đa ${EXAM_DESCRIPTION_MAX_LENGTH} ký tự`,
    }),
  );

const VisibilityField = () =>
  IsIn(Object.values(ContentVisibility), {
    message: 'Chế độ hiển thị không hợp lệ',
  });

const RevisionField = () =>
  composeDecorators(
    IsInt({ message: 'Phiên bản nội dung không hợp lệ' }),
    Min(1, { message: 'Phiên bản nội dung không hợp lệ' }),
  );

export class ListExamsQueryDto extends PaginationQueryDto {
  /** Tìm theo tên đề. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsIn(Object.values(ExamStatus), { message: 'Trạng thái không hợp lệ' })
  status?: ExamStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Danh mục không hợp lệ' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Loại đề không hợp lệ' })
  blueprintId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Người tạo không hợp lệ' })
  createdBy?: string;
}

export class CreateExamDto implements CreateExamInput {
  @BlueprintIdField()
  blueprintId: string;

  @TitleField()
  title: string;

  @DescriptionField()
  description?: string | null;

  @IsOptional()
  @VisibilityField()
  visibility?: ContentVisibility;
}

/** PATCH metadata: bỏ trường nào thì giữ nguyên. Không tạo version. */
export class UpdateExamDto implements UpdateExamInput {
  @ValidateIf(isPresent)
  @BlueprintIdField()
  blueprintId?: string;

  @ValidateIf(isPresent)
  @TitleField()
  title?: string;

  @DescriptionField()
  description?: string | null;

  @ValidateIf(isPresent)
  @VisibilityField()
  visibility?: ContentVisibility;
}

export class ExamSectionInputDto implements ExamSectionInput {
  @IsOptional()
  @IsUUID('all', { message: 'Module của section không hợp lệ' })
  moduleId?: string | null;

  @Transform(trimString)
  @IsString({ message: 'Tên section không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên section' })
  @MaxLength(EXAM_SECTION_NAME_MAX_LENGTH, {
    message: `Tên section tối đa ${EXAM_SECTION_NAME_MAX_LENGTH} ký tự`,
  })
  name: string;

  @Validate(SectionDurationConstraint)
  durationMinutes: number;

  /** Nội dung Plate; cấu trúc kiểm ở service bằng `validateSectionShape`. */
  @IsArray({ message: 'Nội dung section không đúng định dạng' })
  rawData: unknown[];
}

/** Thay toàn bộ section của version hiện tại (thứ tự = vị trí trong mảng). */
export class SaveExamContentDto implements SaveExamContentInput {
  @RevisionField()
  baseRevision: number;

  @IsArray({ message: 'Danh sách section không hợp lệ' })
  @ArrayMinSize(EXAM_MIN_SECTIONS, {
    message: 'Đề phải có ít nhất 1 section',
  })
  @ArrayMaxSize(EXAM_MAX_SECTIONS, {
    message: `Đề tối đa ${EXAM_MAX_SECTIONS} section`,
  })
  @ValidateNested({ each: true })
  @Type(() => ExamSectionInputDto)
  sections: ExamSectionInputDto[];
}

export class RestoreExamVersionDto implements RestoreExamVersionInput {
  @RevisionField()
  baseRevision: number;
}
