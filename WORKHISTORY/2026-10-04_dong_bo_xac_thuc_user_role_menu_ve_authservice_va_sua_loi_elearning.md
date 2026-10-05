# ĐỒNG BỘ XÁC THỰC, USER, ROLE, MENU VỀ AUTH SERVICE VÀ SỬA LỖI E-LEARNING

## 1. MÔ TẢ CÔNG VIỆC CẦN THỰC HIỆN (BƯỚC 1 THEO RULE.MD)
- **Vấn đề trước khi xử lý:**
  1. Frontend gọi `https://localhost:7083/business/System/Menu/get-list-by-user?id=ea016a85-cd84-47d6-b4b1-d6bbef2a6e4a` bị lỗi `HTTP ERROR 404`. Nguyên nhân do hệ thống Menu và Phân quyền trước đây nằm rải rác hoặc hardcode tạm bợ ở `BusinessService` mà không có controller lưu DB thực tế.
  2. Phân hệ E-Learning (`IELTSMaster.ELearning` - `lang-api`) bị crash lúc khởi động do thiếu thư viện phụ thuộc `exceljs`. Phân hệ web (`lang-app`) bị lỗi biên dịch TypeScript `TS2322` trong component `AuthProvider.tsx`.
  3. Cần quy hoạch tập trung Single Source of Truth: Toàn bộ nghiệp vụ xác thực (Authentication), tài khoản (User), vai trò (Role), nhóm hệ thống (SystemGroup) và Menu phải thuộc quyền quản lý duy nhất của `IELTSMaster.AuthService`. `ELearning` gọi chung SSO từ đây. `BusinessService` và giao diện frontend `ClientApp` kết nối đồng bộ tương tự qua ApiGateway.

- **Mục tiêu đạt được:**
  - `ELearning` (`lang-api` và `lang-app`) chạy hoàn toàn ổn định, không lỗi compile/build/start.
  - Đưa toàn bộ cấu trúc Menu & SystemGroup vào `AuthService` (bảng `auth.menus` và `auth.system_groups`), có đầy đủ CRUD API, Auto Seeder và EF Core Migration.
  - Cập nhật frontend `ClientApp` trỏ toàn bộ endpoint Menu, SystemGroup, User, Role sang `/auth/...` qua `ApiGateway` (`https://localhost:7083/auth/...`).
  - Dọn dẹp sạch sẽ các Controller và Entity trùng lặp trong `BusinessService`.

---

## 2. XÁC ĐỊNH FILE / MODULE CẦN THỰC HIỆN (BƯỚC 2 THEO RULE.MD)

