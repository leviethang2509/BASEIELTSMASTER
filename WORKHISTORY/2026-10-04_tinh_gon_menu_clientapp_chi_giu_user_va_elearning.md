# LỊCH SỬ CÔNG VIỆC: TINH GỌN MENU CLIENTAPP - CHỈ GIỮ LẠI CỔNG E-LEARNING VÀ QUẢN LÝ NGƯỜI DÙNG

## 1. Thông tin chung
- **Thời gian thực hiện**: 2026-10-04
- **Dự án**: IELTS Master (`IELTSMaster.BusinessService/ClientApp`)
- **Người thực hiện**: Antigravity Pair Programmer
- **Yêu cầu của User**:
  - `http://localhost:5173/user chỉ giữ lại cổng elerning và quản lý người dùng`
  - Tinh gọn giao diện trang quản trị `ClientApp`, trên thanh điều hướng Sidebar chỉ giữ lại duy nhất 2 mục:
    1. **Quản lý Người dùng** (`/user`)
    2. **Cổng E-Learning** (`http://localhost:3100`)

---

## 2. Chi tiết các thay đổi đã thực hiện

### 2.1 Cập nhật AppSidebar (`src/components/layout/MainLayout/app-sidebar.tsx`)
- [app-sidebar.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/components/layout/MainLayout/app-sidebar.tsx):
  - **Loại bỏ**:
    - Mục "Tổng quan vận hành" (`/`).
    - Mục "Phân quyền & Vai trò" (`/role`).
    - Cụm rendering các nhóm menu động (`rootGroups.map(...)` từ database `systemGroup` và `menu`).
  - **Chỉ giữ lại**:
    - Mục **Quản lý Người dùng** (`/user`) với icon `Users`.
    - Mục **Cổng E-Learning** (link ngoài sang `http://localhost:3100`) với icon `GraduationCap` và `ExternalLink`.
  - **Header Logo**:
    - Cập nhật link biểu trưng BrandMark trỏ thẳng tới `/user` thay vì `/`.

### 2.2 Cập nhật Router (`src/Router.tsx`)
- [Router.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/Router.tsx):
  - Điều hướng tuyến đường gốc `/` tự động chuyển hướng (`<Navigate to="/user" replace />`) vào `/user`.
  - Giữ lại route `/user` phục vụ tính năng Quản lý Người dùng.
  - Tinh gọn các route không còn dùng trên menu.

### 2.3 Cập nhật Luồng Đăng nhập (`LoginPage.tsx`)
- [LoginPage.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/routes/Auth/LoginPage.tsx):
  - Sau khi đăng nhập thành công, điều hướng thẳng vào `navigate("/user")`.

### 2.4 Cập nhật Breadcrumb (`MainLayout.tsx`)
- [MainLayout.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/components/layout/MainLayout/MainLayout.tsx):
  - Thiết lập breadcrumb mặc định cho `user`: nhóm "Hệ thống" > trang "Quản lý Người dùng".

---

## 3. Kiểm tra và xác thực
- **Build Frontend**: Chạy `npm run build` trên `ClientApp`:
  - `tsc -b && vite build` hoàn thành thành công trong **1.42s**, không có lỗi TypeScript hay cú pháp.
- **Build Backend**: Chạy `dotnet build IELTSMaster.BusinessService -t:Compile`:
  - Thành công với **0 Errors**.
