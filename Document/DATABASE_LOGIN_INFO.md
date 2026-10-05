# Hướng Dẫn Thông Tin Đăng Nhập Cơ Sở Dữ Liệu & Hệ Thống

Tài liệu cung cấp đầy đủ thông tin kết nối cơ sở dữ liệu trên môi trường máy cá nhân (Local) để bạn cấu hình trên **pgAdmin 4**, **SQL Server Management Studio (SSMS)** và tài khoản đăng nhập hệ thống.

---

## 1. Thông Tin Kết Nối pgAdmin 4 (PostgreSQL - Dành cho AuthService)

Khớp trực tiếp với các trường trong giao diện popup **"Let's connect to the server" / PSQL Workspace** của bạn:

| Trường (Field Name) | Giá trị điền | Ghi chú |
| :--- | :--- | :--- |
| **Existing Server (Optional)** | *(Bỏ trống)* | Không cần chọn |
| **Server Name** | `PostgreSQL-Local` *(hoặc `lang-simulator`)* | **Bắt buộc nhập**: Tên hiển thị gợi nhớ trong pgAdmin |
| **Host name/address** | `127.0.0.1` *(hoặc `localhost`)* | Địa chỉ máy local |
| **Port** | `5432` | Cổng mặc định của PostgreSQL |
| **Database** | `lang-simulator` *(hoặc `postgres`)* | Tên database của dự án AuthService |
| **User** | `postgres` *(hoặc `lang_simulator`)* | Tài khoản quản trị database |
| **Password** | *(Để trống hoặc xem ghi chú bên dưới)* | Xem mục lưu ý mật khẩu |
| **Role** | *(Bỏ trống)* | Mặc định không cần chọn |

### 🔑 Lưu ý về Mật khẩu (Password) trong PostgreSQL:
- Tệp cấu hình `pg_hba.conf` trên máy của bạn hiện đang mở chế độ `trust` cho `127.0.0.1`, vì vậy bạn **có thể để trống mật khẩu** khi kết nối từ máy nội bộ.
- Nếu pgAdmin 4 yêu cầu nhập mật khẩu:
  - **Phương án 1 (Khuyên dùng)**: Điền User là `lang_simulator`, Password là: `lang_simulator_local_pass`.
  - **Phương án 2**: Với User `postgres`, điền mật khẩu mà bạn đã đặt khi cài đặt PostgreSQL 18 lên máy (thường là `postgres`, `admin`, `123456`, `root`,...).

---

## 2. Thông Tin Kết Nối SQL Server / SSMS (Dành cho SystemService)

Dành cho công cụ **SQL Server Management Studio (SSMS)** hoặc **Azure Data Studio**:

| Trường | Giá trị điền | Ghi chú |
| :--- | :--- | :--- |
| **Server type** | `Database Engine` | |
| **Server name** | `localhost\SQLEXPRESS` | Instance SQL Server đang chạy |
| **Authentication** | `Windows Authentication` | Đăng nhập trực tiếp bằng quyền Windows |
| **Database Name** | `IELTSMASTER` | Tên database nghiệp vụ trung tâm |

---

## 3. Danh Sách Tài Khoản Seed Sẵn Trong Database (`auth.users` - PostgreSQL)

Toàn bộ xác thực hệ thống hiện tại đã được tập trung tại **`auth.users`** (PostgreSQL) qua **`IELTSMaster.AuthService`**. Bạn có thể đăng nhập trên giao diện web hoặc API bằng các tài khoản sau với mật khẩu mặc định là **`Admin@123`**:

### 3.1. Tài khoản Quản trị cấp cao nhất (System Owner)
- **Tên đăng nhập (Username/Email):** `admin` *(hoặc `admin@langsimulator.com`, `admin@ieltsmaster.local`)*
- **Mật khẩu:** `Admin@123`
- **Vai trò:** `SYSTEM_OWNER` (Toàn quyền hệ thống đa trung tâm)
- **Họ tên:** System Owner
- **Trạng thái:** `active`

### 3.2. Tài khoản Quản trị viên (Administrator - Thang Le)
- **Tên đăng nhập (Username/Email):** `thang` *(hoặc `thang@gmail.com`)*
- **Mật khẩu:** `Admin@123`
- **Vai trò:** `SYSTEM_OWNER`
- **Họ tên:** Thang Le
- **Trạng thái:** `active`

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
