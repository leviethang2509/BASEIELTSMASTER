# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG IELTSMASTER (PRODUCTION DEPLOYMENT GUIDE)

Tài liệu này cung cấp toàn bộ quy trình, cấu hình và lệnh vận hành để đưa hệ thống **IELTSMaster** lên môi trường Production (VPS Linux Ubuntu hoặc Windows Server).

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG HIỆN TẠI

Hệ thống được thiết kế theo kiến trúc **Microservices tối ưu & Fullstack**, bao gồm:

```
[Khách hàng / Học viên / Quản trị viên]
                  │
                  ▼ (HTTPS / Domain)
       ┌─────────────────────┐
       │ Nginx / Cloudflare  │
       └──────────┬──────────┘
                  │
     ┌────────────┴────────────────────────┐
     ▼ (Cổng 5000)                         ▼ (Cổng 5002 - Giao diện Web)
┌───────────────────────┐            ┌────────────────────────────────────────┐
│ IELTSMaster.ApiGateway│            │ IELTSMaster.BusinessService (Fullstack)│
│  (YARP Reverse Proxy) │            │ ├── Backend Web API                    │
└───────────┬───────────┘            │ └── Frontend React/Vite SPA (wwwroot)  │
            │                        └────────────────────────────────────────┘
            ├────────────────────────┬────────────────────────┐
            ▼ (Cổng 5001)            ▼ (Cổng 5003)            ▼ (Cổng 3101 / 3100)
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ IELTSMaster.AuthService│  │ IELTSMaster.FileService│ │ ELearning             │
│ (JWT, Multi-tenant)   │  │ (Hybrid Local + R2)   │  │ (lang-api & lang-web) │
└───────────┬───────────┘  └───────────────────────┘  └───────────┬───────────┘
            │                                                     │
            └────────────────────────┬────────────────────────────┘
                                     ▼
                         ┌───────────────────────┐
                         │ PostgreSQL Database   │
                         │ (DB: lang-simulator)  │
                         │ ├── schema: auth      │
                         │ ├── schema: business  │
                         │ └── schema: public    │
                         └───────────────────────┘
```

| STT | Thành phần | Công nghệ | Cổng mặc định (Prod) | Vai trò |
|:---:|---|---|:---:|---|
| **1** | **`IELTSMaster.ApiGateway`** | .NET 8 (YARP) | `5000` | Gateway tiếp nhận và định tuyến toàn bộ API traffic. |
| **2** | **`IELTSMaster.AuthService`** | .NET 8 Web API | `5001` | Xác thực tập trung, cấp phát JWT, phân quyền đa trung tâm. |
| **3** | **`IELTSMaster.BusinessService`** | .NET 8 + React/Vite | `5002` | **Fullstack**: Cung cấp API quản lý đào tạo & phục vụ web quản trị qua `wwwroot`. |
| **4** | **`IELTSMaster.FileService`** | .NET 8 Web API | `5003` | Upload/download tài liệu, đề thi, audio (lưu Local hoặc Cloudflare R2). |
| **5** | **`ELearning (lang-api)`** | NestJS (Node.js) | `3101` | API luyện thi & học trực tuyến IELTS. |
| **6** | **`ELearning (lang-web)`** | Next.js (Node.js) | `3100` | Giao diện luyện thi tương tác cho học viên. |
| **7** | **`Database`** | PostgreSQL 16+ | `5432` | Cơ sở dữ liệu duy nhất đã phân chia schemas (`auth`, `business`, `public`). |

---

## 2. YÊU CẦU MÔI TRƯỜNG TRÊN SERVER (PREREQUISITES)

### 2.1. Cấu hình phần cứng tối thiểu
- **CPU:** 2 Cores (Khuyên dùng 4 Cores)
- **RAM:** Tối thiểu 4GB RAM (Khuyên dùng 8GB RAM để chạy mượt cả PostgreSQL + Node.js + .NET)
- **Ổ cứng (SSD):** Tối thiểu 40GB trống

### 2.2. Phần mềm cần cài đặt trên Server
1. **.NET 8 Runtime:**
   - Cài đặt `dotnet-runtime-8.0` và `aspnetcore-runtime-8.0`.
