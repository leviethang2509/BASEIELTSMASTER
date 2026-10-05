# LỊCH SỬ CÔNG VIỆC: KHẮC PHỤC LỖI YARP REVERSE PROXY TỪ CHỐI KẾT NỐI (CONNECTION REFUSED LOCALHOST:5000)

## 1. Thông tin chung
- **Thời gian thực hiện:** 04/10/2026.
- **Người thực hiện:** Antigravity AI Assistant.
- **Dự án liên quan:**
  - `IELTSMaster.ApiGateway` (Reverse Proxy)
  - `IELTSMaster.AuthService`

---

## 2. Vấn đề phát sinh

Hệ thống ghi nhận cảnh báo/lỗi từ `Yarp.ReverseProxy.Forwarder.HttpForwarder`:
```text
warn: Yarp.ReverseProxy.Forwarder.HttpForwarder[48]
      Request: An error was encountered before receiving a response.
      System.Net.Http.HttpRequestException: No connection could be made because the target machine actively refused it. (localhost:5000)
       ---> System.Net.Sockets.SocketException (10061): No connection could be made because the target machine actively refused it.
```

### Nguyên nhân:
1. Khi chạy toàn bộ giải pháp IELTSMaster bằng Visual Studio (F5) hoặc .NET Aspire (`AppHost`), `IELTSMaster.AuthService` được cấu hình chạy theo profile `https` trong `launchSettings.json` và lắng nghe trên các cổng:
   - **HTTPS:** `7024`
   - **HTTP:** `5175`
2. Trước đó trong file cấu hình `IELTSMaster.ApiGateway/appsettings.Development.json`, địa chỉ của `auth-cluster` được trỏ tạm thời về `http://localhost:5000/api`.
3. Khi dịch vụ chạy qua Aspire/Visual Studio, không có tiến trình nào lắng nghe cổng `5000`, dẫn đến socket bị từ chối kết nối (`SocketException 10061`).

---

## 3. Các bước xử lý và Thay đổi

### 3.1. File chỉnh sửa:
- **[IELTSMaster.ApiGateway/appsettings.Development.json](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.ApiGateway/appsettings.Development.json)**

### 3.2. Nội dung thay đổi:
Cập nhật địa chỉ `Destination` của cụm `auth-cluster` từ `http://localhost:5000/api` sang cổng HTTP chuẩn của AuthService khi chạy trong môi trường phát triển:
```json
      "auth-cluster": {
        "Destinations": {
          "destination1": {
            "Address": "http://localhost:5175/api"
          }
        }
      }
```

---

## 4. Kiểm tra và Xác minh (Verification)

1. Kiểm tra trạng thái cổng `5175` của `AuthService`:
   - `http://localhost:5175/api/roles` &rarr; **HTTP 200 OK**
2. Kiểm tra định tuyến qua ApiGateway (`https://localhost:7083`):
   - `https://localhost:7083/auth/roles` &rarr; **HTTP 200 OK** (Dữ liệu trả về đầy đủ danh sách vai trò).
   - `https://localhost:7083/auth/users` &rarr; **HTTP 200 OK** (Dữ liệu người dùng từ PostgreSQL `auth.users`).
   - `https://localhost:7083/auth/roles/matrix` &rarr; **HTTP 200 OK** (Ma trận quyền hạn hệ thống).
3. Lỗi `SocketException 10061` tại `localhost:5000` được khắc phục hoàn toàn.
