# LỊCH SỬ CÔNG VIỆC: CUNG CẤP FILE UPDATE DB COMMAND ĐỘC LẬP TẠI TỪNG SERVICE (PHẠM VI NỘI BỘ, KHÔNG DÙNG LỆNH CHUNG)

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Cung cấp file **`UPDATE DB COMMAND`** (và `UPDATE DB COMMAND.txt`, `UPDATE DB COMMAND.bat`) trực tiếp tại thư mục của từng microservice (`IELTSMaster.AuthService` và `IELTSMaster.BusinessService`).
  2. Đảm bảo lệnh cập nhật CSDL là **lệnh độc lập, tự vận hành hoàn toàn trong phạm vi (scope) của service đó**, tuyệt đối **không phụ thuộc hay gọi qua script/lệnh chung giữa các service**.
  3. Lập trình viên đang làm việc trong service nào thì chỉ cần chạy lệnh/script của service đó, CSDL của service đó sẽ tự động được kiểm tra và cập nhật Code-First vào đúng schema tương ứng (`auth` hoặc `business`).

## 2. Thời gian thực hiện
* **Thời gian:** 22:12 - 22:16, Ngày 03/10/2026.

## 3. Các file đã thay đổi / tạo mới

### A. Dịch vụ AuthService (Schema: auth)
1. `IELTSMaster.AuthService/UPDATE DB COMMAND` (Tạo mới): File hướng dẫn lệnh không đuôi mở rộng, đặt ngay thư mục gốc service.
2. `IELTSMaster.AuthService/UPDATE DB COMMAND.txt` (Cập nhật): Bản hướng dẫn chi tiết các lệnh Code-First (.NET CLI, PMC, Script) trong phạm vi riêng của `AuthService`.
3. `IELTSMaster.AuthService/UPDATE DB COMMAND.bat` (Tạo mới): File batch 1-Click để lập trình viên double-click chạy update CSDL cho riêng `AuthService`.
4. `IELTSMaster.AuthService/update_db.ps1` (Cập nhật): Script PowerShell tự động hóa, 100% tự vận hành (self-contained), không gọi qua bất kỳ script chia sẻ nào ở root.

### B. Dịch vụ BusinessService (Schema: business)
5. `IELTSMaster.BusinessService/UPDATE DB COMMAND` (Tạo mới): File hướng dẫn lệnh không đuôi mở rộng, đặt ngay thư mục gốc service.
6. `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt` (Cập nhật): Bản hướng dẫn chi tiết các lệnh Code-First trong phạm vi riêng của `BusinessService`.
7. `IELTSMaster.BusinessService/UPDATE DB COMMAND.bat` (Tạo mới): File batch 1-Click để lập trình viên double-click chạy update CSDL cho riêng `BusinessService`.
8. `IELTSMaster.BusinessService/update_db.ps1` (Cập nhật): Script PowerShell tự động hóa, 100% tự vận hành (self-contained), không gọi qua bất kỳ script chia sẻ nào ở root.

## 4. Lý do thay đổi
* Người dùng yêu cầu mỗi service phải có file `UPDATE DB COMMAND` riêng, và việc cập nhật phải nằm trọn trong phạm vi của service đó, không phải là 1 lệnh update chung bao trùm toàn bộ hệ thống.
* Đảm bảo tính đóng gói (encapsulation) và an toàn tuyệt đối khi phát triển microservices: Thay đổi schema của service này không bao giờ tác động đến service kia.
* Tuân thủ quy tắc làm việc trong `rule.md`.

## 5. Cách xử lý
1. **Thiết kế lệnh cục bộ (Local Execution)**:
   * Khi thực thi trong thư mục `IELTSMaster.AuthService`: Lệnh `dotnet ef database update` hoặc `update_db.ps1` tự động nhận diện project hiện tại là `AuthService`, chỉ làm việc với context `AuthDbContext` và schema `auth`.
   * Khi thực thi trong thư mục `IELTSMaster.BusinessService`: Lệnh chỉ làm việc với context `BusinessDbContext` và schema `business`.
2. **Loại bỏ hoàn toàn liên kết dùng chung**:
   * Viết lại `update_db.ps1` tại mỗi service thành script độc lập 100%, không còn phụ thuộc hay import script ngoài `scripts/sync-database.ps1`.
3. **Cung cấp file thực thi trực quan**:
   * Đặt file `UPDATE DB COMMAND.bat` ngay tại thư mục của service để lập trình viên chỉ cần double-click là hoàn tất việc cập nhật database của service đó.
4. **Kiểm thử thực tế**:
   * Chạy lệnh tại `IELTSMaster.AuthService\update_db.ps1`: Xác nhận quá trình cập nhật diễn ra độc lập, thông báo rõ ràng chỉ xử lý schema `auth` và kết thúc thành công với mã thoát 0.

## 6. Kết quả sau khi thực hiện
* **Phạm vi cô lập 100%**: Mỗi service có lệnh cập nhật hoàn toàn riêng biệt.
* **Đầy đủ định dạng**: Có cả file văn bản `UPDATE DB COMMAND`, `UPDATE DB COMMAND.txt` và file chạy `UPDATE DB COMMAND.bat` trong từng service.
* **Tuân thủ quy tắc `rule.md`**: Đầy đủ 5 bước và đã lưu lịch sử vào `WORKHISTORY`.
