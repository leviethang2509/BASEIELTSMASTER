import {
  CURRICULUM_GROUP_TITLE_MAX_LENGTH,
  CURRICULUM_ITEM_NOTE_MAX_LENGTH,
  CURRICULUM_ITEM_TITLE_MAX_LENGTH,
  CURRICULUM_MAX_GROUPS,
  CurriculumItemLabel,
  CurriculumItemType,
  type ClassGroupInput,
  type ClassItemInput,
  type SaveClassCurriculumInput,
} from '@lang/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { trimString, trimToNull } from '../../common/transforms';
import { composeDecorators } from '../../common/validators/fields';

const IdField = () =>
  composeDecorators(
    IsOptional(),
    IsUUID('all', { message: 'Id không hợp lệ' }),
  );

const MomentField = (label: string) =>
  composeDecorators(
    IsOptional(),
    IsISO8601({ strict: true }, { message: `${label} không hợp lệ` }),
  );

export class ClassItemInputDto implements ClassItemInput {
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

  @MomentField('Ngày mở')
  opensAt?: string | null;

  @MomentField('Deadline')
  deadlineAt?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Tuỳ chọn nhận bài quá hạn không hợp lệ' })
  acceptLate?: boolean;

  @IsOptional()
  @IsInt({ message: 'Ngưỡng đậu phải là số nguyên' })
  @Min(0, { message: 'Ngưỡng đậu từ 0 đến 100' })
  @Max(100, { message: 'Ngưỡng đậu từ 0 đến 100' })
  passThreshold?: number;

  @IdField()
  retakeOfItemId?: string | null;
}

const ItemsField = () =>
  composeDecorators(
    IsArray({ message: 'Danh sách mục không hợp lệ' }),
    ValidateNested({ each: true }),
    Type(() => ClassItemInputDto),
  );

export class ClassGroupInputDto implements ClassGroupInput {
  @IdField()
  id?: string;

  @Transform(trimString)
  @IsString({ message: 'Tên chương không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên chương' })
  @MaxLength(CURRICULUM_GROUP_TITLE_MAX_LENGTH, {
    message: `Tên chương tối đa ${CURRICULUM_GROUP_TITLE_MAX_LENGTH} ký tự`,
  })
  title: string;

  @MomentField('Ngày mở của chương')
  opensAt?: string | null;

  @ItemsField()
  items: ClassItemInputDto[];
}

/** Tổng số mục kiểm trong service. */
export class SaveClassCurriculumDto implements SaveClassCurriculumInput {
  @IsInt({ message: 'Phiên bản giáo trình không hợp lệ' })
  @Min(1, { message: 'Phiên bản giáo trình không hợp lệ' })
  baseRevision: number;

  @ItemsField()
  ungrouped: ClassItemInputDto[];

  @IsArray({ message: 'Danh sách chương không hợp lệ' })
  @ArrayMaxSize(CURRICULUM_MAX_GROUPS, {
    message: `Giáo trình tối đa ${CURRICULUM_MAX_GROUPS} chương`,
  })
  @ValidateNested({ each: true })
  @Type(() => ClassGroupInputDto)
  groups: ClassGroupInputDto[];
}
