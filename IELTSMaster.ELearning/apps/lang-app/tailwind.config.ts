import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        // Roboto (Latin/Vietnamese) làm font UI chính theo bộ design; kana/kanji
        // rơi xuống Noto Sans JP để đề tiếng Nhật vẫn hiển thị đều nét.
        sans: [
          'var(--font-roboto)',
          'var(--font-noto-sans)',
          'var(--font-noto-sans-jp)',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-roboto-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
