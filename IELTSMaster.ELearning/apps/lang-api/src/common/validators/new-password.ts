import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@lang/shared';
import { IsString, MaxLength, MinLength } from 'class-validator';

const passwordMessage = `Mật khẩu phải từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự`;

/** Mật khẩu mới (đăng ký, đổi mật khẩu, mật khẩu tạm do admin nhập). */
export function NewPassword(): PropertyDecorator {
  return (target, key) => {
    IsString({ message: passwordMessage })(target, key);
    MinLength(PASSWORD_MIN_LENGTH, { message: passwordMessage })(target, key);
    MaxLength(PASSWORD_MAX_LENGTH, { message: passwordMessage })(target, key);
  };
}
