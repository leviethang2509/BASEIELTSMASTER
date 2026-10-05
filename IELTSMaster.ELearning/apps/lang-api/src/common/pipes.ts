import { NotFoundException, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';

/** Tham số id phải là uuid; sai định dạng coi như không tìm thấy (message tiếng Việt). */
export const ParseIdPipe = () =>
  new ParseUUIDPipe({
    exceptionFactory: () => new NotFoundException('Không tìm thấy dữ liệu'),
  });

/** Số version trong URL; không phải số nguyên coi như không tìm thấy. */
export const VersionPipe = () =>
  new ParseIntPipe({
    exceptionFactory: () => new NotFoundException('Không tìm thấy version'),
  });

/** Số câu trong URL; không phải số nguyên coi như không tìm thấy. */
export const QuestionNumberPipe = () =>
  new ParseIntPipe({
    exceptionFactory: () => new NotFoundException('Không tìm thấy câu hỏi'),
  });
