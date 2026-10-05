# AGENTS.md – Lang Simulator

File khởi tạo cho Codex (và các agent đọc chuẩn `AGENTS.md`). Nội dung dùng chung cho mọi trợ lý AI (Claude, Gemini, Codex) nằm ở `docs/dev/` — **sửa quy ước ở đó, không sửa ở đây**.

## Bắt buộc đọc trước khi làm việc

1. [docs/dev/code-conventions.md](docs/dev/code-conventions.md) – quy ước code, quy trình, bắt đầu phiên, checklist.
2. [docs/dev/module-notes.md](docs/dev/module-notes.md) – ghi chú kiến trúc theo module (đọc phần liên quan tới việc đang làm).
3. `req-N-progress.md` của requirement đang làm (mục 1 của `code-conventions.md` chỉ file nào).

## Tóm tắt quy tắc quan trọng nhất

- Monorepo pnpm 11 + Turborepo, Node 24: `apps/lang-api` (NestJS + TypeORM), `apps/lang-app` (Next.js), `packages/shared` (`@lang/shared`), `packages/exam-core` (`@lang/exam-core`).
- Kết thúc mỗi step phải pass: `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`, chạy thử thật, rồi cập nhật `req-N-progress.md`.
- Yêu cầu chưa rõ hoặc mâu thuẫn: **hỏi lại người dùng, không suy đoán**. Trả lời bằng tiếng Việt.
- **Chỉ commit/push khi người dùng yêu cầu** (push `main` = deploy production). Không commit secret.
- Comment, message lỗi, chuỗi UI bằng tiếng Việt; chuỗi UI trong `apps/lang-app/src/i18n/vi.ts`.
- Enum dùng chung: object `as const` + union type trong `@lang/shared`, không dùng TS `enum`.
- DB chỉ đổi qua migration, không sửa migration đã chạy; máy dev dùng Postgres local `lang_simulator_dev`, **không đụng** database `lang_simulator`.
- Route API mới phải thêm dòng vào bảng `ROUTES` của `apps/lang-api/src/access-control.e2e.spec.ts`.
- Không viết màu `rgba()`/hex trong component lang-app; dùng token `var(--…)` trong `globals.css`.

## Riêng cho Codex

- Sandbox có thể chặn mạng/Postgres: nếu không chạy được migration hoặc test cần DB, báo lại người dùng thay vì bỏ qua bước kiểm.
- Thêm kiến thức về module → `docs/dev/module-notes.md`; quy ước mới → `docs/dev/code-conventions.md`. Chỉ ghi vào file này những gì riêng cho Codex.
- File tương ứng cho công cụ khác: `CLAUDE.md` (Claude Code), `GEMINI.md` (Gemini CLI).
