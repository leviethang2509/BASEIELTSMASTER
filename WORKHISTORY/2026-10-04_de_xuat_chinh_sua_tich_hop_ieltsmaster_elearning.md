# Đề xuất chỉnh sửa tích hợp IELTSMaster.ELearning

- **Thời gian:** 2026-10-04 02:00 (+07)
- **Loại công việc:** Phân tích + đề xuất (CHƯA sửa code, chờ xác nhận)
- **File đã thay đổi:** Không có (chỉ tạo file WORKHISTORY này)

---

## Bước 1. Mô tả công việc

Kiểm tra project `IELTSMaster.ELearning` và xác định cần sửa những chỗ nào để tích hợp e-learning (lang-simulator) vào hệ thống IELTSMaster (Aspire + ApiGateway + AuthService).

**Kết quả mong muốn:** lang-api chạy trong AppHost, đi qua ApiGateway và dùng chung JWT với AuthService (token do AuthService cấp được lang-api chấp nhận).

## Hiện trạng (đã kiểm tra)

| # | Vấn đề | Bằng chứng | Mức độ |
|---|--------|-----------|--------|
| 1 | `IELTSMaster.ELearning` chỉ là **template ASP.NET Web API rỗng**: có `WeatherForecast.cs`, `Program.cs` mặc định, không có Controller, Auth hay DB. | `Program.cs`, `WeatherForecast.cs`, `.http` gọi `/weatherforecast` | Cao |
| 2 | Thư mục `lang-simulator/` bên trong **là bản copy thiếu**: không có `apps/lang-api/src`, `apps/lang-app`, `packages/*` (gồm shared, exam-core, tsconfig, eslint-config). Chỉ có `dist/`, `node_modules/`, `.env`. | So với repo gốc `C:\A_TRUNGTAMTIENGANH\SOURCE_CODE\lang-simulator` có đủ các phần này | **Chặn** |
| 3 | `dist` **không chạy được**: 140 file require `@lang/shared`, nhưng `node_modules/@lang` không có `shared`. `exam-core` và `eslint-config` là link rỗng. | `Select-String "@lang/shared"` | **Chặn** |
| 4 | Project ELearning **không có trong `IELTSMaster.sln`**, dù AppHost vẫn reference nó. | grep sln không thấy | Trung bình |
| 5 | SDK Web mặc định glob mọi file con, nên **khoảng 2.209 file** trong `lang-simulator/**` (cả node_modules) bị đưa vào item của csproj. Hậu quả: build/publish chậm và có thể copy json rác ra output. | csproj không có `DefaultItemExcludes` | Trung bình |
| 6 | `lang-simulator/.git` lồng trong repo IELTSMASTER (embedded repo) nên git của repo cha không theo dõi được, dễ commit nhầm. | `git status`: `?? IELTSMaster.ELearning/` | Trung bình |
| 7 | AppHost: `AddProject<IELTSMaster_ELearning>("ieltsmaster-elearning")` chạy app .NET rỗng, **không chạy lang-api (Node)**. Gateway cũng không `WithReference` nó. | `AppHost.cs` dòng 19 | Cao |
| 8 | ApiGateway (Dev và Prod) chưa có route nào tới e-learning. | `appsettings.*.json` chỉ có `/auth`, `/file`, `/business` | Cao |
| 9 | AuthService phát claim `tv` dạng **string**, còn `JwtAuthGuard` của lang-api so sánh `!==` với số, nên **mọi request bị 401**. | `ITokenService.cs` dòng 47 | **Chặn** |
| 10 | `JWT_SECRET` (lang-api) phải trùng `Jwt:Key` (AuthService), tối thiểu 32 ký tự. | `.env.example` | Cao |
| 11 | lang-api set refresh cookie `path: '/'` và tự set `globalPrefix('api')`, không bật CORS (vì giả định đi cùng origin qua Next.js rewrite). | `dist/main.js`, `dist/auth/auth.controller.js` | Trung bình |

## Bước 2. File/Module cần chỉnh sửa (đề xuất)

| File | Module | Lý do |
|------|--------|-------|
| `IELTSMaster.ELearning/IELTSMaster.ELearning.csproj`, `Program.cs`, `WeatherForecast.cs`, `.http`, `appsettings*.json`, `Properties/launchSettings.json` | ELearning (.NET) | Đây là template rỗng. **Phương án A:** xoá. **Phương án B:** giữ lại nhưng phải exclude `lang-simulator/**`. |
| `IELTSMaster.ELearning/lang-simulator/` | ELearning (Node) | Bản copy thiếu cần thay bằng **source đầy đủ**: dùng git submodule, hoặc trỏ thẳng tới repo ngoài. |
| `IELTSMaster.AppHost/AppHost.cs` | Orchestration | Bỏ `AddProject<ELearning>`, thêm Node app `lang-api` kèm `PORT`, `JWT_SECRET`, `DB_*`; Gateway `WithReference(langApi)`. |
| `IELTSMaster.AppHost/IELTSMaster.AppHost.csproj` | Orchestration | Bỏ ProjectReference tới ELearning (nếu chọn phương án A). |
| `IELTSMaster.ApiGateway/appsettings.Development.json`, `appsettings.Production.json` | Gateway | Thêm route `/elearning/{**catch-all}` → cluster `elearning-cluster` (`http://localhost:3101`), transform `PathPattern: /api/{**catch-all}`. |
| `IELTSMaster.AuthService/Services/ITokenService.cs` (dòng 47) | Auth | Claim `tv` phải là `ClaimValueTypes.Integer32` để JWT ra số. |
| `IELTSMaster.AuthService/appsettings*.json` / user-secrets | Auth | Đồng bộ `Jwt:Key` với `JWT_SECRET`. Không ghi secret vào git. |
| `IELTSMaster.sln` | Solution | Nếu giữ project .NET (phương án B) thì `dotnet sln add`. Phương án A thì không cần. |

