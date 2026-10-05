# LỊCH SỬ CÔNG VIỆC: TỐI ƯU HÓA QUY TRÌNH CHỌN PROJECT ĐỂ UPDATE DATABASE VÀ TINH GỌN FILE UPDATE DB COMMAND

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Cải tiến quy trình cập nhật CSDL Code-First theo phản hồi của người dùng: Cho phép lập trình viên **chỉ cần chạy một lệnh duy nhất và chọn đúng project là update ngay lập tức**.
  2. Tinh chỉnh và đồng bộ lại toàn bộ các file `UPDATE DB COMMAND` ở cả cấp Solution và trong từng Service, đạt độ tối giản và trực diện tương tự như dự án mẫu `CBT-QuangNinh`.
  3. Cung cấp 2 kịch bản làm việc thuận tiện nhất cho lập trình viên .NET:
     * **Kịch bản 1 (Visual Studio - Package Manager Console)**: Tại ô dropdown "Default project", chọn đúng project (`IELTSMaster.AuthService` hoặc `IELTSMaster.BusinessService`) $\rightarrow$ Dán 1 dòng lệnh: `Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")); Update-Database`.
     * **Kịch bản 2 (Terminal / PowerShell / VS Code)**: Chạy 1 lệnh duy nhất: `.\update-db.ps1` $\rightarrow$ Màn hình hiện menu chọn `[1]` hoặc `[2]` để update đúng project đó.

## 2. Thời gian thực hiện
* **Thời gian:** 22:18 - 22:23, Ngày 03/10/2026.

## 3. Các file đã thay đổi / tạo mới

### A. Công cụ cập nhật chọn project tại root Solution
1. `update-db.ps1` (Tạo mới): Script PowerShell tương tác tại thư mục gốc solution, cho phép chọn project `[1] AuthService` hoặc `[2] BusinessService` để tự động kiểm tra Entity và cập nhật vào đúng schema PostgreSQL tương ứng.
2. `UPDATE DB COMMAND.txt` (Tạo mới tại root): Bản hướng dẫn lệnh ngắn gọn ở cấp solution.
3. `UPDATE DB COMMAND` (Tạo mới tại root): Bản không đuôi mở rộng ở cấp solution.

### B. Tinh gọn file lệnh tại AuthService
4. `IELTSMaster.AuthService/UPDATE DB COMMAND.txt` (Cập nhật): Rút gọn nội dung, tập trung vào 2 lệnh chính (chọn project trong PMC hoặc chạy `.\update-db.ps1 1`).
5. `IELTSMaster.AuthService/UPDATE DB COMMAND` (Cập nhật): Bản không đuôi mở rộng tương ứng.

### C. Tinh gọn file lệnh tại BusinessService
6. `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt` (Cập nhật): Rút gọn nội dung, tập trung vào 2 lệnh chính (chọn project trong PMC hoặc chạy `.\update-db.ps1 2`).
7. `IELTSMaster.BusinessService/UPDATE DB COMMAND` (Cập nhật): Bản không đuôi mở rộng tương ứng.

## 4. Lý do thay đổi
* Người dùng phản hồi cách làm trước đó chưa tối ưu (quá nhiều file và nhiều lựa chọn rườm rà).
* Yêu cầu quy trình trực diện: "chỉ chạy lệnh và chọn đúng project là update", sau đó điều chỉnh lại `UPDATE DB COMMAND`.
* Tuân thủ quy tắc làm việc trong `rule.md`.

## 5. Cách xử lý
1. **Thiết kế script tương tác `update-db.ps1`**:
   * Khi chạy `.\update-db.ps1` không tham số: Hiển thị giao diện menu trực quan cho phép người dùng nhập `1` (Auth) hoặc `2` (Business).
   * Khi truyền tham số: `.\update-db.ps1 1` hoặc `.\update-db.ps1 2` $\rightarrow$ Chạy thẳng không cần hỏi.
   * Tự động sinh migration kèm timestamp duy nhất và tự động update PostgreSQL schema tương ứng.
   * Tự động dọn dẹp migration rỗng nếu model không có thay đổi.
2. **Chuẩn hóa lệnh 1 dòng cho Visual Studio Package Manager Console**:
   * Sử dụng lệnh chuỗi: `Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")); Update-Database`.
   * Lệnh này tận dụng dropdown "Default project" có sẵn trong Visual Studio để nhắm trúng project cần sửa.
3. **Kiểm thử thực tế**:
   * Chạy `.\update-db.ps1 1`: Xác nhận cập nhật độc lập cho `IELTSMaster.AuthService` (schema: `auth`) thành công.
   * Chạy `.\update-db.ps1 2`: Xác nhận cập nhật độc lập cho `IELTSMaster.BusinessService` (schema: `business`) thành công.

## 6. Kết quả sau khi thực hiện
* **Trải nghiệm tối giản và cực nhanh**: Đúng theo yêu cầu của người dùng, lập trình viên chỉ cần chạy 1 lệnh và chọn project là xong.
* **Tài liệu ngắn gọn**: File `UPDATE DB COMMAND` ở mọi vị trí đều đạt độ tinh gọn tối đa, dễ nhìn, copy chạy ngay.
* **Tuân thủ quy tắc `rule.md`**: Đầy đủ 5 bước và đã lưu lịch sử vào `WORKHISTORY`.
