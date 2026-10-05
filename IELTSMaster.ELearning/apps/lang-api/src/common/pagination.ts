import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 100;

/** Query `?page=&pageSize=` dùng chung cho các API danh sách. */
export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize = 20;
}

export type { Paginated } from '@lang/shared';

/** Đổi page/pageSize sang skip/take của TypeORM. */
export function toSkipTake({ page, pageSize }: PaginationQueryDto) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
