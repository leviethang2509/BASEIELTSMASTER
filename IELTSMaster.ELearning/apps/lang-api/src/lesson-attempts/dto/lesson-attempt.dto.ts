import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimToNull } from '../../common/transforms';

export class ListLearnerLessonsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Từ khoá không hợp lệ' })
  @MaxLength(100, { message: 'Từ khoá tối đa 100 ký tự' })
  q?: string | null;

  @IsOptional()
  @IsUUID('all', { message: 'Danh mục không hợp lệ' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Mẫu bài học không hợp lệ' })
  blueprintId?: string;
}
