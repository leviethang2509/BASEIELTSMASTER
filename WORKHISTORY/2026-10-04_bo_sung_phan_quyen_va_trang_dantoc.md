# Bổ sung phân quyền và trang Dân tộc

## Nội dung
- Chuyển thông báo API `DanToc` sang tiếng Việt có dấu.
- Bổ sung seed/upsert nhóm `Danh mục` và menu phân quyền `Dân tộc`.
- Bổ sung hạng mục quyền `Quản lý danh mục Dân tộc` trong ma trận quyền.
- Thêm trang CRUD `/dantoc` trên frontend và hiển thị menu `Dân tộc` theo quyền.
- Tự refetch cache menu/quyền nếu localStorage cũ thiếu controller `DanToc`.

## Kiểm tra
- `dotnet build IELTSMaster.AuthService\IELTSMaster.AuthService.csproj --no-restore /p:UseSharedCompilation=false`
- `dotnet build IELTSMaster.BusinessService\IELTSMaster.BusinessService.csproj --no-restore /p:UseSharedCompilation=false`
- `npm run build` trong `IELTSMaster.BusinessService\ClientApp`
