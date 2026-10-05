# LỊCH SỬ CÔNG VIỆC: KHẢO SÁT VÀ ĐÁNH GIÁ VAI TRÒ DỰ ÁN IELTSMASTER.APIGATEWAY

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Khảo sát toàn diện kiến trúc và vai trò của project `IELTSMaster.ApiGateway` trong hệ thống IELTSMaster.
  - Phân tích chức năng, cơ chế định tuyến, công nghệ sử dụng.
  - Xác định các luồng kết nối giữa ApiGateway với Frontend và các Microservices nội bộ.
  - Đánh giá tác động và ảnh hưởng đến toàn bộ hệ thống nếu loại bỏ ApiGateway.
  - Tuân thủ quy tắc `rule.md` trong việc khảo sát, thảo luận trước khi quyết định can thiệp mã nguồn.

## 2. Thời gian thực hiện
* **Thời gian:** 22:52 - 22:55, Ngày 03/10/2026.

## 3. Các file và thành phần liên quan được khảo sát
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\IELTSMaster.ApiGateway.csproj`
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\Program.cs`
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\appsettings.Development.json`
4. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\appsettings.Production.json`
5. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\Properties\launchSettings.json`
6. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\AppHost.cs`
7. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Web\src\lib\api.ts`
8. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Web\src\config\constants.ts`

## 4. Chi tiết khảo sát & Đánh giá kỹ thuật

### 4.1. Tác dụng của IELTSMaster.ApiGateway
* **Công nghệ:** Sử dụng **Microsoft YARP (Yet Another Reverse Proxy) v2.3.0** trên nền .NET.
* **Cổng vào duy nhất (Single Entry Point / API Gateway Pattern):**
  - Chạy tại port `https://localhost:7083`.
  - Thay vì Client (Frontend/Mobile) phải biết và kết nối trực tiếp đến từng cổng riêng biệt của các service con, toàn bộ request chỉ cần gửi về port `7083`.
* **Cơ chế định tuyến (Reverse Proxy & URL Rewrite):**
  - Route `/auth/{**catch-all}` $\rightarrow$ Bỏ tiền tố `/auth` $\rightarrow$ Chuyển tiếp tới `AuthService` (`https://localhost:7190/api`).
  - Route `/business/{**catch-all}` $\rightarrow$ Bỏ tiền tố `/business` $\rightarrow$ Chuyển tiếp tới `BusinessService` (`https://localhost:7195/api`).
  - Route `/system/{**catch-all}` $\rightarrow$ Bỏ tiền tố `/system` $\rightarrow$ Chuyển tiếp tới `SystemService` (`https://localhost:7073/api`).
  - Route `/file/api/{**catch-all}` $\rightarrow$ Chuyển tiếp tới `FileService` API (`https://localhost:7185/api`).
  - Route `/file/{**catch-all}` $\rightarrow$ Chuyển tiếp tới `FileService` static files (`https://localhost:7185/`).
* **Quản trị tập trung:**
  - CORS tập trung cho Frontend (`http://localhost:5173`).
  - Kiểm soát độ lớn Request/Upload tập trung: cấu hình `MaxRequestBodySize = 120MB`.
  - Bảo mật hạ tầng: Che giấu toàn bộ cổng dịch vụ nội bộ phía sau.

### 4.2. Mối liên kết trong hệ thống
* **Nhận request từ:**
  - `IELTSMaster.Web` (Frontend Vite/React): `src/lib/api.ts` cấu hình mặc định `API_BASE_URL = https://localhost:7083`.
* **Chuyển tiếp đến (Downstream Services):**
  1. `IELTSMaster.AuthService`
  2. `IELTSMaster.BusinessService`
  3. `IELTSMaster.SystemService`
  4. `IELTSMaster.FileService`
* **Điều phối khởi động:**
  - Được khai báo trong `IELTSMaster.AppHost/AppHost.cs` với `builder.AddProject<Projects.IELTSMaster_ApiGateway>("ApiGateway")` kết nối cùng các service khác.

### 4.3. Ảnh hưởng nếu loại bỏ IELTSMaster.ApiGateway
1. **Frontend bị gãy kết nối toàn bộ:**
   - Client hiện tại chỉ gọi qua `API_BASE_URL` (port 7083). Nếu bỏ Gateway, tất cả lệnh gọi API từ giao diện Web sẽ báo lỗi `ERR_CONNECTION_REFUSED`.
   - Phải sửa lại toàn bộ kiến trúc gọi API của Frontend: tạo 4 Axios Client riêng biệt cho 4 port khác nhau (`7073`, `7185`, `7195`, `7024/7190`).
2. **Xung đột CORS và Session/Token:**
   - Mỗi Microservice sẽ phải tự mở và quản lý CORS riêng lẻ.
   - Trình duyệt sẽ phát sinh nhiều request OPTIONS (preflight) cho các origin khác nhau.
3. **Phơi bày kiến trúc nội bộ & Phức tạp khi triển khai (Production):**
   - Khi deploy lên Cloud/VPS, nếu không có Gateway nội bộ, bắt buộc phải cấu hình Nginx hoặc Cloudflare bên ngoài để làm nhiệm vụ Reverse Proxy tương tự, hoặc phải mở 4-5 cổng công khai ra Internet (tiềm ẩn rủi ro bảo mật).

## 5. Kết luận & Khuyến nghị
* **Khuyến nghị:** **NÊN GIỮ LẠI `IELTSMaster.ApiGateway`** vì đây là thành phần cốt lõi của kiến trúc Microservices trong dự án, giúp Frontend hoạt động ổn định và thống nhất.
* Báo cáo đầy đủ lại cho người dùng để trao đổi thống nhất hướng đi tiếp theo.
