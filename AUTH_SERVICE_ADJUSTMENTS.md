# Quá Trình Bổ Sung Dịch Vụ AuthService và Tích Hợp RBAC / E-Learning

Tài liệu ghi lại toàn bộ các bước điều chỉnh, bổ sung dịch vụ `IELTSMaster.AuthService` chuyên cho xác thực (Authentication), cấp phát Access Token chứa thông tin User và Tenant, kế thừa mô hình phân quyền RBAC từ `lang-simulator`, và giải quyết bài toán tích hợp hệ thống E-learning có thể bỏ qua phân quyền phức tạp.

---

B1. Bổ sung dự án IELTSMaster.AuthService vào giải pháp IELTSMASTER
- Lý do điều chỉnh: Tách biệt hoàn toàn trách nhiệm xác thực (Authentication), cấp phát và quản lý Access Token / Refresh Token ra một microservice độc lập (AuthService), thay thế cách tiếp cận gộp xác thực trong SystemService trước đây.
- Nội dung điều chỉnh:
  + Khởi tạo dự án ASP.NET Core Web API `IELTSMaster.AuthService` (Target Framework: .NET 8.0).
  + Thêm dự án vào solution `IELTSMaster.sln`.
  + Cài đặt các gói NuGet cần thiết: `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `System.IdentityModel.Tokens.Jwt`, `BCrypt.Net-Next`, `Grpc.AspNetCore`, `Grpc.AspNetCore.Web`, `Grpc.Tools`, `FluentValidation.AspNetCore`, `Swashbuckle.AspNetCore`.
  + Tham chiếu đến `IELTSMaster.ServiceDefaults` và `IELTSMaster.Shared`.

B2. Kế thừa và định nghĩa mô hình dữ liệu RBAC & Multi-tenant từ lang-simulator
- Lý do điều chỉnh: Dự án `lang-simulator` đã có cấu trúc cơ sở dữ liệu và bảng phân quyền theo mô hình Multi-tenant RBAC rất hoàn chỉnh (`users`, `tenants`, `service_plans`, `memberships`, `membership_roles`, `refresh_tokens`). Cần đồng bộ và kế thừa mô hình này sang `IELTSMASTER` để phục vụ xác thực người dùng và phân quyền theo trung tâm (tenant).
- Nội dung điều chỉnh:
  + Xây dựng các Entity trong thư mục `Entities/`: `User.cs`, `Tenant.cs`, `ServicePlan.cs`, `Membership.cs`, `MembershipRole.cs`, `RefreshToken.cs`.
  + Ánh xạ đầy đủ các thuộc tính và quan hệ tương thích 100% với schema PostgreSQL trong `lang-simulator`.
  + Xây dựng `AuthDbContext.cs` trong `Infrastructure/Data/` với Fluent API cấu hình bảng và cột dạng snake_case (`users`, `tenants`, `memberships`, `membership_roles`, `refresh_tokens`, `service_plans`), hỗ trợ cả PostgreSQL và SQL Server.

B3. Bổ sung bộ hằng số phân quyền và ngữ cảnh người dùng đa trung tâm vào IELTSMaster.Shared
- Lý do điều chỉnh: Cần chia sẻ các định nghĩa vai trò (SystemRole, TenantRole), nhóm quyền (RoleGroups), ClaimTypes và ngữ cảnh người dùng (TenantUserContext) để tất cả các service trong hệ thống và các service tích hợp sau này dùng chung một chuẩn nhất quán.
- Nội dung điều chỉnh:
  + Tạo file `Security/AuthConstants.cs` trong `IELTSMaster.Shared`:
    * SystemRole: `SYSTEM_OWNER`, `SYSTEM_ADMIN`, `REGISTERED_USER`.
    * TenantRole: `TENANT_OWNER`, `TENANT_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`.
    * TenantStatus: `pending`, `active`, `rejected`, `suspended`.
    * MembershipStatus: `active`, `inactive`.
    * RoleGroups: `SystemManagerRoles`, `TenantManagerRoles`, `ExamAuthorRoles`, `GraderRoles`, `TenantDashboardRoles`, `ElearningAllowedRoles`.
    * AuthClaimTypes: Định nghĩa các claim `sub`, `email`, `name`, `full_name`, `system_role`, `tenant_id`, `tenant_slug`, `tenant_name`, `membership_id`, `role`, `tenant_role`, `tv`, `elearning_access`, `elearning_bypass_auth`.
  + Tạo file `Security/TenantUserContext.cs` trong `IELTSMaster.Shared`: Giải mã trực tiếp claims từ token thành model strongly-typed (`UserId`, `TenantId`, `TenantSlug`, `TenantRoles`, `CanBypassAuthorization`, `CanAccessElearning`, v.v.) mà không cần query lại cơ sở dữ liệu.

B4. Giải quyết bài toán tích hợp hệ thống E-learning có thể bỏ phân quyền (Bypass RBAC)
- Lý do điều chỉnh: Khi tích hợp với hệ thống E-learning (video bài giảng, thi cử trực tuyến, LMS, SCORM player), hệ thống E-learning chỉ cần biết định danh người học và trung tâm (tenant) tương ứng; nếu bắt buộc hệ thống E-learning phải cài đặt và kiểm tra toàn bộ ma trận phân quyền RBAC phức tạp của hệ thống quản trị thì việc tích hợp sẽ cồng kềnh, dễ gãy và phụ thuộc chặt. Cần một cơ chế để E-learning "bỏ phân quyền là tích hợp được ngay" (Zero-Config RBAC for Elearning).
- Nội dung điều chỉnh:
  + Trong Access Token do `AuthService` sinh ra, bổ sung tự động các claim: `tenant_id`, `tenant_slug`, `tenant_name`, `elearning_access = "true"`, `elearning_bypass_auth = "true"`.
  + Tạo bộ lọc `Security/ElearningAuthorizeAttribute.cs` trong `IELTSMaster.Shared`: Cho phép các controller/endpoint của E-learning chỉ cần kiểm tra token hợp lệ và có `tenant_id` là tự động cấp quyền truy cập học tập (`BypassRbac = true`), bỏ qua việc kiểm tra phân quyền chi tiết.
  + Cung cấp endpoint introspection `POST /api/auth/introspect` và `GET /api/auth/validate`: Trả về cờ `elearning.canBypassAuthorization = true` cùng vai trò đã được ánh xạ đơn giản hóa (`Learner`, `Instructor`, `Admin`), giúp hệ thống E-learning bên ngoài (kể cả viết bằng Node.js, Python, PHP) gọi kiểm tra token là tích hợp được ngay.

B5. Cài đặt thuật toán mã hóa mật khẩu Bcrypt tương thích 100% với lang-simulator
- Lý do điều chỉnh: Dự án `lang-simulator` sử dụng thư viện `bcryptjs` với 12 salt rounds để băm mật khẩu và có cơ chế dummy hash chống tấn công timing attack khi email không tồn tại. `AuthService` trên .NET cần tương thích hoàn toàn để người dùng có thể đăng nhập chéo giữa 2 hệ thống.
- Nội dung điều chỉnh:
  + Tạo interface `IPasswordHasher` và class `BcryptPasswordHasher` trong `Services/IPasswordHasher.cs`.
  + Sử dụng `BCrypt.Net-Next` với WorkFactor = 12 để băm và đối soát mật khẩu.
  + Thêm cơ chế `GetDummyHash()` để chạy kiểm tra băm ngay cả khi tài khoản không tồn tại, tránh lộ email qua chênh lệch thời gian phản hồi.

B6. Xây dựng dịch vụ cấp phát Token đa ngữ cảnh và xoay vòng Refresh Token an toàn
- Lý do điều chỉnh: Người dùng có thể là thành viên của nhiều trung tâm khác nhau. Cần hỗ trợ cấp Access Token theo ngữ cảnh tenant đang chọn, hỗ trợ đổi tenant (Switch Tenant), và cơ chế xoay vòng Refresh Token (Token Rotation) chống lộ token theo gia đình (Token Family).
- Nội dung điều chỉnh:
  + Tạo `Services/ITokenService.cs`:
    * Sinh JWT Access Token chứa thông tin User (`sub`, `email`, `name`, `system_role`, `tv`) và Tenant (`tenant_id`, `tenant_slug`, `tenant_name`, `membership_id`, `tenant_role`, `elearning_access`, `elearning_bypass_auth`).
    * Sinh Refresh Token ngẫu nhiên an toàn 32 bytes (Base64Url) và lưu trữ dạng băm SHA-256 trong DB.
    * Hỗ trợ hàm `ValidateToken` kiểm tra chữ ký và tính hợp lệ của token.
  + Tạo `Services/IAuthService.cs`:
    * `LoginAsync`: Đăng nhập bằng email/password, tự động nhận diện danh sách trung tâm của user, chọn tenant mặc định hoặc tenant theo yêu cầu, dọn dẹp refresh token hết hạn, cấp session mới.
    * `RegisterAsync`: Đăng ký tài khoản mới với vai trò `REGISTERED_USER` và tự động đăng nhập.
    * `SwitchTenantAsync`: Cho phép người dùng chuyển đổi ngữ cảnh trung tâm đang làm việc, cấp Access Token mới với quyền của trung tâm đó.
    * `RefreshTokenAsync`: Xoay vòng Refresh Token; nếu phát hiện token đã thu hồi bị gửi lại thì lập tức thu hồi toàn bộ Family để bảo vệ tài khoản.
    * `LogoutAsync`: Thu hồi toàn bộ token family.
    * `GetMeAsync` & `GetMeContextsAsync`: Trả về thông tin cá nhân và danh sách ngữ cảnh tenant (`MeContexts` kế thừa từ `lang-simulator`).
    * `ChangePasswordAsync`: Đổi mật khẩu, tăng `token_version` để vô hiệu hóa tức thì mọi access token cũ trên các thiết bị khác.
    * `IntrospectTokenAsync`: Kiểm tra token và trả về thông tin user, tenant cùng quyền hạn e-learning.

B7. Xây dựng Controller RESTful API và gRPC Service cho AuthService
- Lý do điều chỉnh: Cần cung cấp đầy đủ giao diện HTTP RESTful API cho ứng dụng Web/Mobile và gRPC Service hiệu năng cao cho giao tiếp nội bộ giữa các microservices (FileService, SystemService, ElearningService trong tương lai).
- Nội dung điều chỉnh:
  + Tạo `Controllers/AuthController.cs`: Cung cấp các endpoint:
    * `POST /api/auth/register`
    * `POST /api/auth/login`
    * `POST /api/auth/refresh`
    * `POST /api/auth/switch-tenant`
    * `POST /api/auth/logout`
    * `GET /api/auth/me`
    * `GET /api/auth/contexts`
    * `POST /api/auth/change-password`
    * `POST /api/auth/introspect`
    * `GET /api/auth/validate`
    * Hỗ trợ quản lý Refresh Token tự động qua HttpOnly Cookie (`ls_rt`) hoặc qua Request Body.
  + Định nghĩa file `Protos/auth.proto` và tạo `Services/AuthGrpcService.cs`:
    * RPC `ValidateToken`: Xác thực token và trả về thông tin user, tenant, cờ `can_bypass_elearning_auth`.
    * RPC `GetUserTenantContext`: Lấy ngữ cảnh thành viên và vai trò trong tenant cụ thể.

B8. Cấu hình ứng dụng AuthService trong Program.cs và appsettings.json
- Lý do điều chỉnh: Thiết lập các cấu hình môi trường, chuỗi kết nối cơ sở dữ liệu PostgreSQL (kết nối trực tiếp database `lang-simulator`), cấu hình ký token JWT, CORS, Swagger UI và GrpcWeb.
- Nội dung điều chỉnh:
  + Cấu hình `Program.cs`:
    * Đăng ký `builder.AddServiceDefaults()`.
    * Đăng ký `AuthDbContext` với Npgsql PostgreSQL.
    * Đăng ký DI cho `IPasswordHasher`, `ITokenService`, `IAuthService`.
    * Đăng ký Authentication JwtBearer với SymmetricSecurityKey và ClockSkew = Zero.
    * Đăng ký Swagger với cấu hình xác thực Bearer token.
    * Đăng ký Grpc và GrpcWeb.
  + Cấu hình `appsettings.json` và `appsettings.Development.json`:
    * ConnectionStrings: `DefaultConnection`: `"Host=localhost;Port=5432;Database=lang-simulator;Username=postgres"`.
    * Jwt: Key, Issuer, Audience, AccessExpiryMinutes, RefreshExpiryDays.
    * CORS origins cho frontend (`http://localhost:5173`, `http://localhost:3000`, `http://localhost:3001`).