2. **Node.js & pnpm:**
   - Node.js LTS (v18.x hoặc v20.x trở lên).
   - Quản lý gói: `pnpm` (`npm install -g pnpm`).
   - Quản lý tiến trình: `pm2` (`npm install -g pm2`).
3. **PostgreSQL Server:**
   - PostgreSQL 16 hoặc 17 (hoặc dùng Database Cloud như AWS RDS, Supabase, Neon).
4. **Web Server / Reverse Proxy:**
   - Nginx (đối với Linux VPS) hoặc IIS / Cloudflare Tunnel.

---

## 3. QUY TRÌNH BUILD & PUBLISH TẠI MÁY LOCAL HOẶC CI/CD

Toàn bộ backend .NET và frontend React đã được cấu hình tự động. Khi chạy `dotnet publish` cho `BusinessService`, hệ thống tự build React SPA vào thư mục `wwwroot`.

### Cách 1: Sử dụng Script 1-Click (Khuyên dùng)

Chạy file script `publish-all.ps1` trong thư mục gốc:

```powershell
.\publish-all.ps1
```

### Cách 2: Các lệnh Publish thủ công (.NET 8)

```powershell
# 1. Publish ApiGateway
dotnet publish IELTSMaster.ApiGateway/IELTSMaster.ApiGateway.csproj -c Release -o ./publish/gateway

# 2. Publish AuthService
dotnet publish IELTSMaster.AuthService/IELTSMaster.AuthService.csproj -c Release -o ./publish/auth

# 3. Publish BusinessService (Tự động build React Frontend vào wwwroot)
dotnet publish IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj -c Release -o ./publish/business

# 4. Publish FileService
dotnet publish IELTSMaster.FileService/IELTSMaster.FileService.csproj -c Release -o ./publish/file
```

### Cách 3: Build Module ELearning (`lang-simulator`)

```powershell
cd ../lang-simulator
pnpm install
pnpm --filter @lang/api build
pnpm --filter @lang/web build
```

Sau khi hoàn tất, nén thư mục `publish/` và thư mục `lang-simulator/` (đã build) để tải lên Server.

---

## 4. HƯỚNG DẪN TRIỂN KHAI TRÊN LINUX VPS (UBUNTU SERVER)

Giả sử bạn đưa mã nguồn đã publish lên thư mục `/var/www/ieltsmaster`:
- `/var/www/ieltsmaster/gateway`
- `/var/www/ieltsmaster/auth`
- `/var/www/ieltsmaster/business`
- `/var/www/ieltsmaster/file`
- `/var/www/ieltsmaster/elearning-api`
- `/var/www/ieltsmaster/elearning-web`

### Bước 1: Cấu hình Systemd Service cho các dịch vụ .NET

Tạo 4 file service trong `/etc/systemd/system/`:

#### 1. File `/etc/systemd/system/ielts-gateway.service`:
```ini
[Unit]
Description=IELTSMaster ApiGateway
After=network.target

[Service]
WorkingDirectory=/var/www/ieltsmaster/gateway
ExecStart=/usr/bin/dotnet /var/www/ieltsmaster/gateway/IELTSMaster.ApiGateway.dll --urls="http://127.0.0.1:5000"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=ielts-gateway
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

#### 2. File `/etc/systemd/system/ielts-auth.service`:
```ini
[Unit]
Description=IELTSMaster AuthService
After=network.target

[Service]
WorkingDirectory=/var/www/ieltsmaster/auth
ExecStart=/usr/bin/dotnet /var/www/ieltsmaster/auth/IELTSMaster.AuthService.dll --urls="http://127.0.0.1:5001"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=ielts-auth
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

#### 3. File `/etc/systemd/system/ielts-business.service`:
```ini
[Unit]
Description=IELTSMaster BusinessService (Fullstack Web & API)
After=network.target

[Service]
WorkingDirectory=/var/www/ieltsmaster/business
ExecStart=/usr/bin/dotnet /var/www/ieltsmaster/business/IELTSMaster.BusinessService.dll --urls="http://127.0.0.1:5002"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=ielts-business
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

#### 4. File `/etc/systemd/system/ielts-file.service`:
```ini
[Unit]
Description=IELTSMaster FileService
After=network.target

