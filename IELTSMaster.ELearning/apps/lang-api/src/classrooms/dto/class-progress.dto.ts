import {
  FINAL_COMMENT_MAX_LENGTH,
  type SaveFinalCommentInput,
} from '@lang/shared';
import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';
import { trimString } from '../../common/transforms';

/** Nhận xét cuối khoá (T5); chuỗi rỗng = xoá nhận xét. */
export class SaveFinalCommentDto implements SaveFinalCommentInput {
  @Transform(trimString)
  @IsString({ message: 'Nhận xét không hợp lệ' })
  @MaxLength(FINAL_COMMENT_MAX_LENGTH, {
    message: `Nhận xét tối đa ${FINAL_COMMENT_MAX_LENGTH} ký tự`,
  })
  text: string;
}
