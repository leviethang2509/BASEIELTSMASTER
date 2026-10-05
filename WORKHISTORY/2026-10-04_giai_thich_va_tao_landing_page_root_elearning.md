# GIẢI THÍCH LỖI 'CANNOT GET /' VÀ TRIỂN KHAI TRANG TRẠNG THÁI ROOT CHO ELEARNING API

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04

---

## 2. Mô tả vấn đề (Vấn đề hiện tại)
Khi người dùng truy cập trực tiếp vào cổng của E-Learning `http://localhost:3101/` bằng trình duyệt hoặc client:
Màn hình trả về kết quả JSON:
```json
{"statusCode":404,"message":"Cannot GET /"}
```
Người dùng lo ngại E-Learning chưa chạy hoặc không truy cập được.

- **Bản chất kỹ thuật:**
  1. `IELTSMaster.ELearning/apps/lang-api` là một **Backend REST API** xây dựng trên NestJS (chứ không phải trang Web tĩnh HTML hay Frontend SSR).
  2. Toàn bộ route của NestJS được cấu hình với tiền tố `/api` (`app.setGlobalPrefix('api')`).
  3. Khi gọi vào đường dẫn gốc `/`, NestJS không có route handler nào khớp nên trả về lỗi mặc định: `404 Cannot GET /`.
  4. Thực tế, backend E-Learning **đang chạy hoàn toàn ổn định** và kết nối thành công với database PostgreSQL qua endpoint `/api/health` (`{"status":"ok","database":"up"}`).

---

## 3. Các File/Module thực hiện và Lý do thay đổi

| STT | File/Thư mục thay đổi | Module | Lý do thay đổi |
|---|---|---|---|
| 1 | `IELTSMaster.ELearning/apps/lang-api/src/app.controller.ts` | E-Learning Root | Tạo mới Controller phục vụ đường dẫn gốc `/` hiển thị giao diện HTML Dashboard trạng thái dịch vụ (ONLINE, danh sách endpoint). |
| 2 | `IELTSMaster.ELearning/apps/lang-api/src/app.module.ts` | AppModule | Đăng ký `AppController` vào danh sách controllers của ứng dụng. |
| 3 | `IELTSMaster.ELearning/apps/lang-api/src/main.ts` | Bootstrap | Cấu hình `setGlobalPrefix('api', { exclude: ['/'] })` để đường dẫn gốc `/` không bị ép prefix `/api`. |

---

## 4. Phương án và Cách thức xử lý

1. **Thêm AppController cho route gốc `/`:**
   Trả về trang HTML trực quan thông báo hệ thống E-Learning đang `ONLINE - RUNNING`, đồng thời liệt kê các đường dẫn API chính:
   - `/api/health`: Kiểm tra sức khỏe & kết nối Database
   - `/api/auth/login`: Xác thực tài khoản
   - `/api/exams`: Quản lý & làm đề thi
   - `/api/lessons`: Quản lý bài học
   - `/api/grading`: Chấm thi & phản hồi

2. **Cấu hình loại trừ prefix `/` trong NestJS:**
   ```typescript
   app.setGlobalPrefix('api', {
     exclude: ['/'],
   });
   ```

3. **Kiểm tra và xác thực kết quả:**
   - Đã biên dịch NestJS (`npx nest build`) thành công 100%.
   - Gọi lệnh `Invoke-RestMethod -Uri 'http://localhost:3101/'`: Trả về mã HTTP 200 kèm toàn bộ giao diện HTML trạng thái dịch vụ.

---

## 5. Kết quả sau khi thực hiện
- Người dùng khi mở `http://localhost:3101/` trên trình duyệt sẽ thấy ngay giao diện trạng thái **ONLINE - RUNNING** thay vì màn hình lỗi 404 đen trắng.
- Dịch vụ sẵn sàng phục vụ các yêu cầu API từ ClientApp, Next.js Frontend (`lang-app`) và qua API Gateway.
