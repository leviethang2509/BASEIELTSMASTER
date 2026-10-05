# LỊCH SỬ CÔNG VIỆC: KHẮC PHỤC LỖI MẤT QUYỀN KHI RELOAD TRANG VÀ LỖI BẢNG KHÔNG HIỂN THỊ DỮ LIỆU Ở CLIENT REACT

## 1. Thông tin chung
- **Thời gian thực hiện**: 2026-10-04
- **Dự án**: IELTSMaster (AuthService, BusinessService, ClientApp React)
- **Người thực hiện**: Antigravity Pair Programmer
- **Tuân thủ quy trình**: `rule.md` (5 bước nghiêm ngặt)

---

## 2. Vấn đề phát sinh (Root Cause Analysis)

### Vấn đề 1: Vì sao load lại trang (F5) lại bị mất quyền?
1. **So khớp Controller phân biệt hoa/thường (Case-sensitive mismatch)**:
   - Trên thanh URL trình duyệt, `pathname = useLocation().pathname.split("/")[1]` cho ra chuỗi chữ thường: `"user"`, `"role"`, `"menu"`, `"systemgroup"`, `"auditlog"`.
   - Trong `AuthContext.tsx`, hàm `getPermission` so sánh:
     `currentPermissions?.find((item) => item.Controller === pathname)`
   - Trong database và cấu hình hệ thống, tên `Controller` được lưu dạng PascalCase: `"User"`, `"Role"`, `"Menu"`, `"SystemGroup"`.
   - Kết quả: `"User" === "user"` -> `false`, hàm trả về `undefined`.
2. **Sai lệch cấu trúc DTO giữa AuthService và Frontend**:
   - `RolesController.cs` endpoint `[HttpGet("user-permissions")]` trước đó chỉ trả về `List<string>` dạng `["system:users:manage", ...]`.
   - Trong khi đó, `ProtectedRoute.tsx` và `AuthContext.tsx` ở React lại yêu cầu mảng đối tượng `GetPermissionByUser[]` chứa các trường `{ Controller, IsViewed, IsAdded, IsUpdated, IsDeleted, IsApproved, IsAnalyzed }`.
   - Khi frontend duyệt mảng string, `item.Controller` luôn là `undefined`.
3. **Quản trị viên (`SYSTEM_OWNER`, `SYSTEM_ADMIN`) không được bypass quyền trong `getPermission`**:
   - Khi refresh trang, nếu dữ liệu permissions chưa kịp đồng bộ hoặc menu chưa khớp, `getPermission` trả về `undefined`.
   - `ProtectedRoute.tsx` kiểm tra:
     `if (!permission?.IsViewed) return <Navigate to="/unauthorized" replace />;`
     dẫn đến lập tức đá người dùng về trang `/unauthorized` hoặc ẩn toàn bộ nút chức năng Thêm / Sửa / Xóa.
4. **Thiếu cơ chế fallback lấy quyền từ danh sách Menu**:
   - Mỗi Menu trong cơ sở dữ liệu đã có sẵn các cờ `CanView`, `CanAdd`, `CanUpdate`, `CanDelete`, `CanApprove`, `CanAnalyze`. Nếu permissions từ role chưa nạp thì cần fallback lấy từ Menu mà người dùng sở hữu.

---

### Vấn đề 2: Response API có trả về dữ liệu nhưng Client React không hiển thị dữ liệu?
1. **Xung đột JSON Casing Policy (camelCase vs PascalCase)**:
   - Trong .NET 8 ASP.NET Core, bộ serializer mặc định `System.Text.Json` chuyển đổi toàn bộ tên thuộc tính C# sang **camelCase**:
     - `Data` -> `data`
     - `TotalRow` -> `totalRow`
     - `PageIndex` -> `pageIndex`
     - `PageSize` -> `pageSize`
     - `Username` -> `username` / `userName`
     - `Fullname` -> `fullname` / `fullName`
     - `Email` -> `email`
     - `SystemRole` -> `systemRole`
   - Trong khi đó, toàn bộ ClientApp React (`useUser.ts`, `useSystemGroup.ts`, `useMenu.ts`, `useAuditLog.ts`, `ListPageLayout.tsx`):
     ```typescript
     const data = listResponse?.Data || { Data: [], TotalRow: 0, PageIndex: 1, PageSize: 10 };
     ```
   - Vì response trả về thuộc tính `data` chữ thường, `listResponse?.Data` luôn là `undefined`!
   - Kết quả: `data` nhận giá trị mặc định `{ Data: [], TotalRow: 0 }`, bảng TanStack Table nhận mảng dữ liệu rỗng `[]` và hiển thị "Không có dữ liệu" dù Network Tab của trình duyệt thấy dữ liệu JSON trả về đầy đủ.
