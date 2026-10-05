import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

/** `?unread=true` để chỉ lấy thông báo chưa đọc. */
export class ListNotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value))
  @IsBoolean({ message: 'Bộ lọc chưa đọc không hợp lệ' })
  unread?: boolean;
}