[Service]
WorkingDirectory=/var/www/ieltsmaster/file
ExecStart=/usr/bin/dotnet /var/www/ieltsmaster/file/IELTSMaster.FileService.dll --urls="http://127.0.0.1:5003"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=ielts-file
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

Kích hoạt và khởi động các dịch vụ:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ielts-gateway ielts-auth ielts-business ielts-file
```

---

### Bước 2: Khởi chạy ELearning qua PM2 (Node.js)

Tạo file `ecosystem.config.js` tại `/var/www/ieltsmaster/`:

```javascript
module.exports = {
  apps: [
    {
      name: "ielts-elearning-api",
      cwd: "/var/www/ieltsmaster/elearning-api",
      script: "dist/main.js",
      env: {
        NODE_ENV: "production",
        PORT: 3101,
        DATABASE_URL: "postgresql://postgres:MatKhauDB@127.0.0.1:5432/lang-simulator"
      }
    },
    {
      name: "ielts-elearning-web",
      cwd: "/var/www/ieltsmaster/elearning-web",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3100
      }
    }
  ]
};
```

Khởi chạy PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### Bước 3: Cấu hình Nginx Reverse Proxy & SSL HTTPS

Tạo file cấu hình `/etc/nginx/sites-available/ieltsmaster.conf`:

```nginx
# 1. Cấu hình chuyển hướng HTTP sang HTTPS
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com elearning.yourdomain.com;
    return 301 https://$host$request_uri;
}

# 2. Domain chính: Quản trị trung tâm & Hệ thống Web Fullstack
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 100M;

    # Giao diện Web Quản trị (BusinessService Frontend & API)
    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Gateway định tuyến (/api, /auth, /file, /business)
    location ~ ^/(auth|file|business|api)/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Subdomain: Hệ thống ELearning Học viên (lang-web & lang-api)
server {
    listen 443 ssl http2;
    server_name elearning.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3101/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Kích hoạt cấu hình Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ieltsmaster.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. THIẾT LẬP DATABASE VÀ TÀI KHOẢN MẶC ĐỊNH

### 5.1. Khởi tạo Cơ sở dữ liệu PostgreSQL
Trước khi chạy ứng dụng lần đầu, hãy chắc chắn Database `lang-simulator` đã tồn tại trên PostgreSQL:

```bash
sudo -u postgres psql -c "CREATE DATABASE \"lang-simulator\";"
```

Các migrations và bảng dữ liệu (`auth.*`, `business.*`) sẽ **tự động khởi tạo** khi `AuthService` và `BusinessService` khởi động lần đầu tiên.

### 5.2. Danh sách tài khoản quản trị mặc định (Mật khẩu: `Admin@123`)
* **Tài khoản System Owner:**
  - Username / Email: `admin` (hoặc `admin@langsimulator.com`, `admin@ieltsmaster.local`)
  - Mật khẩu: `Admin@123`
  - Vai trò: `SYSTEM_OWNER`
* **Tài khoản Administrator (Thắng Lê):**
  - Username / Email: `thang` (hoặc `thang@gmail.com`)
  - Mật khẩu: `Admin@123`
  - Vai trò: `SYSTEM_OWNER`

---

## 6. CÁC LỆNH KIỂM TRA LOG VÀ GIÁM SÁT HỆ THỐNG

| Chức năng | Câu lệnh |
|---|---|
| Xem trạng thái các service | `sudo systemctl status ielts-gateway ielts-auth ielts-business ielts-file` |
| Xem log thời gian thực của Gateway | `journalctl -u ielts-gateway -f` |
| Xem log thời gian thực của AuthService | `journalctl -u ielts-auth -f` |
| Xem log thời gian thực của BusinessService | `journalctl -u ielts-business -f` |
| Xem log ELearning qua PM2 | `pm2 logs` |
| Khởi động lại toàn bộ hệ thống .NET | `sudo systemctl restart ielts-gateway ielts-auth ielts-business ielts-file` |
| Khởi động lại ELearning | `pm2 restart all` |
