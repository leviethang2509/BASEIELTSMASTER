import {
  LESSON_DESCRIPTION_MAX_LENGTH,
  LESSON_MAX_SECTIONS,
  LESSON_MIN_SECTIONS,
  LESSON_SECTION_NAME_MAX_LENGTH,
  LESSON_TITLE_MAX_LENGTH,
  ContentVisibility,
  LessonStatus,
  type CreateLessonInput,
  type LessonSectionInput,
  type RestoreLessonVersionInput,
  type SaveLessonContentInput,
  type UpdateLessonInput,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimString, trimToNull } from '../../common/transforms';
import { composeDecorators, isPresent } from '../../common/validators/fields';

const BlueprintIdField = () =>
  IsUUID('all', { message: 'Vui lòng chọn mẫu bài học' });

const TitleField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Tên bài học không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập tên bài học' }),
    MaxLength(LESSON_TITLE_MAX_LENGTH, {
      message: `Tên bài học tối đa ${LESSON_TITLE_MAX_LENGTH} ký tự`,
    }),
  );

/** Tuỳ chọn; chuỗi rỗng thành `null`. */
const DescriptionField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(LESSON_DESCRIPTION_MAX_LENGTH, {
      message: `Mô tả tối đa ${LESSON_DESCRIPTION_MAX_LENGTH} ký tự`,
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

export class ListLessonsQueryDto extends PaginationQueryDto {
  /** Tìm theo tên bài học. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsIn(Object.values(LessonStatus), { message: 'Trạng thái không hợp lệ' })
  status?: LessonStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Danh mục không hợp lệ' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Mẫu bài học không hợp lệ' })
  blueprintId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Người tạo không hợp lệ' })
  createdBy?: string;
}

export class CreateLessonDto implements CreateLessonInput {
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
export class UpdateLessonDto implements UpdateLessonInput {
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

export class LessonSectionInputDto implements LessonSectionInput {
  @IsOptional()
  @IsUUID('all', { message: 'Phần của section không hợp lệ' })
  moduleId?: string | null;

  @Transform(trimString)
  @IsString({ message: 'Tên section không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên section' })
  @MaxLength(LESSON_SECTION_NAME_MAX_LENGTH, {
    message: `Tên section tối đa ${LESSON_SECTION_NAME_MAX_LENGTH} ký tự`,
  })
  name: string;

  /** Nội dung Plate; cấu trúc kiểm ở service bằng `validateSectionShape`. */
  @IsArray({ message: 'Nội dung section không đúng định dạng' })
  rawData: unknown[];
}

/** Thay toàn bộ section của version hiện tại (thứ tự = vị trí trong mảng). */
export class SaveLessonContentDto implements SaveLessonContentInput {
  @RevisionField()
  baseRevision: number;

  @IsArray({ message: 'Danh sách section không hợp lệ' })
  @ArrayMinSize(LESSON_MIN_SECTIONS, {
    message: 'Bài học phải có ít nhất 1 section',
  })
  @ArrayMaxSize(LESSON_MAX_SECTIONS, {
    message: `Bài học tối đa ${LESSON_MAX_SECTIONS} section`,
  })
  @ValidateNested({ each: true })
  @Type(() => LessonSectionInputDto)
  sections: LessonSectionInputDto[];
}

export class RestoreLessonVersionDto implements RestoreLessonVersionInput {
  @RevisionField()
  baseRevision: number;
}
