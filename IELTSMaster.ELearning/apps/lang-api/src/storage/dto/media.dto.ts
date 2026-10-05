import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** `DELETE /t/:slug/media?key=…` — key đầy đủ lấy từ danh sách media. */
export class DeleteMediaQueryDto {
  @IsString({ message: 'Thiếu key của file' })
  @IsNotEmpty({ message: 'Thiếu key của file' })
  @MaxLength(1024, { message: 'Key quá dài' })
  key: string;
}