2. **Cột bảng `columns.tsx` chỉ map thuộc tính PascalCase**:
   - Các cột `accessorKey: "Username"`, `accessorKey: "Fullname"`, `accessorKey: "Role"` không đọc được nếu backend trả về camelCase.

---

## 3. Danh sách các File đã thay đổi

1. [IELTSMaster.AuthService/Program.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Program.cs):
   - Bổ sung `.AddJsonOptions(options => options.JsonSerializerOptions.PropertyNamingPolicy = null)` để giữ nguyên tên thuộc tính PascalCase C#.
2. [IELTSMaster.BusinessService/Program.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Program.cs):
   - Bổ sung `.AddJsonOptions(options => options.JsonSerializerOptions.PropertyNamingPolicy = null)`.
3. [IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs):
   - Thêm lớp `GetPermissionByUserDto` với các cờ `Controller`, `IsViewed`, `IsAdded`, `IsUpdated`, `IsDeleted`, `IsApproved`, `IsAnalyzed`.
4. [IELTSMaster.AuthService/Controllers/RolesController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/RolesController.cs):
   - Cập nhật endpoint `[HttpGet("user-permissions")]`:
     - Trả về `List<GetPermissionByUserDto>`.
     - Tự động gán full quyền cho `SystemOwner` và `SystemAdmin` trên mọi menu.
     - Luôn đảm bảo có quyền truy cập cho các core controllers (`Home`, `User`, `Role`, `SystemGroup`, `Menu`, `AuditLog`).
5. [IELTSMaster.BusinessService/ClientApp/src/contexts/AuthContext.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/contexts/AuthContext.tsx):
   - `fetchUserData`: Sử dụng `userId` an toàn (`currentUser.Id || currentUser.id`).
   - Cải tiến toàn diện `getPermission`:
     - Nhận diện vai trò tối cao (`SYSTEM_OWNER`, `SYSTEM_ADMIN`, `ADMIN`) để luôn cấp full quyền.
     - So khớp route không phân biệt hoa thường (`cleanPath`).
     - Hỗ trợ cả 2 dạng casing (`Controller`/`controller`, `IsViewed`/`isViewed`).
     - Tự động fallback sang danh sách Menu người dùng (`CanView`, `CanAdd`, `CanUpdate`, `CanDelete`...).
6. [IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useUser.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useUser.ts):
   - Chuẩn hóa đọc an toàn cả `Data.Data` / `data.data`, `TotalRow` / `totalRow`.
   - Chuẩn hóa từng bản ghi User (`Id`, `Username`, `Email`, `Fullname`, `SystemRole`, `Status`, `IsActived`...).
7. [IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useSystemGroup.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useSystemGroup.ts):
   - Chuẩn hóa đọc an toàn cả PascalCase và camelCase.
8. [IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useMenu.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useMenu.ts):
   - Chuẩn hóa đọc an toàn cả PascalCase và camelCase.
9. [IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useAuditLog.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/hooks/useAuditLog.ts):
   - Chuẩn hóa đọc dữ liệu bảng và 2 dropdown `entityNames`, `actions`.
10. [IELTSMaster.BusinessService/ClientApp/src/features/system/routes/User/columns.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/routes/User/columns.tsx):
    - Đọc dữ liệu an toàn cho các cell renderer (`Email`, `Fullname`, `Role`, `IsActived`).
11. [IELTSMaster.BusinessService/ClientApp/src/features/system/routes/Role/index.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/routes/Role/index.tsx):
    - Chuẩn hóa đọc dữ liệu ma trận phân quyền và danh sách người dùng.
12. [IELTSMaster.BusinessService/ClientApp/src/features/system/routes/AuditLog/AuditLogPage.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/routes/AuditLog/AuditLogPage.tsx):
    - Khắc phục lỗi TypeScript type annotation khi build.

---

## 4. Kết quả kiểm tra & Biên dịch

- **Backend .NET 8**:
  - `IELTSMaster.AuthService`: `Build succeeded. 0 Error(s)`.
  - `IELTSMaster.BusinessService`: `Build succeeded. 0 Error(s)`.
- **Frontend React (Vite + TypeScript)**:
  - `tsc -b && vite build`: `✓ built in 1.29s` thành công 100%, không còn bất kỳ lỗi TypeScript nào.