## Bước 3. Cách thực hiện (Phương án A, khuyến nghị)

1. **Source lang-simulator**
   - Xoá bản copy thiếu `IELTSMaster.ELearning/lang-simulator`.
   - Hoặc thêm `git submodule add <url> IELTSMaster.ELearning/lang-simulator`, hoặc AppHost trỏ tới `..\..\lang-simulator`.
   - Sau đó chạy `pnpm install` và `pnpm --filter lang-api build` tại root monorepo.
2. **Xoá template .NET:** xoá `csproj`, `Program.cs`, `WeatherForecast.cs`, `.http`, `appsettings*`, `Properties`, `bin`, `obj`, và bỏ ProjectReference trong AppHost.
   - Theo quy ước đã thống nhất: **build trước, không lỗi mới xoá**.
3. **AppHost** (Aspire.Hosting.NodeJs 9.5 đã có sẵn):
   ```csharp
   var langApi = builder.AddNpmApp("lang-api", "../IELTSMaster.ELearning/lang-simulator/apps/lang-api", "dev")
       .WithHttpEndpoint(port: 3101, env: "PORT")
       .WithEnvironment("JWT_SECRET", builder.Configuration["Jwt:Key"])   // lấy từ user-secrets AppHost
       .WithEnvironment("DB_SCHEMA", "public");
   gateway.WithReference(langApi);
   ```
4. **Gateway:** thêm route và cluster như sau.
   ```json
   "elearning-route": {
     "ClusterId": "elearning-cluster",
     "Match": { "Path": "/elearning/{**catch-all}" },
     "Transforms": [ { "PathPattern": "/api/{**catch-all}" } ]
   }
   ...
   "elearning-cluster": { "Destinations": { "d1": { "Address": "http://localhost:3101/" } } }
   ```
5. **AuthService:** sửa claim `tv` thành `new Claim(AuthClaimTypes.TokenVersion, user.TokenVersion.ToString(), ClaimValueTypes.Integer32)`.
6. **Test**
   - `dotnet build IELTSMaster.sln` phải ra 0 lỗi.
   - Chạy AppHost, kiểm tra `GET /elearning/health` qua gateway.
   - Login bằng AuthService rồi gọi `GET /elearning/auth/me` với Bearer token, kỳ vọng 200.

**Phương án B** (giữ project .NET làm proxy hoặc host): không khuyến nghị, vì ApiGateway (YARP) đã làm nhiệm vụ proxy, nên giữ lại chỉ thêm một tầng thừa. Nếu vẫn giữ thì bắt buộc:
- Thêm `<DefaultItemExcludes>$(DefaultItemExcludes);lang-simulator/**</DefaultItemExcludes>` vào csproj.
- Add project vào sln.
- Xoá `WeatherForecast`.

### Ảnh hưởng

- **Database:** không đổi schema. lang-api dùng `public` (gồm các view trỏ tới `auth.*` và `business.*`). Lưu ý migration lang-api về sau `ALTER TABLE` trên view sẽ lỗi. **Không drop bảng trong schema `business`.**
- **API:** thêm prefix `/elearning/*` ở gateway.
- **Frontend:** `IELTSMaster.Web` sẽ gọi `/elearning/...`. lang-app (Next.js) hiện không có trong bản copy nên cần quyết định có tích hợp UI hay không.
- **Auth:** chỉ sửa kiểu claim `tv`, không ảnh hưởng các service .NET (vẫn đọc được giá trị chuỗi).

## Kết quả

Chỉ phân tích và đề xuất, chưa thay đổi code.

## Lưu ý / Câu hỏi cần quyết định

1. Chọn phương án **A (xoá template .NET, chạy lang-api bằng Node)** hay **B**?
2. Nguồn lang-simulator: **submodule**, **trỏ repo ngoài**, hay **copy đầy đủ**?
3. Login/refresh giữ ở lang-api hay chuyển hết về AuthService? (Câu hỏi còn mở từ phiên trước.)
4. File `.env` trong bản copy chứa secret thật. File đã bị `.gitignore` của lang-simulator bỏ qua, nhưng nếu xoá `.git` lồng thì cần thêm rule ignore ở repo cha.
