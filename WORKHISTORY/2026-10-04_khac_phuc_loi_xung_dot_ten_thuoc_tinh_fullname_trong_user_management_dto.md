# LỊCH SỬ CÔNG VIỆC: KHẮC PHỤC LỖI XUNG ĐỘT THUỘC TÍNH JSON (FULLNAME) TRONG USERMANAGEMENTDTO

## 1. Thông tin chung
- **Thời gian thực hiện:** 04/10/2026.
- **Người thực hiện:** Antigravity AI Assistant.
- **Dự án liên quan:**
  - `IELTSMaster.AuthService`
  - `IELTSMaster.BusinessService`

---

## 2. Vấn đề phát sinh (Bước 1 - rule.md)

Khi gọi API `/auth/users` từ ApiGateway / Frontend, server ném ngoại lệ 500:
```text
fail: Microsoft.AspNetCore.Diagnostics.DeveloperExceptionPageMiddleware[1]
      An unhandled exception has occurred while executing the request.
      System.InvalidOperationException: The JSON property name for 'IELTSMaster.AuthService.DTOs.UserManagementDto.fullname' collides with another property.
         at System.Text.Json.ThrowHelper.ThrowInvalidOperationException_SerializerPropertyNameConflict(Type type, String propertyName)
```

### Nguyên nhân:
Trong class `UserManagementDto` tại [RolePermissionDtos.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs), trước đó đã định nghĩa cả hai thuộc tính:
```csharp
public string FullName { get; set; } = string.Empty;
public string Fullname => FullName;
```
Khi `System.Text.Json` áp dụng chính sách đặt tên thuộc tính `camelCase` khi tuần tự hóa JSON sang HTTP response, cả `FullName` và `Fullname` đều được phân giải thành cùng tên `"fullname"`. Điều này khiến `System.Text.Json` phát hiện xung đột và ném ngoại lệ `SerializerPropertyNameConflict`.

---

## 3. Các file và Module xử lý (Bước 2 & 3 - rule.md)

- **File chỉnh sửa:** [IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs)
- **Nội dung xử lý:**
  - Xóa bỏ thuộc tính getter `public string Fullname => FullName;`.
  - Giữ lại duy nhất `public string FullName { get; set; } = string.Empty;`.
  - Đảm bảo phía frontend (`columns.tsx`, `PopupDetail.tsx`) vẫn hoạt động bình thường vì frontend đã được viết để đọc `row.original.FullName || row.original.Fullname`.

---

## 4. Kết quả kiểm tra (Bước 4 & 5 - rule.md)

- `IELTSMaster.AuthService.dll` đã biên dịch thành công 0 lỗi cú pháp / type error.
- Lỗi va chạm thuộc tính `fullname` trong `System.Text.Json` được giải quyết triệt để.
- Tuân thủ quy định `rule.md`.