| STT | File / Thư mục | Module / Dự án | Lý do thực hiện |
|:---:|---|---|---|
| 1 | `IELTSMaster.ELearning/apps/lang-api/package.json` | E-Learning API | Bổ sung và cài đặt `exceljs` để tránh crash runtime. |
| 2 | `IELTSMaster.ELearning/apps/lang-app/src/components/auth/AuthProvider.tsx` | E-Learning Web | Sửa lỗi TypeScript mismatch kiểu trả về của callback `activate`. |
| 3 | `IELTSMaster.AuthService/Entities/SystemGroup.cs` | AuthService Backend | Tạo Entity Nhóm chức năng hệ thống trong schema `auth`. |
| 4 | `IELTSMaster.AuthService/Entities/Menu.cs` | AuthService Backend | Tạo Entity Menu và phân quyền hiển thị menu trong schema `auth`. |
| 5 | `IELTSMaster.AuthService/DTOs/MenuDtos.cs` | AuthService Backend | Khai báo các DTO phục vụ danh sách, phân trang, combobox cho Menu & SystemGroup. |
| 6 | `IELTSMaster.AuthService/Infrastructure/Data/AuthDbContext.cs` | AuthService Backend | Đăng ký `DbSet<SystemGroup>`, `DbSet<Menu>` và mapping bảng `auth.system_groups`, `auth.menus`. |
| 7 | `IELTSMaster.AuthService/Infrastructure/Data/AuthDataSeeder.cs` | AuthService Backend | Tạo Seeder tự động nạp 3 nhóm hệ thống và 9 menu phân quyền mặc định. |
| 8 | `IELTSMaster.AuthService/Controllers/SystemGroupsController.cs` | AuthService Backend | Viết Controller cung cấp các endpoint `get-all`, `get-list`, `get-by-id`, `insert`, `update`, `delete-list`. |
| 9 | `IELTSMaster.AuthService/Controllers/MenusController.cs` | AuthService Backend | Viết Controller cung cấp các endpoint `get-list-by-user`, `get-list`, `get-by-id`, `insert`, `update`, `delete-list`. |
| 10 | `IELTSMaster.AuthService/Program.cs` | AuthService Backend | Kích hoạt gọi `AuthDataSeeder.SeedAsync` khi dịch vụ khởi động. |
| 11 | `IELTSMaster.BusinessService/Controllers/MenuController.cs` | BusinessService Backend | Xóa bỏ controller thừa, tránh nhầm lẫn nghiệp vụ. |
| 12 | `IELTSMaster.BusinessService/ClientApp/src/config/constants.ts` | Frontend ClientApp | Cập nhật `SYSTEM_GROUP_BASE` và `MENU_BASE` trỏ chính xác về `/auth/System/...`. |

---

## 3. MÔ TẢ CÁCH THỰC HIỆN (BƯỚC 3 THEO RULE.MD)

### 3.1. Khắc phục lỗi và chạy E-Learning:
- Chạy `pnpm install` trong thư mục `IELTSMaster.ELearning` để cài đặt đầy đủ node_modules cho cả `lang-api` và `lang-app`.
- Sửa hàm `activate` trong `AuthProvider.tsx` thành `async () => { await switchTenant(tenantId); }` để khớp với định nghĩa `Promise<void>`.
- Chạy kiểm tra build `pnpm --filter lang-api build` và `pnpm --filter lang-app build`.

### 3.2. Chuyển Menu & SystemGroup về AuthService:
- Thiết kế Entity `SystemGroup` và `Menu` tuân thủ Clean Architecture, ánh xạ vào schema `auth`:
  - `auth.system_groups`: `id`, `name`, `sort`, `parent_id`, `is_edit`, `is_actived`, `created_at`, `updated_at`.
  - `auth.menus`: `id`, `system_group_id`, `name`, `controller`, `sort`, các cờ phân quyền (`can_view`, `can_add`, `can_update`, `can_delete`, `can_approve`, `can_analyze`, `is_show_menu`, `is_edit`, `is_actived`).
- Tạo và áp dụng Migration EF Core:
  - `dotnet ef migrations add Add_SystemGroups_And_Menus -c AuthDbContext`
  - `dotnet ef database update -c AuthDbContext`
- Viết seeder nạp dữ liệu phân nhóm và menu:
  1. Nhóm **"Hệ thống"** (`Sort: 1`):
     - Người dùng (`/user`, Controller: `User`)
     - Vai trò & Phân quyền (`/role`, Controller: `Role`)
     - Quản lý Menu (`/menu`, Controller: `Menu`)
     - Quản lý Nhóm hệ thống (`/systemgroup`, Controller: `SystemGroup`)
  2. Nhóm **"E-Learning & Luyện thi"** (`Sort: 2`):
     - Luyện thi IELTS Online (`/elearning`, Controller: `ELearning`)
     - Ngân hàng Đề thi (`/exams`, Controller: `Exam`)
     - Khóa học Trực tuyến (`/courses`, Controller: `Course`)
  3. Nhóm **"Đào tạo & Học vụ"** (`Sort: 3`):
     - Quản lý Lớp học (`/classrooms`, Controller: `Classroom`)
     - Điểm danh & Học tập (`/attendance`, Controller: `Attendance`)

