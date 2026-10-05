import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Message lỗi validation, gồm cả lỗi của object lồng nhau, bỏ trùng. Không
 * thêm tiền tố đường dẫn như mặc định của Nest (`sections.0.…`) vì message đã
 * là câu tiếng Việt hoàn chỉnh cho người dùng.
 */
export function validationMessages(
  errors: readonly ValidationError[],
): string[] {
  const messages = new Set<string>();
  const walk = (list: readonly ValidationError[]) => {
    for (const error of list) {
      Object.values(error.constraints ?? {}).forEach((message) =>
        messages.add(message),
      );
      if (error.children?.length) walk(error.children);
    }
  };
  walk(errors);
  return [...messages];
}

export const validationExceptionFactory = (errors: ValidationError[]) =>
  new BadRequestException(validationMessages(errors));