B9. Tích hợp AuthService vào Aspire AppHost và API Gateway
- Lý do điều chỉnh: Đảm bảo toàn bộ hệ sinh thái `IELTSMASTER` nhận diện được service mới, Aspire điều phối khởi chạy đồng bộ và API Gateway định tuyến chính xác các request `/auth/*` về AuthService.
- Nội dung điều chỉnh:
  + Trong `IELTSMaster.AppHost/IELTSMaster.AppHost.csproj`: Bổ sung ProjectReference tới `IELTSMaster.AuthService`.
  + Trong `IELTSMaster.AppHost/AppHost.cs`:
    * Đăng ký `var authService = builder.AddProject<Projects.IELTSMaster_AuthService>("AuthService", launchProfileName: "https");`
    * Cấu hình tham chiếu `gateway.WithReference(authService)` và `systemService.WithReference(authService)`.
  + Trong `IELTSMaster.ApiGateway/appsettings.Development.json`:
    * Thêm Route `auth-route` khớp path `/auth/{**catch-all}`, loại bỏ tiền tố `/auth`.
    * Thêm Cluster `auth-cluster` trỏ tới `https://localhost:7190/api`.
  + Trong `IELTSMaster.ApiGateway/Program.cs`: Bổ sung `/auth/{**catch-all}` vào danh sách route hiển thị tại endpoint gốc `/`.

