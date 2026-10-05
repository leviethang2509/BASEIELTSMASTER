import {
  DEFAULT_TIMEZONE,
  isValidDateOfBirth,
  todayInTimeZone,
} from '@lang/shared';
import { registerDecorator, type ValidationOptions } from 'class-validator';

/** Ngày sinh `YYYY-MM-DD` đúng lịch, không ở tương lai (theo giờ Việt Nam). */
export function IsDateOfBirth(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isDateOfBirth',
      target: target.constructor,
      propertyName: String(propertyName),
      options: {
        message: 'Ngày sinh không hợp lệ (YYYY-MM-DD, không ở tương lai)',
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          isValidDateOfBirth(value, todayInTimeZone(DEFAULT_TIMEZONE)),
      },
    });
  };
}
