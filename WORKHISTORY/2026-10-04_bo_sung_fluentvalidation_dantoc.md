# Bổ sung FluentValidation cho Dân tộc

## Nội dung
- Thêm package `FluentValidation` cho `IELTSMaster.BusinessService`.
- Thêm validator cho thêm/cập nhật/xóa/xóa danh sách dân tộc.
- Controller `DanToc` validate request bằng FluentValidation và trả lỗi tiếng Việt có dấu.
- Chuyển các thông báo lỗi service `DanToc` còn không dấu sang tiếng Việt có dấu.

## Kiểm tra
- `dotnet restore IELTSMaster.BusinessService\IELTSMaster.BusinessService.csproj`
- `dotnet build IELTSMaster.BusinessService\IELTSMaster.BusinessService.csproj --no-restore /p:UseSharedCompilation=false`
- `npm run build` trong `IELTSMaster.BusinessService\ClientApp`
