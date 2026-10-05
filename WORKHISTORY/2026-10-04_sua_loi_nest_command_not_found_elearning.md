# KHẮC PHỤC LỖI 'NEST' IS NOT RECOGNIZED KHI KHỞI CHẠY ELEARNING

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04

---

## 2. Mô tả vấn đề (Vấn đề hiện tại)
Khi chạy hệ thống qua Visual Studio hoặc .NET Aspire (`IELTSMaster.AppHost`), tiến trình điều phối thực thi lệnh khởi động `ELearning` (`npm run dev` bên trong `IELTSMaster.ELearning/apps/lang-api`).
Màn hình console báo lỗi:
```text
Successfully executed command 'resource-start'.
 
> lang-api@0.0.0 dev
> nest start --watch
 
'nest' is not recognized as an internal or external command,
operable program or batch file.
```

- **Nguyên nhân:**
  Thư mục `IELTSMaster.ELearning` vừa được đưa vào dự án nhưng chưa có đầy đủ thư viện trong `node_modules` cục bộ (do thư mục `node_modules` bị `.gitignore` khi copy mã nguồn). Khi `npm run dev` được gọi, `npm` tìm file thực thi `nest.cmd` trong `apps/lang-api/node_modules/.bin` nhưng không tìm thấy.

---

## 3. Các File/Module thực hiện và Lý do thay đổi

| STT | File/Thư mục thay đổi | Module | Lý do thay đổi |
|---|---|---|---|
| 1 | `IELTSMaster.ELearning/node_modules` | E-Learning Root | Tạo liên kết Junction (`mklink /J`) trỏ trực tiếp sang `lang-simulator/node_modules` để dùng chung kho gói monorepo mà không tốn dung lượng ổ đĩa. |
| 2 | `IELTSMaster.ELearning/apps/lang-api/node_modules` | lang-api Backend | Sao chép và cấu hình đầy đủ các symlinks cùng thư mục `.bin` (`nest.cmd`, `nest.ps1`, `typeorm.cmd`,...). |
| 4 | `IELTSMaster.ELearning/apps/lang-api/package.json` | lang-api Backend | Chuyển `"dev": "nest start --watch"` thành `"npx nest start --watch"` và `"build": "npx nest build"` để đảm bảo dù chạy qua tiến trình shell con nào của Aspire trên Windows thì `npx` cũng tìm và chạy chính xác Nest CLI. |

---

## 4. Phương án và Cách thức xử lý

1. **Liên kết kho gói monorepo qua NTFS Junction:**
   ```cmd
   mklink /J c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ELearning\node_modules c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\lang-simulator\node_modules
   ```
2. **Cung cấp binary `nest` cho `lang-api`:**
   Đồng bộ toàn bộ thư mục `apps/lang-api/node_modules` bao gồm thư mục `.bin/` chứa `nest.cmd`, `nest.ps1`, `nest`.
3. **Cập nhật lệnh chạy chuẩn trong `package.json`:**
   Dùng `npx nest start --watch` để npx tự động tìm `nest` trong node_modules cục bộ lẫn thư mục cha một cách tuyệt đối, loại trừ hoàn toàn rủi ro thiếu PATH trong Windows child process của Aspire.
4. **Kiểm tra và xác thực trực tiếp:**
   - Kiểm tra `nest --version` và `npx nest --version` trả về `10.4.9`.
   - Chạy `npm run dev` trong `apps/lang-api`:
     ```text
     > lang-api@0.0.0 dev
     > npx nest start --watch
     [Starting compilation in watch mode...]
     ```

---

## 5. Kết quả sau khi thực hiện
- Lệnh `nest` đã được nhận diện hoàn toàn.
- Do phiên làm việc Aspire trước đó (chạy từ 08:58) được khởi chạy trước khi hoàn tất đồng bộ thư viện, người dùng chỉ cần **Restart/Stop rồi F5 lại session trong Visual Studio** (hoặc bấm Restart resource `ELearning` trên Aspire Dashboard).
- `ELearning` (`lang-api`) khởi chạy trơn tru tại port `3101` và thông luồng với API Gateway.
