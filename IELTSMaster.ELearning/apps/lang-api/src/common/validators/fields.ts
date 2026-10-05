import { Gender } from '@lang/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { toEmail, trimString, trimToNull } from '../transforms';

/** Gộp nhiều decorator thành một để dùng lại cho các DTO. */
export function composeDecorators(
  ...decorators: PropertyDecorator[]
): PropertyDecorator {
  return (target, key) => {
    decorators.forEach((decorator) => decorator(target, key));
  };
}

/** Cho `ValidateIf`: PATCH bỏ trường thì bỏ qua, gửi `null` vẫn bị kiểm tra. */
export const isPresent = (_: object, value: unknown) => value !== undefined;

export const EmailField = () =>
  composeDecorators(
    Transform(toEmail),
    IsEmail({}, { message: 'Email không hợp lệ' }),
    MaxLength(254, { message: 'Email quá dài' }),
  );

export const FullNameField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Họ tên không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập họ tên' }),
    MaxLength(150, { message: 'Họ tên tối đa 150 ký tự' }),
  );

/** Tuỳ chọn, `null` để xoá. */
export const GenderField = () =>
  composeDecorators(
    IsOptional(),
    IsIn(Object.values(Gender), { message: 'Giới tính không hợp lệ' }),
  );

/** Tuỳ chọn; chuỗi rỗng thành `null`. */
export const PhoneField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Số điện thoại không hợp lệ' }),
    MaxLength(30, { message: 'Số điện thoại tối đa 30 ký tự' }),
    Matches(/^[0-9+().\s-]*$/, {
      message: 'Số điện thoại chỉ gồm chữ số và các ký tự + ( ) . -',
    }),
  );

/** Tuỳ chọn; chuỗi rỗng thành `null`. */
export const AddressField = () =>
  composeDecorators(
    IsOptional(),
    Transform(trimToNull),
    IsString({ message: 'Địa chỉ không hợp lệ' }),
    MaxLength(500, { message: 'Địa chỉ tối đa 500 ký tự' }),
  );

/** Lý do bắt buộc (từ chối, tạm khoá). */
export const ReasonField = () =>
  composeDecorators(
    Transform(trimString),
    IsString({ message: 'Lý do không hợp lệ' }),
    IsNotEmpty({ message: 'Vui lòng nhập lý do' }),
    MaxLength(1000, { message: 'Lý do tối đa 1000 ký tự' }),
  );
