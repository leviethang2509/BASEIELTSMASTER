import { fixupPluginRules } from '@eslint/compat';
import base from '@lang/eslint-config/base';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// --- Màu phải đi qua token (req-4) ------------------------------------------
// 3 theme (sáng / giấy / tối) đổi bằng biến CSS trong `globals.css`, nên màu
// viết thẳng bằng `rgba()`/hex sẽ tàng hình hoặc chói ở theme khác. Dùng
// `var(--…)`: `bg-[var(--warn-soft)]`, `shadow-[0_8px_22px_var(--shadow-1)]`.
const colorLiteral = String.raw`/(rgba?\(|hsla?\(|#[0-9a-fA-F]{3,8}\b)/`;
const noHardcodedColor = [
  'error',
  {
    selector: `Literal[value=${colorLiteral}]`,
    message:
      'Màu cứng: khai báo token trong globals.css rồi dùng var(--…) thay cho rgba()/hex.',
  },
  {
    selector: `TemplateElement[value.raw=${colorLiteral}]`,
    message:
      'Màu cứng: khai báo token trong globals.css rồi dùng var(--…) thay cho rgba()/hex.',
  },
];

// Bảng màu **người dùng chọn** (màu danh mục, màu chữ/nền trong trình soạn đề):
// ô chọn màu phải hiện đúng mã màu sẽ lưu, nên giữ hex. Đọc được ở theme tối
// nhờ `.ls-tint-*` / `.ls-leaf-*` (globals.css) đổi cách hiển thị.
// `global-error` tự dựng <html> riêng, không có `data-theme` để ăn theo biến.
// Trang chủ ra khỏi danh sách ở Step 3, bảng màu lịch ở Step 4 (đều dùng token).
const colorPalettes = [
  'src/app/global-error.tsx',
  'src/components/catalog/catalog-ui.tsx',
  'src/components/exam-editor/ExamToolbar.tsx',
];

export default [
  ...base,
  { ignores: ['next-env.d.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      // Plugin của Next 14 còn gọi API context cũ (getFilename…) mà ESLint 10
      // đã bỏ; fixupPluginRules bổ sung lại các API đó.
      '@next/next': fixupPluginRules(nextPlugin),
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // App Router, không có thư mục pages/.
      '@next/next/no-html-link-for-pages': 'off',
      // Chỉ bật 2 luật kinh điển; bộ luật React Compiler của v7 để sau.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-syntax': noHardcodedColor,
    },
  },
  { files: colorPalettes, rules: { 'no-restricted-syntax': 'off' } },
];
