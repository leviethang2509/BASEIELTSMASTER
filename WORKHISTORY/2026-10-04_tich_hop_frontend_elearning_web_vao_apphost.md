# TÍCH HỢP GIAO DIỆN FRONTEND E-LEARNING (NEXT.JS) VÀO APPHOST

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04

---

## 2. Mô tả vấn đề (Vấn đề hiện tại)
Người dùng thắc mắc: E-Learning vốn có giao diện web hoàn chỉnh, nhưng khi chạy hệ thống qua Visual Studio / .NET Aspire thì chỉ thấy chạy mỗi Backend (NestJS trên cổng 3101).

- **Nguyên nhân:**
  Trong cấu trúc monorepo `IELTSMaster.ELearning`, mã nguồn được chia thành 2 ứng dụng độc lập:
  1. `apps/lang-api`: Backend API (NestJS - Cổng 3101).
  2. `apps/lang-app`: Frontend Web (Next.js 14 - Cổng 3100) phục vụ học viên & giáo viên làm bài thi IELTS, học bài, xem kết quả chấm điểm.
  
  Trước đó, trong `IELTSMaster.AppHost/AppHost.cs`, tiến trình điều phối Aspire mới chỉ khai báo tài nguyên `ELearning` trỏ tới `../IELTSMaster.ELearning/apps/lang-api` (Backend), mà chưa đăng ký tài nguyên cho `apps/lang-app` (Frontend).

---

## 3. Các File/Module thực hiện và Lý do thay đổi

| STT | File/Thư mục thay đổi | Module | Lý do thay đổi |
|---|---|---|---|
| 1 | `IELTSMaster.ELearning/apps/lang-app/node_modules` | ELearning Frontend | Tạo liên kết Junction (`mklink /J`) với thư mục packages monorepo để cung cấp đầy đủ Next.js, React và các plugin làm bài thi. |
| 2 | `IELTSMaster.ELearning/apps/lang-app/.env.local` | ELearning Frontend | Cấu hình địa chỉ backend API nội bộ `BACKEND_INTERNAL_URL=http://127.0.0.1:3101` và `NEXT_PUBLIC_API_URL=/api`. |
| 3 | `IELTSMaster.ELearning/apps/lang-app/package.json` | ELearning Frontend | Bỏ tham số cứng `-p 3100` trong script `dev` (dùng `npx next dev`) để Next.js lắng nghe theo biến môi trường `PORT` mà Aspire Proxy truyền xuống, tránh xung đột chiếm port 3100 với DCP Proxy của Aspire. |
| 4 | `IELTSMaster.AppHost/AppHost.cs` | Aspire Orchestrator | Đăng ký thêm ứng dụng `ELearning-Web` (Port 3100) kèm `.WithExternalHttpEndpoints()` để Aspire expose ra trình duyệt và chuyển tiếp chính xác vào Next.js. |

---

## 4. Phương án và Cách thức xử lý

1. **Liên kết thư viện cho `lang-app`:**
   ```cmd
   mklink /J c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ELearning\apps\lang-app\node_modules c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\lang-simulator\apps\lang-app\node_modules
   ```

2. **Cấu hình môi trường `.env.local`:**
   ```env
   PORT=3100
   BACKEND_INTERNAL_URL=http://127.0.0.1:3101
   NEXT_PUBLIC_API_URL=/api
   ```

3. **Khai báo chuẩn trong `IELTSMaster.AppHost/AppHost.cs`:**
   ```csharp
   var elearning = builder.AddNpmApp("ELearning", "../IELTSMaster.ELearning/apps/lang-api", "dev")
       .WithHttpEndpoint(port: 3101, env: "PORT");

   var elearningWeb = builder.AddNpmApp("ELearning-Web", "../IELTSMaster.ELearning/apps/lang-app", "dev")
       .WithHttpEndpoint(port: 3100, env: "PORT")
       .WithExternalHttpEndpoints()
       .WithReference(elearning);
   ```

4. **Xử lý xung đột cổng với Aspire DCP Proxy:**
   - Trong kiến trúc .NET Aspire, `dcpctrl.exe` sẽ chiếm cổng ngoài (3100) để làm reverse proxy và phân bổ một cổng ngầm (random target port) cho Next.js thông qua biến `PORT`.
   - Nếu trong `package.json` để cứng `-p 3100`, Next.js sẽ cố chiếm lại cổng 3100 dẫn tới xung đột và Aspire Proxy bị timeout.
   - Khi chuyển thành `npx next dev`, Next.js lắng nghe cổng ngầm của Aspire và Aspire proxy thông suốt tại `http://localhost:3100`.

---

## 5. Kết quả sau khi thực hiện
- Do mã nguồn C# `AppHost.cs` cần biên dịch lại, người dùng cần **Stop Debugging (`Shift + F5`) trong Visual Studio**, sau đó nhấn **F5** để khởi chạy lại.
- Aspire Dashboard sẽ hiển thị xanh cả 2 dịch vụ E-Learning:
  1. `ELearning`: Backend NestJS API (`http://localhost:3101/api`).
  2. `ELearning-Web`: Giao diện Web Next.js (`http://localhost:3100`).
- Người dùng có thể click trực tiếp vào link `http://localhost:3100` trên Aspire Dashboard để vào giao diện web E-Learning.
