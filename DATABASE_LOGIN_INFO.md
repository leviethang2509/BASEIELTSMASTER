# Hướng Dẫn Thông Tin Đăng Nhập Cơ Sở Dữ Liệu & Hệ Thống

Tài liệu cung cấp đầy đủ thông tin kết nối cơ sở dữ liệu trên môi trường máy cá nhân (Local) để bạn cấu hình trên **pgAdmin 4**, **SQL Server Management Studio (SSMS)** và tài khoản đăng nhập hệ thống.

---

## 1. Kiến Trúc Cơ Sở Dữ Liệu PostgreSQL Dùng Chung Trên Local (`lang-simulator`)

Toàn bộ dịch vụ xác thực tập trung và đào tạo nghiệp vụ chạy trên **PostgreSQL (`lang-simulator`)** trên `localhost:5432`, được phân tách rõ ràng theo các Database Schema:

| Schema | Microservice phụ trách | Danh sách bảng chính | Chức năng |
| :--- | :--- | :--- | :--- |
| **`auth`** | **`IELTSMaster.AuthService`** | `auth.users`, `auth.tenants`, `auth.service_plans`, `auth.memberships`, `auth.membership_roles`, `auth.refresh_tokens` (6 bảng) | Xác thực tập trung, Multi-tenant RBAC, E-learning SSO |
| **`business`** | **`IELTSMaster.BusinessService`** | `business.classrooms`, `business.courses`, `business.curricula`, `business.exams`, `business.lessons`, `business.class_sessions`... (39 bảng) | Quản lý đào tạo, lớp học, khóa học, đề thi IELTS |
| **`public`** | **`lang-simulator (NestJS/Next.js)`** | Views trỏ sang `auth.*` và `business.*` + bảng `typeorm_migrations` | Tương thích ngược 100% cho ứng dụng NestJS / Next.js |

---

## 2. Thông Tin Kết Nối pgAdmin 4 (PostgreSQL - Database `lang-simulator`)

Dành cho công cụ **pgAdmin 4**, **DBeaver** hoặc psql CLI:

| Trường (Field Name) | Giá trị điền | Ghi chú |
| :--- | :--- | :--- |
| **Server Name** | `PostgreSQL-Local` | Tên gợi nhớ trong pgAdmin |
| **Host name/address** | `127.0.0.1` *(hoặc `localhost`)* | Địa chỉ máy local |
| **Port** | `5432` | Cổng mặc định của PostgreSQL |
| **Database** | `lang-simulator` | Database dùng chung đã chia schemas: `auth` & `business` |
| **User** | `postgres` *(hoặc `lang_simulator`)* | Tài khoản quản trị database |
| **Password** | *(Để trống nếu dùng trust; hoặc `lang_simulator_local_pass`)* | |

---

## 3. Danh Sách Tài Khoản Quản Trị Hệ Thống (`auth.users` - PostgreSQL)

Toàn bộ xác thực hệ thống hiện tại đã được tập trung tại **`auth.users`** (PostgreSQL) qua **`IELTSMaster.AuthService`**. Bạn có thể đăng nhập trên giao diện web hoặc gọi API bằng một trong các tài khoản sau:

### 3.1. Tài khoản Quản trị cấp cao nhất (System Owner)
* **Tên đăng nhập (Username/Email):** `admin` *(hoặc `admin@langsimulator.com`, `admin@ieltsmaster.local`)*
* **Mật khẩu (Password):** `Admin@123`
* **Vai trò (System Role):** `SYSTEM_OWNER` (Toàn quyền hệ thống đa trung tâm)
* **Trạng thái:** `active`

### 3.2. Tài khoản Quản trị viên (Administrator - Thang Le)
* **Tên đăng nhập (Username/Email):** `thang` *(hoặc `thang@gmail.com`)*
* **Mật khẩu (Password):** `Admin@123`
* **Vai trò (System Role):** `SYSTEM_OWNER`
* **Trạng thái:** `active`

---

## 4. Kiểm Tra Nhanh Bằng Terminal (PowerShell)

Nếu muốn kiểm tra nhanh kết nối mà không qua giao diện GUI:

* **Kiểm tra PostgreSQL:**
  ```powershell
  & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -d lang-simulator
  ```

* **Kiểm tra SQL Server:**
  ```powershell
  sqlcmd -S "localhost\SQLEXPRESS" -E -d IELTSMASTER -Q "SELECT name FROM sys.tables;"
  ```
