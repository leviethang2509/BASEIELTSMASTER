# LỊCH SỬ CÔNG VIỆC: GIẢI THÍCH NGUYÊN NHÂN LỖI APPHOST TRONG PACKAGE MANAGER CONSOLE VÀ HƯỚNG DẪN THỰC THI

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Giải thích nguyên nhân cốt lõi khi người dùng chạy lệnh ngắn `Add-Migration...; Update-Database` bị báo lỗi: `Your startup project 'IELTSMaster.AppHost' doesn't reference Microsoft.EntityFrameworkCore.Design...`.
  2. Phân tích sự khác biệt giữa `Default project` (trong PMC) và `Startup Project` (trong Solution Explorer).
  3. Hướng dẫn 2 phương án thực thi để lập trình viên lựa chọn:
     * Phương án 1 (Khuyên dùng): Dùng lệnh có `-StartupProject $p` ở dòng 12 file `UPDATE DB COMMAND.txt` để không cần đổi project khởi động trong Solution Explorer.
     * Phương án 2: Chuột phải vào Service chọn "Set as Startup Project" trong Visual Studio rồi chạy câu lệnh ngắn.

## 2. Thời gian thực hiện
* **Thời gian:** 22:34 - 22:36, Ngày 03/10/2026.

## 3. Các file liên quan
1. `UPDATE DB COMMAND.txt` (Root).
2. `IELTSMaster.AuthService/UPDATE DB COMMAND.txt`.
3. `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt`.
4. `WORKHISTORY/2026-10-03_giai_thich_va_huong_dan_chay_lenh_pmc_co_startup_project.md` (Tạo mới).

## 4. Lý do và cách xử lý
* Xem chi tiết trong phần giải thích gửi người dùng.

## 5. Kết quả
* Đã giải thích rõ ràng cơ chế vận hành của EF Core trong Visual Studio Package Manager Console.
* Tuân thủ quy tắc `rule.md`.