### 3.3. Đồng bộ giao diện ClientApp và ApiGateway:
- Sửa `constants.ts` trong ClientApp:
  ```typescript
  const AUTH_SYSTEM_BASE = "/auth/System";
  SystemGroup: {
    GET_LIST: `${AUTH_SYSTEM_BASE}/SystemGroup/get-list`,
    GET_ALL: `${AUTH_SYSTEM_BASE}/SystemGroup/get-all`,
    ...
  },
  Menu: {
    GET_LIST_BY_USER: `${AUTH_SYSTEM_BASE}/Menu/get-list-by-user`,
    ...
  }
  ```
- Định tuyến qua ApiGateway YARP:
  - Đường dẫn client gọi: `/auth/System/Menu/get-list-by-user?id=...`
  - YARP cắt prefix `/auth` -> gửi tới `http://localhost:5175/api/System/Menu/get-list-by-user`
  - Controller `MenusController` với `[Route("api/System/Menu")]` tiếp nhận và trả kết quả JSON 200.

---

## 4. THỰC HIỆN CÔNG VIỆC VÀ KIỂM TRA (BƯỚC 4 THEO RULE.MD)

### 4.1. Kết quả kiểm tra E-Learning:
- `lang-api`: Biên dịch TypeScript và đóng gói NestJS thành công 100%. Đã test khởi động Nest application lắng nghe tại port 3101, route map đầy đủ.
- `lang-app`: Next.js 14.2 build thành công toàn bộ 17 static/SSG/dynamic routes mà không còn bất kỳ lỗi nào.

### 4.2. Kết quả kiểm tra Database Migration:
- Migration `20261004065346_Add_SystemGroups_And_Menus` đã được cập nhật thành công vào CSDL PostgreSQL `lang-simulator`.
- Bảng `auth.system_groups` và `auth.menus` đã được tạo và nạp thành công 3 SystemGroups cùng 9 Menus mặc định thông qua `AuthDataSeeder`.

### 4.3. Kết quả kiểm tra API AuthService:
- Endpoint `GET http://localhost:56116/api/SystemGroup/get-all`: Trả về `HTTP 200 OK`, `success: true` với toàn bộ danh sách 3 nhóm hệ thống.
- Endpoint `GET http://localhost:56116/api/System/Menu/get-list-by-user?id=ea016a85-cd84-47d6-b4b1-d6bbef2a6e4a`: Trả về `HTTP 200 OK` với danh sách menu phân quyền của người dùng.

### 4.4. Kết quả kiểm tra Frontend ClientApp:
- Chạy lệnh `npm run build` trong `IELTSMaster.BusinessService/ClientApp`: Đóng gói hoàn tất trong 2.01s với **0 lỗi**.

---

## 5. KẾT QUẢ VÀ LƯU Ý VẬN HÀNH (BƯỚC 5 THEO RULE.MD)

1. **Khắc phục triệt để lỗi 404:**
   - Không còn lỗi 404 `/business/System/Menu/get-list-by-user` vì đường dẫn đã được chuẩn hóa sang `/auth/System/Menu/get-list-by-user` và phục vụ trực tiếp từ `AuthService`.
2. **Kiến trúc đồng bộ chuẩn:**
   - `AuthService` là nơi duy nhất giữ User, Role, SystemGroup, Menu.
   - `ELearning` (lang-api & lang-web) và `BusinessService` (ClientApp) đều sử dụng chung nguồn dữ liệu xác thực và phân quyền này.
3. **Lưu ý khi chạy trên Visual Studio:**
   - Nếu Visual Studio đang khóa file `.pdb` hoặc đang giữ debug session cũ, hãy bấm **Stop Debugging (Shift + F5)** và chạy lại **Start Debugging (F5)** để AppHost nạp các dll mới nhất của AuthService và BusinessService.
