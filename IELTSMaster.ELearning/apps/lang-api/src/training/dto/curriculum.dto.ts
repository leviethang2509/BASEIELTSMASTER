import {
  CURRICULUM_DESCRIPTION_MAX_LENGTH,
  CURRICULUM_GROUP_TITLE_MAX_LENGTH,
  CURRICULUM_ITEM_NOTE_MAX_LENGTH,
  CURRICULUM_ITEM_TITLE_MAX_LENGTH,
  CURRICULUM_MAX_GROUPS,
  CURRICULUM_NAME_MAX_LENGTH,
  CurriculumItemLabel,
  CurriculumItemType,
  type CreateCurriculumInput,
  type CurriculumGroupInput,
  type CurriculumItemInput,
  type SaveCurriculumItemsInput,
  type UpdateCurriculumInput,
} from '@lang/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
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

const NameField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Tên giáo trình không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập tên giáo trình' }),
    MaxLength(CURRICULUM_NAME_MAX_LENGTH, {
      message: `Tên giáo trình tối đa ${CURRICULUM_NAME_MAX_LENGTH} ký tự`,
    }),
  );

const DescriptionField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Mô tả không hợp lệ' }),
    MaxLength(CURRICULUM_DESCRIPTION_MAX_LENGTH, {
      message: `Mô tả tối đa ${CURRICULUM_DESCRIPTION_MAX_LENGTH} ký tự`,
    }),
  );

const IdField = () =>
  composeDecorators(
    IsOptional(),
    IsUUID('all', { message: 'Id không hợp lệ' }),
  );

export class ListCurriculaQueryDto extends PaginationQueryDto {
  /** Tìm theo tên giáo trình. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsUUID('all', { message: 'Người tạo không hợp lệ' })
  createdBy?: string;

  /** Chỉ giáo trình đang gắn khoá học này. */
  @IsOptional()
  @IsUUID('all', { message: 'Khoá học không hợp lệ' })
  courseId?: string;
}

export class CreateCurriculumDto implements CreateCurriculumInput {
  @NameField()
  name: string;

  @DescriptionField()
  description?: string | null;
}

export class UpdateCurriculumDto implements UpdateCurriculumInput {
  @ValidateIf(isPresent)
  @NameField()
  name?: string;

  @DescriptionField()
  description?: string | null;
}

export class CurriculumItemInputDto implements CurriculumItemInput {
  @IdField()
  id?: string;

  @IsIn(Object.values(CurriculumItemType), {
    message: 'Loại mục không hợp lệ',
  })
  itemType: CurriculumItemType;

  @IsUUID('all', { message: 'Vui lòng chọn bài học hoặc đề thi' })
  contentId: string;

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Tên hiển thị không hợp lệ' })
  @MaxLength(CURRICULUM_ITEM_TITLE_MAX_LENGTH, {
    message: `Tên hiển thị tối đa ${CURRICULUM_ITEM_TITLE_MAX_LENGTH} ký tự`,
  })
  title?: string | null;

  @IsIn(Object.values(CurriculumItemLabel), { message: 'Nhãn không hợp lệ' })
  label: CurriculumItemLabel;

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(CURRICULUM_ITEM_NOTE_MAX_LENGTH, {
    message: `Ghi chú tối đa ${CURRICULUM_ITEM_NOTE_MAX_LENGTH} ký tự`,
  })
  note?: string | null;
}

const ItemsField = () =>
  composeDecorators(
    IsArray({ message: 'Danh sách mục không hợp lệ' }),
    ValidateNested({ each: true }),
    Type(() => CurriculumItemInputDto),
  );

export class CurriculumGroupInputDto implements CurriculumGroupInput {
  @IdField()
  id?: string;

  @Transform(trimString)
  @IsString({ message: 'Tên chương không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên chương' })
  @MaxLength(CURRICULUM_GROUP_TITLE_MAX_LENGTH, {
    message: `Tên chương tối đa ${CURRICULUM_GROUP_TITLE_MAX_LENGTH} ký tự`,
  })
  title: string;

  @ItemsField()
  items: CurriculumItemInputDto[];
}

/** Tổng số mục (kể cả trong chương) kiểm trong service. */
export class SaveCurriculumItemsDto implements SaveCurriculumItemsInput {
  @IsInt({ message: 'Phiên bản giáo trình không hợp lệ' })
  @Min(1, { message: 'Phiên bản giáo trình không hợp lệ' })
  baseRevision: number;

  @ItemsField()
  ungrouped: CurriculumItemInputDto[];

  @IsArray({ message: 'Danh sách chương không hợp lệ' })
  @ArrayMaxSize(CURRICULUM_MAX_GROUPS, {
    message: `Giáo trình tối đa ${CURRICULUM_MAX_GROUPS} chương`,
  })
  @ValidateNested({ each: true })
  @Type(() => CurriculumGroupInputDto)
  groups: CurriculumGroupInputDto[];
}
