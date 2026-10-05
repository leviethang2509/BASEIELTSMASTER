# Kiểm tra khả năng build ra DLL và quy trình Publish hệ thống IELTSMaster

- **Thời gian thực hiện:** 2026-10-04 02:45 (+07)
- **Nội dung công việc:** Kiểm tra xem hệ thống hiện tại có build được ra file `.dll` hay không, phân tích các lỗi build nếu có, và hướng dẫn chi tiết quy trình `dotnet publish`.
- **Người thực hiện:** Antigravity AI
- **Tuân thủ:** rule.md

---

## Bước 1. Mô tả công việc cần thực hiện
- **Mục tiêu:**
  1. Kiểm tra thực tế khả năng biên dịch (build) ra file `.dll` của từng service và của toàn bộ Solution `IELTSMaster.sln`.
  2. Xác định nguyên nhân nếu có lỗi build xảy ra.
  3. Cung cấp quy trình, cú pháp câu lệnh chi tiết để thực hiện `dotnet publish` các microservice ra môi trường triển khai (Production/Staging).

## Bước 2. Xác định File/Module kiểm tra
1. `IELTSMaster.Shared`
2. `IELTSMaster.ServiceDefaults`
3. `IELTSMaster.AuthService`
4. `IELTSMaster.BusinessService`
5. `IELTSMaster.FileService`
6. `IELTSMaster.ApiGateway`
7. `IELTSMaster.ELearning` (`Program.cs`)
8. Solution `IELTSMaster.sln`

## Bước 3. Kết quả kiểm tra Build ra DLL

### 1. Các Microservices nghiệp vụ cốt lõi
Đã thực thi kiểm tra build trực tiếp từng dự án:
- `IELTSMaster.Shared.csproj` -> **Build Succeeded** -> sinh ra `IELTSMaster.Shared.dll`
- `IELTSMaster.ServiceDefaults.csproj` -> **Build Succeeded** -> sinh ra `IELTSMaster.ServiceDefaults.dll`
- `IELTSMaster.AuthService.csproj` -> **Build Succeeded** -> sinh ra `IELTSMaster.AuthService.dll`
- `IELTSMaster.BusinessService.csproj` -> **Build Succeeded** -> sinh ra `IELTSMaster.BusinessService.dll`
- `IELTSMaster.FileService.csproj` -> **Build Succeeded** -> sinh ra `IELTSMaster.FileService.dll`
- `IELTSMaster.ApiGateway.csproj` -> **Build Succeeded** -> sinh ra `IELTSMaster.ApiGateway.dll`

=> **Toàn bộ 6 service/thư viện cốt lõi đều biên dịch ra file `.dll` 100% thành công, 0 lỗi (0 Error).**

### 2. Điểm nghẽn duy nhất ở `IELTSMaster.ELearning`
Khi chạy `dotnet build IELTSMaster.sln`, Solution bị báo 2 lỗi tại project `IELTSMaster.ELearning`:
- `Program.cs(3,9): error CS1061: 'WebApplicationBuilder' does not contain a definition for 'AddServiceDefaults'`
- `Program.cs(14,5): error CS1061: 'WebApplication' does not contain a definition for 'MapDefaultEndpoints'`

**Lý do:**
File [Program.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.ELearning/Program.cs) của project này là file template rỗng mới tạo, thiếu dòng:
```csharp
using AUN_QA.ServiceDefaults;
```
Chỉ cần thêm dòng using này (hoặc nếu loại bỏ project template .NET rỗng này khỏi Solution theo Phương án A đã đề xuất), toàn bộ Solution sẽ build ra DLL không còn bất kỳ lỗi nào.

---

## Bước 4. Hướng dẫn quy trình Publish hệ thống

### 1. Publish các Backend Services (.NET 8 Microservices)

Mỗi service là một Web API độc lập, có thể publish ra thư mục chứa file `.dll` và file thực thi:

#### Lệnh publish cơ bản (Framework-dependent - yêu cầu máy chủ cài sẵn .NET 8 Runtime):
```bash
# Publish AuthService
dotnet publish IELTSMaster.AuthService/IELTSMaster.AuthService.csproj -c Release -o ./publish/auth

# Publish BusinessService
dotnet publish IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj -c Release -o ./publish/business

# Publish FileService
dotnet publish IELTSMaster.FileService/IELTSMaster.FileService.csproj -c Release -o ./publish/file

# Publish ApiGateway
dotnet publish IELTSMaster.ApiGateway/IELTSMaster.ApiGateway.csproj -c Release -o ./publish/gateway
```

#### Cấu trúc thư mục đầu ra sau khi publish (`./publish/<service>`):
- `<ServiceName>.dll` (DLL chính chứa code nghiệp vụ đã biên dịch)
- Các file DLL phụ thuộc (`Npgsql.dll`, `Microsoft.EntityFrameworkCore.dll`, `BCrypt.Net-Next.dll`, ...)
- `<ServiceName>.exe` (trên Windows)
- `appsettings.json` và `appsettings.Production.json` (cấu hình môi trường)
- `<ServiceName>.runtimeconfig.json`

#### Cách khởi chạy trên máy chủ (Linux / Windows VPS / Docker):
```bash
cd ./publish/auth
dotnet IELTSMaster.AuthService.dll
```
*(Hoặc cấu hình qua Systemd service trên Linux, IIS trên Windows, hoặc đóng gói Docker)*.

#### Lệnh publish dạng Tự chứa Runtime (Self-Contained - không cần máy chủ cài trước .NET 8):
```bash
# Ví dụ cho Linux x64:
dotnet publish IELTSMaster.AuthService/IELTSMaster.AuthService.csproj -c Release -r linux-x64 --self-contained true -o ./publish/auth_linux

# Ví dụ cho Windows x64:
dotnet publish IELTSMaster.AuthService/IELTSMaster.AuthService.csproj -c Release -r win-x64 --self-contained true -o ./publish/auth_win
```

---

### 2. Publish Frontend Web (`IELTSMaster.Web` - React / Vite)
Frontend là ứng dụng Client-Side SPA, không build ra DLL mà build ra các file tĩnh HTML/CSS/JS:
```bash
cd IELTSMaster.Web
npm install
npm run build
```
Kết quả sinh ra thư mục `IELTSMaster.Web/dist` chứa: `index.html`, thư mục `assets/` (các file js, css đã minify). Thư mục này đưa lên Nginx, Caddy, Cloudflare Pages hoặc cấu hình static files trên ApiGateway.

---

### 3. Triển khai phần E-Learning (`lang-simulator` - NestJS Node.js)
E-learning API chạy trên nền tảng NestJS/Node.js:
```bash
cd IELTSMaster.ELearning/lang-simulator  # hoặc repo lang-simulator
pnpm install
pnpm --filter lang-api build
```
Đầu ra sinh ra tại `apps/lang-api/dist/main.js`. Khởi chạy:
```bash
node apps/lang-api/dist/main.js
```
*(Thường được quản lý qua PM2 hoặc Docker container).*

---

## Bước 5. Lưu ý quan trọng
- Luôn kiểm tra file `appsettings.Production.json` trước khi deploy để đảm bảo ConnectionStrings và JWT Secret trỏ đúng cơ sở dữ liệu Production.
- Các biến nhạy cảm (JWT Key, Password DB, Cloudflare R2 Credentials) nên truyền qua Biến Môi Trường (Environment Variables) trên máy chủ thay vì lưu trực tiếp trong mã nguồn git.
