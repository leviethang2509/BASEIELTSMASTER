import { AI_FORMAT_NOTE_MAX_LENGTH, type AiFormatInput } from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { trimToNull } from '../../common/transforms';

/** Body `POST t/:slug/exams/:id/ai-format` (plan 6.1). Nội dung kiểm kỹ trong service. */
export class AiFormatDto implements AiFormatInput {
  @IsOptional()
  @IsUUID('all', { message: 'Section không hợp lệ' })
  sectionId?: string | null;

  @IsOptional()
  @IsUUID('all', { message: 'Module không hợp lệ' })
  moduleId?: string | null;

  @IsArray({ message: 'Nội dung section không đúng định dạng' })
  value: unknown[];

  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(AI_FORMAT_NOTE_MAX_LENGTH, {
    message: `Ghi chú cho AI tối đa ${AI_FORMAT_NOTE_MAX_LENGTH} ký tự`,
  })
  note?: string | null;
}