B10. Kiểm tra biên dịch toàn bộ giải pháp IELTSMaster.sln
- Lý do điều chỉnh: Đảm bảo tất cả các dự án trong giải pháp (`IELTSMaster.Shared`, `IELTSMaster.ServiceDefaults`, `IELTSMaster.AuthService`, `IELTSMaster.SystemService`, `IELTSMaster.FileService`, `IELTSMaster.ApiGateway`, `IELTSMaster.AppHost`) đều tương thích, không xảy ra xung đột thư viện hay lỗi cú pháp.
- Nội dung điều chỉnh:
  + Chạy lệnh `dotnet build IELTSMaster.sln`.
  + Kết quả: Biên dịch thành công 100% với 0 lỗi (0 Errors).

B11. Khắc phục lỗi thiếu module thực thi Vite và TypeScript trên IELTSMaster.Web
- Lý do điều chỉnh: Khi khởi chạy ứng dụng frontend thông qua lệnh `dev` hoặc `build` (từ Aspire AppHost hoặc npm CLI), hệ thống gặp lỗi `Cannot find module '.../node_modules/vite/bin/vite.js'` và `Cannot find module '.../node_modules/typescript/bin/tsc'`. Nguyên nhân do thư mục nhị phân `bin` của các gói npm bị thiếu trong `node_modules`.
- Nội dung điều chỉnh:
  + Làm mới và cài đặt lại nguyên vẹn các gói thực thi `vite` (`rolldown-vite`) và `typescript` trong thư mục [IELTSMaster.Web](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.Web).
  + Khôi phục đầy đủ các file nhị phân CLI (`vite.js`, `tsc`).
  + Kiểm định phiên bản thành công với `npx vite --version` (vite/7.2.5).
  + Chạy kiểm thử thành công lệnh `npm run build` (`tsc -b && vite build`): Chuyển đổi và đóng gói thành công toàn bộ 3037 module (Exit code 0).

