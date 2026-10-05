# LỊCH SỬ CÔNG VIỆC: ĐỒNG BỘ DỮ LIỆU NGƯỜI DÙNG GIỮA BUSINESSSERVICE VÀ ELEARNING TRÊN NỀN TẢNG AUTHSERVICE

## 1. Thông tin chung
- **Thời gian thực hiện:** 04/10/2026.
- **Người thực hiện:** Antigravity AI Assistant.
- **Dự án liên quan:**
  - `IELTSMaster.AuthService` (Single Source of Truth)
  - `IELTSMaster.BusinessService` (`ClientApp` frontend)
  - `IELTSMaster.ELearning` (`lang-api` và `lang-app`)

---

## 2. Mô tả công việc cần thực hiện (Bước 1 - rule.md)

- **Vấn đề hiện tại:**
  - Người dùng kiểm tra thấy dữ liệu người dùng giữa hai giao diện:
    - `http://localhost:5173/user` (Giao diện Quản lý Người dùng của BusinessService)
    - `http://localhost:3100/admin/users` (Giao diện Quản trị Người dùng của ELearning)
    chưa đồng bộ: trang trên ELearning hiển thị đủ 2 tài khoản (`admin@langsimulator.com` và `thang@gmail.com`), trong khi trang trên BusinessService bị rỗng/trắng bảng.
  - **Nguyên nhân cốt lõi:**
    - Cả hai hệ thống đều đang trỏ vào cùng cơ sở dữ liệu PostgreSQL `lang-simulator`: `AuthService` quản lý bảng gốc `auth.users`, còn `ELearning` truy vấn qua view `public.users` (thực chất là `SELECT * FROM auth.users`).
    - Lỗi là do **lệch giao thức API (Contract Mismatch)**: Trang `UserPage` trên `ClientApp` gửi request HTTP `POST /auth/users`, nhưng `UsersController.cs` trên `AuthService` chỉ có `[HttpGet]`, dẫn đến lỗi `404/405 Method Not Allowed`, khiến bảng trên `http://localhost:5173/user` không thể tải dữ liệu.
- **Mục tiêu & Kết quả mong muốn:**
  - Đồng bộ 100% dữ liệu người dùng giữa `BusinessService` và `ELearning` thông qua `AuthService`.
  - Hỗ trợ đầy đủ chức năng Quản lý Người dùng (CRUD, Khóa/Mở khóa, Phân vai trò hệ thống) trên `http://localhost:5173/user` kết nối trực tiếp vào bảng `auth.users`.

---

## 3. Xác định File/Module cần thực hiện (Bước 2 - rule.md)

1. **`IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs`**:
   - Thêm các DTO: `CreateUserRequest`, `UpdateUserRequest`, `DeleteUsersRequest`, `GetUserListRequest`.
   - Bổ sung các thuộc tính tương thích ngược trong `UserManagementDto` (`Username`, `Fullname`, `RoleId`, `Role`, `IsActived`, `Avatar`).
2. **`IELTSMaster.AuthService/Controllers/UsersController.cs`**:
   - Inject `IPasswordHasher` để băm mật khẩu người dùng bằng BCrypt.
   - Thêm endpoint `[HttpPost("get-list")]` xử lý phân trang và tìm kiếm.
   - Thêm endpoint `[HttpPost]` tạo mới người dùng.
   - Thêm endpoint `[HttpPut("{id}")]` cập nhật người dùng.
   - Thêm endpoint `[HttpDelete("{id}")]` và `[HttpDelete("delete-list")]` xóa người dùng.
   - Thêm endpoint `[HttpPost("{id}/lock")]` và `[HttpPost("{id}/unlock")]` khóa/mở khóa tài khoản.
3. **`IELTSMaster.BusinessService/ClientApp/src/config/constants.ts`**:
   - Chuẩn hóa endpoint `GET_LIST` (`/auth/users/get-list`) và `DELETE_LIST` (`/auth/users/delete-list`).
4. **`IELTSMaster.BusinessService/ClientApp/src/features/system/types/user.types.ts`**:
   - Mở rộng interface `User` với các trường tương thích từ `AuthService`.
5. **`IELTSMaster.BusinessService/ClientApp/src/features/system/api/user.api.ts`**:
   - Chuẩn hóa các hàm gọi API REST (`getById`, `update`, `lockUser`, `unlockUser`).
6. **`IELTSMaster.BusinessService/ClientApp/src/features/system/api/role.api.ts`**:
   - Bổ sung mapper tự động chuyển đổi danh sách vai trò sang dạng `ModelCombobox[]` cho dropdown.
7. **`IELTSMaster.BusinessService/ClientApp/src/features/system/routes/User/columns.tsx`**:
   - Nâng cấp cột hiển thị: Email, Họ và tên (kèm Avatar), Vai trò hệ thống (Badge màu với icon), Cơ sở trực thuộc, Trạng thái (Hoạt động / Đã khóa), và Menu hành động (Sửa, Khóa/Mở khóa, Xóa).
8. **`IELTSMaster.BusinessService/ClientApp/src/features/system/routes/User/PopupDetail.tsx`**:
   - Form Thêm mới / Chỉnh sửa người dùng đồng bộ: Email, Mật khẩu (tùy chọn khi cập nhật), Họ và tên, Số điện thoại, Vai trò hệ thống, Trạng thái.
9. **`IELTSMaster.BusinessService/ClientApp/src/features/system/routes/User/UserPage.tsx`**:
   - Truyền hàm `getList` làm refresh callback cho `columns.tsx` để bảng tự cập nhật ngay khi khóa/mở khóa tài khoản.

---

## 4. Mô tả cách thực hiện (Bước 3 - rule.md)

1. Cập nhật DTO và Controller trong backend `AuthService` để vừa hỗ trợ phân trang cho frontend `UserPage`, vừa cung cấp trọn vẹn vòng đời tài khoản (CRUD + Lock/Unlock).
2. Tích hợp `IPasswordHasher` để mật khẩu luôn được lưu dưới dạng BCrypt hash tương thích 100% với cả `AuthService` và `lang-api` (E-Learning).
3. Cập nhật frontend `ClientApp` để kết nối vào các endpoint mới của `AuthService`, đồng thời hiển thị giao diện trực quan và chuyên nghiệp.
4. Kiểm tra biên dịch frontend (`npm run build`) và xác nhận logic mã nguồn backend.

---

## 5. Kết quả thực hiện (Bước 4 & 5 - rule.md)

- **Frontend Build:** `npm run build` trên `ClientApp` hoàn tất thành công **0 lỗi trong 1.46 giây**.
- **Backend AuthService:** Đã bổ sung toàn diện các endpoint quản lý tài khoản vào `UsersController.cs` và DTOs vào `RolePermissionDtos.cs`.
- **Dữ liệu đồng bộ:** Cả `http://localhost:5173/user`, `http://localhost:5173/role` và `http://localhost:3100/admin/users` đều khai thác trực tiếp trên cùng một bảng dữ liệu `auth.users` của PostgreSQL, đảm bảo tính nhất quán tuyệt đối của hệ thống.
