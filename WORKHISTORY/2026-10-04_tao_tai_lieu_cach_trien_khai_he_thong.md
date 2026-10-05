# TẠO TÀI LIỆU HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG VÀ SCRIPT PUBLISH TỰ ĐỘNG

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04 03:50 (+07:00)
- **Tuân thủ quy trình:** `rule.md`

---

## 2. Mô tả công việc cần thực hiện
- **Mục tiêu:**
  1. Biên soạn bộ tài liệu chuẩn về **Cách triển khai hệ thống** (`CACHTRIENKHAIHETHONG.md`) phản ánh đúng 100% hiện trạng kiến trúc mới nhất (Microservices .NET 8 + Fullstack BusinessService + ELearning Node.js + PostgreSQL).
  2. Tạo script 1-click `publish-all.ps1` để tự động build và đóng gói toàn bộ các service ra thư mục `./publish`.
  3. Cung cấp file cấu hình mẫu cho Linux Systemd, Nginx, PM2 và danh sách tài khoản quản trị kiểm thử.

---

## 3. Các File tạo mới và cập nhật

| STT | File | Mục đích |
|---|---|---|
| 1 | `CACHTRIENKHAIHETHONG.md` | Tài liệu hướng dẫn triển khai hệ thống tại thư mục gốc của dự án. |
| 2 | `Document/CACHTRIENKHAIHETHONG.md` | Bản sao đồng bộ trong thư mục `Document/` phục vụ lưu trữ tài liệu kỹ thuật. |
| 3 | `publish-all.ps1` | Script PowerShell 1-click tự động publish 4 microservices ra `./publish`. |

---

## 4. Tóm tắt nội dung tài liệu triển khai

1. **Sơ đồ kiến trúc & cổng giao tiếp:**
   - `IELTSMaster.ApiGateway`: Cổng 5000 (YARP reverse proxy định tuyến `/auth`, `/file`, `/business`, `/elearning`).
   - `IELTSMaster.AuthService`: Cổng 5001 (JWT, multi-tenant).
   - `IELTSMaster.BusinessService`: Cổng 5002 (Web API + React SPA đóng gói trong `wwwroot`).
   - `IELTSMaster.FileService`: Cổng 5003 (Lưu trữ hybrid Local & Cloudflare R2).
   - `ELearning (lang-simulator)`: Cổng 3101 (`lang-api`) & 3100 (`lang-web`).
   - `PostgreSQL`: Cổng 5432 (Database `lang-simulator`, schemas: `auth`, `business`, views `public`).
2. **Quy trình Build & Đóng gói:**
   - Hướng dẫn publish chuẩn framework-dependent và self-contained (Linux/Windows).
   - Hướng dẫn build ELearning bằng pnpm.
3. **Mẫu cấu hình vận hành Production:**
   - 4 file mẫu Systemd service (`ielts-gateway.service`, `ielts-auth.service`, `ielts-business.service`, `ielts-file.service`).
   - File cấu hình Nginx mẫu định tuyến tên miền, SSL Let's Encrypt và chuyển tiếp WebSocket/Static files.
   - File `ecosystem.config.js` cho PM2 chạy module ELearning.
4. **Tài khoản quản trị:**
   - `admin` (hoặc `admin@langsimulator.com`, `admin@ieltsmaster.local`) / Mật khẩu: `Admin@123`
   - `thang` (hoặc `thang@gmail.com`) / Mật khẩu: `Admin@123`
