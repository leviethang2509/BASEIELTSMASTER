import { ApiError } from './api';

/**
 * Message của lỗi API (`ApiError`, tiếng Việt từ server) hoặc thông báo mặc
 * định. Lỗi khác (TypeError, DOMException…) mang message tiếng Anh nên không hiện.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}
