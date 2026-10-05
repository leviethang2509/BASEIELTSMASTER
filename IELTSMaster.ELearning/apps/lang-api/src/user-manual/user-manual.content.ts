import type { ManualGroup, UserManual } from '@lang/shared';
import intro from './content/01-gioi-thieu.json';
import roles from './content/02-vai-tro.json';
import account from './content/03-tai-khoan.json';
import system from './content/04-quan-tri-he-thong.json';
import tenant from './content/05-trung-tam.json';
import exams from './content/06-de-thi.json';
import training from './content/07-dao-tao.json';
import attempts from './content/08-thi-cham-bai.json';
import operations from './content/09-van-hanh.json';

// Mỗi file JSON là một nhóm trên sidebar, theo thứ tự dưới đây. Cấu trúc được
// kiểm bằng `validateUserManual` trong `user-manual.content.spec.ts`.
const groups: unknown[] = [
  intro,
  roles,
  account,
  system,
  tenant,
  exams,
  training,
  attempts,
  operations,
];

export const USER_MANUAL: UserManual = {
  title: 'Tài liệu nội bộ Lang Simulator',
  updatedAt: '2026-10-01',
  groups: groups as ManualGroup[],
};
