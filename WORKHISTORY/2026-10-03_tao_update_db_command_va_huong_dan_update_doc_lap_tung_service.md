# LỊCH SỬ CÔNG VIỆC: CUNG CẤP LỆNH UPDATE DB COMMAND RIÊNG BIỆT CHO TỪNG DỊCH VỤ VÀ CÔ LẬP PHẠM VI ẢNH HƯỞNG THEO SCHEMA

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Làm rõ cơ chế cập nhật cơ sở dữ liệu sau khi đã phân tách độc lập các Schema (`auth` và `business`) trên cùng database PostgreSQL `lang-simulator`.
  2. Xác nhận và thiết lập quy trình **cập nhật riêng lẻ, thủ công hoặc bán tự động theo từng project/service** nhằm cô lập hoàn toàn phạm vi ảnh hưởng (giảm thiểu blast radius), không để thay đổi của service này tác động tới service kia.
  3. Cung cấp file **`UPDATE DB COMMAND.txt`** đặt tại thư mục gốc của từng microservice (`IELTSMaster.AuthService` và `IELTSMaster.BusinessService`), tương tự như dự án tham chiếu `C:\Users\Admin\Desktop\HINOVA-PROJECT\cbt-quangninh\UPDATE DB COMMAND.txt`.
  4. Cung cấp đầy đủ cú pháp cho cả:
     * **Code-First (EF Migrations)**: Áp dụng khi lập trình viên sửa code Entity trong C# rồi đẩy xuống PostgreSQL.
     * **Database-First (`Scaffold-DbContext`)**: Áp dụng khi lập trình viên chỉnh sửa bảng trực tiếp trên PostgreSQL rồi kéo class C# về (giống hệt phong cách CBT-QuangNinh nhưng có thêm bộ lọc schema cô lập).
     * **PowerShell Tool 1-Click riêng biệt**: Cho phép chạy riêng từng service (`-Service Auth` hoặc `-Service Business`).

## 2. Thời gian thực hiện
* **Thời gian:** 22:00 - 22:03, Ngày 03/10/2026.

## 3. Các file đã thay đổi / tạo mới
1. `IELTSMaster.AuthService/UPDATE DB COMMAND.txt` (Tạo mới): Chứa toàn bộ các lệnh cập nhật database chuyên biệt cho `AuthService` (giới hạn tuyệt đối trong schema `auth`).
2. `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt` (Tạo mới): Chứa toàn bộ các lệnh cập nhật database chuyên biệt cho `BusinessService` (giới hạn tuyệt đối trong schema `business`).
3. `WORKHISTORY/2026-10-03_tao_update_db_command_va_huong_dan_update_doc_lap_tung_service.md` (Tạo mới): Ghi nhận toàn bộ thông tin công việc theo `rule.md`.

## 4. Lý do thay đổi
* Người dùng muốn nắm rõ quy chế cập nhật khi hệ thống có nhiều schema độc lập: Liệu có thể update riêng lẻ từng project để tránh rủi ro ảnh hưởng chéo hay không?
* Yêu cầu mỗi service phải có một file tài liệu hướng dẫn/lệnh thực thi trực tiếp dạng `UPDATE DB COMMAND.txt` tương tự như dự án mẫu `CBT-QuangNinh` để lập trình viên có thể mở ra, copy và chạy nhanh bất kỳ lúc nào.

## 5. Cách xử lý
1. **Phân tích cơ chế cô lập của Database Schema**:
   * Trên PostgreSQL `lang-simulator`:
     * `AuthService` nắm quyền quản trị schema `auth` (6 bảng: users, tenants, service_plans, memberships, membership_roles, refresh_tokens).
     * `BusinessService` nắm quyền quản trị schema `business` (39 bảng: courses, classrooms, exams, lessons, v.v.).
   * Khi thực hiện cập nhật cho `AuthService`: Toàn bộ câu lệnh SQL (tạo bảng, thêm cột, sửa khóa ngoại) chỉ tác động vào namespace `auth.*`. Schema `business` hoàn toàn vô can và không chịu bất kỳ gián đoạn nào.
   * Khi thực hiện cập nhật cho `BusinessService`: Toàn bộ câu lệnh SQL chỉ tác động vào namespace `business.*`.
2. **Soạn thảo file `UPDATE DB COMMAND.txt`**:
   * Định dạng chuẩn hóa, dễ đọc, sẵn sàng copy-paste.
   * Bao gồm cả lệnh Package Manager Console (cho Visual Studio) và .NET CLI (cho Visual Studio Code / Terminal / CMD).
   * Cung cấp lệnh `Scaffold-DbContext` với cờ lọc schema rõ ràng (`-Schemas "auth"` hoặc `-Schemas "business"`) giúp việc kéo model Database-First không bị lẫn lộn giữa 2 service.
3. **Kiểm thử thực tế**:
   * Chạy lệnh cập nhật riêng cho `AuthService`: `.\scripts\sync-database.ps1 -Service Auth`.
   * Kết quả: Script chỉ tương tác với project `AuthService` và schema `auth`, hoàn toàn không đụng đến `BusinessService`.

## 6. Kết quả sau khi thực hiện
* **Tính độc lập 100%**: Việc cập nhật database của mỗi microservice hoàn toàn có thể thực hiện riêng lẻ, cô lập phạm vi rủi ro.
* **Tiện ích cho lập trình viên**:
  * Tại `IELTSMaster.AuthService/UPDATE DB COMMAND.txt`: Lệnh update sẵn sàng.
  * Tại `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt`: Lệnh update sẵn sàng.
* **Đúng chuẩn quy tắc `rule.md`**: Đầy đủ 5 bước và đã lưu vết chi tiết vào `WORKHISTORY`.
