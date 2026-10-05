import { Gender } from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { trimString } from '../../common/transforms';
import { IsDateOfBirth } from '../../common/validators/is-date-of-birth';

const isPresent = (_: object, value: unknown) => value !== undefined;

/** PATCH: bỏ trường nào thì giữ nguyên. Họ tên, ngày sinh bắt buộc nên không nhận `null`. */
export class UpdateProfileDto {
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString({ message: 'Họ tên không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  @MaxLength(150, { message: 'Họ tên tối đa 150 ký tự' })
  fullName?: string;

  @ValidateIf(isPresent)
  @IsDateOfBirth()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(Object.values(Gender), { message: 'Giới tính không hợp lệ' })
  gender?: Gender | null;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Số điện thoại không hợp lệ' })
  @MaxLength(30, { message: 'Số điện thoại tối đa 30 ký tự' })
  @Matches(/^[0-9+().\s-]*$/, {
    message: 'Số điện thoại chỉ gồm chữ số và các ký tự + ( ) . -',
  })
  phone?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Địa chỉ không hợp lệ' })
  @MaxLength(500, { message: 'Địa chỉ tối đa 500 ký tự' })
  address?: string | null;
}
