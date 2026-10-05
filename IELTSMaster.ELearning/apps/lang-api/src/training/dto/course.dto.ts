import {
  CATALOG_CODE_PATTERN,
  COURSE_CODE_MAX_LENGTH,
  COURSE_COVER_URL_MAX_LENGTH,
  COURSE_DESCRIPTION_MAX_LENGTH,
  COURSE_LEVEL_MAX_LENGTH,
  COURSE_MAX_PLANNED_SESSIONS,
  COURSE_NAME_MAX_LENGTH,
  CourseStatus,
  normalizeCatalogCode,
  type CreateCourseInput,
  type UpdateCourseInput,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimString, trimToNull } from '../../common/transforms';
import { composeDecorators, isPresent } from '../../common/validators/fields';

const toCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeCatalogCode(value) : value;

/** Mã khoá học: quy tắc mã danh mục, tự đổi sang in hoa. */
const CodeField = () =>
  composeDecorators(
    Transform(toCode),
    IsString({ message: 'Mã khoá học không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập mã khoá học' }),
    MaxLength(COURSE_CODE_MAX_LENGTH, {
      message: `Mã khoá học tối đa ${COURSE_CODE_MAX_LENGTH} ký tự`,
    }),
    Matches(CATALOG_CODE_PATTERN, {
      message:
        'Mã khoá học chỉ gồm chữ in hoa không dấu, số và dấu "-" hoặc "_" ở giữa',
    }),
  );

const NameField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Tên khoá học không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập tên khoá học' }),
    MaxLength(COURSE_NAME_MAX_LENGTH, {
      message: `Tên khoá học tối đa ${COURSE_NAME_MAX_LENGTH} ký tự`,
    }),
  );

/** Các trường tuỳ chọn: chuỗi rỗng thành `null`, `null` để xoá. */
const DescriptionField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(COURSE_DESCRIPTION_MAX_LENGTH, {
      message: `Mô tả tối đa ${COURSE_DESCRIPTION_MAX_LENGTH} ký tự`,
    }),
  );

const CategoryField = () =>
  composeDecorators(
    IsOptional(),
    IsUUID('all', { message: 'Danh mục không hợp lệ' }),
  );

const CoverUrlField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Ảnh bìa không hợp lệ' }),
    MaxLength(COURSE_COVER_URL_MAX_LENGTH, {
      message: 'Đường dẫn ảnh bìa quá dài',
    }),
    Matches(/^https?:\/\/\S+$/, { message: 'Ảnh bìa phải là URL http(s)' }),
  );

const LevelField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Trình độ không hợp lệ' }),
    MaxLength(COURSE_LEVEL_MAX_LENGTH, {
      message: `Trình độ tối đa ${COURSE_LEVEL_MAX_LENGTH} ký tự`,
    }),
  );

const PlannedSessionsField = () =>
  composeDecorators(
    IsOptional(),
    IsInt({ message: 'Số buổi dự kiến phải là số nguyên' }),
    Min(1, { message: 'Số buổi dự kiến tối thiểu là 1' }),
    Max(COURSE_MAX_PLANNED_SESSIONS, {
      message: `Số buổi dự kiến tối đa ${COURSE_MAX_PLANNED_SESSIONS}`,
    }),
  );

export class ListCoursesQueryDto extends PaginationQueryDto {
  /** Tìm theo tên hoặc mã. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsIn(Object.values(CourseStatus), { message: 'Trạng thái không hợp lệ' })
  status?: CourseStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Danh mục không hợp lệ' })
  categoryId?: string;
}

export class CreateCourseDto implements CreateCourseInput {
  @CodeField()
  code: string;

  @NameField()
  name: string;

  @DescriptionField()
  description?: string | null;

  @CategoryField()
  categoryId?: string | null;

  @CoverUrlField()
  coverUrl?: string | null;

  @LevelField()
  level?: string | null;

  @PlannedSessionsField()
  plannedSessions?: number | null;
}

/** PATCH: bỏ trường nào thì giữ nguyên; trường tuỳ chọn gửi `null` để xoá. */
export class UpdateCourseDto implements UpdateCourseInput {
  @ValidateIf(isPresent)
  @CodeField()
  code?: string;

  @ValidateIf(isPresent)
  @NameField()
  name?: string;

  @DescriptionField()
  description?: string | null;

  @CategoryField()
  categoryId?: string | null;

  @CoverUrlField()
  coverUrl?: string | null;

  @LevelField()
  level?: string | null;

  @PlannedSessionsField()
  plannedSessions?: number | null;

  @ValidateIf(isPresent)
  @IsIn(Object.values(CourseStatus), { message: 'Trạng thái không hợp lệ' })
  status?: CourseStatus;
}
