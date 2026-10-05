import { validateUserManual } from '@lang/shared';
import { USER_MANUAL } from './user-manual.content';

// Kiểm nội dung thật trong `content/*.json`: sửa tài liệu mà sai cấu trúc hay
// gãy liên kết thì test báo lỗi.
describe('USER_MANUAL', () => {
  it('đúng cấu trúc và không gãy liên kết', () => {
    expect(validateUserManual(USER_MANUAL)).toEqual([]);
  });
});
