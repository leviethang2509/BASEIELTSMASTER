# GEMINI.md – Lang Simulator

File khởi tạo cho Gemini CLI. Nội dung dùng chung cho mọi trợ lý AI (Claude, Gemini, Codex) nằm ở `docs/dev/` và được import bên dưới — **sửa quy ước ở đó, không sửa ở đây**.

## Quy ước code, quy trình, bắt đầu phiên

@./docs/dev/code-conventions.md

## Ghi chú kiến trúc theo module

@./docs/dev/module-notes.md

## Riêng cho Gemini CLI

- Nếu import ở trên không được nạp (kiểm bằng `/memory show`), **đọc hai file `docs/dev/code-conventions.md` và `docs/dev/module-notes.md` trước khi làm bất cứ việc gì**.
- Bắt đầu phiên: làm theo mục 1 "Bắt đầu phiên" của `code-conventions.md` (đọc `req-N-progress.md` đang làm trước).
- Trả lời người dùng bằng tiếng Việt. Yêu cầu chưa rõ: hỏi lại, không suy đoán.
- Không chạy lệnh ghi ra ngoài repo (push, deploy, sửa DB VPS) khi người dùng chưa yêu cầu.
- Thêm kiến thức về module → `docs/dev/module-notes.md`; quy ước mới → `docs/dev/code-conventions.md`. Chỉ ghi vào file này những gì riêng cho Gemini CLI.
