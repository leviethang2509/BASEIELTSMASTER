# Tao full CRUD DanToc goi function PostgreSQL

## Thoi gian

- Ngay thuc hien: 2026-10-04

## Noi dung cong viec

- Doc luong mau HINOVA PROJECTBASE:
  - `FE/Controllers/DANHMUC/DanTocController.cs`
  - `BE/Controllers/DANHMUC/DanTocController.cs`
  - `CORE/REPONSITORY/DANHMUC/DANTOC/*`
  - Doi chieu full CRUD pattern bang module `ChucVu`.
- Tao full luong CRUD `DanToc` trong `IELTSMaster.BusinessService`.
- Dieu chinh dung yeu cau: C# chi goi function PostgreSQL da co san bang ten function + param, khong tao function trong migration/code.

## File da thay doi

- `IELTSMaster.BusinessService/Controllers/DanTocController.cs`
- `IELTSMaster.BusinessService/DTOs/DanhMuc/DanTocDtos.cs`
- `IELTSMaster.BusinessService/Services/IDanTocService.cs`
- `IELTSMaster.BusinessService/Services/DanTocService.cs`
- `IELTSMaster.BusinessService/Infrastructure/Data/BusinessDbContext.cs`
- `IELTSMaster.BusinessService/Infrastructure/Data/IBusinessUnitOfWork.cs`
- `IELTSMaster.BusinessService/Infrastructure/Data/BusinessUnitOfWork.cs`
- `IELTSMaster.BusinessService/Infrastructure/Data/IDatabaseFunctionResolver.cs`
- `IELTSMaster.BusinessService/Infrastructure/Data/DatabaseFunctionResolver.cs`
- `IELTSMaster.BusinessService/Program.cs`
- `IELTSMaster.BusinessService/appsettings.json`
- `IELTSMaster.BusinessService/Services/CaLamViecService.cs`
- `IELTSMaster.BusinessService/Profiles/DanhMuc/DanTocProfile.cs`
- `IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj`
- `IELTSMaster.BusinessService/ClientApp/src/config/constants.ts`
- `IELTSMaster.BusinessService/ClientApp/src/features/danhmuc/api/dantoc.api.ts`
- `IELTSMaster.BusinessService/ClientApp/src/features/danhmuc/types/dantoc.types.ts`

## Ly do thay doi

- Can mot luong danh muc CRUD day du tuong tu HINOVA.
- HINOVA dung URL action nhu `dantoc/get-all-combobox`; BusinessService can giu cach config API tuong tu.
- PostgreSQL function/stored logic se duoc tao va quan ly truc tiep o DB, code chi goi.

## Cach xu ly

- Tao `DanTocController` voi cac endpoint:
  - `POST /api/dantoc/get-list`
  - `POST /api/dantoc/get-by-id`
  - `POST /api/dantoc/get-by-post`
  - `POST /api/dantoc/insert`
  - `POST /api/dantoc/update`
  - `POST /api/dantoc/delete`
  - `POST /api/dantoc/delete-list`
  - `POST /api/dantoc/get-all-combobox`
- Tao `IDanTocService` va `DanTocService`.
- Service lay ten function tu `appsettings.json`:
  - `DatabaseFunctions:DanToc:GetList`
  - `DatabaseFunctions:DanToc:GetById`
  - `DatabaseFunctions:DanToc:Save`
  - `DatabaseFunctions:DanToc:DeleteList`
  - `DatabaseFunctions:DanToc:GetAllCombobox`
- Service goi function bang `SELECT * FROM function_name(@params)` va truyen param bang `NpgsqlParameter`.
- Da tao `BusinessUnitOfWork` rieng trong BusinessService de copy pattern HINOVA:
  - `_businessUnitOfWork.GetRepository<T>()`
  - `.ExecuteFunction(functionName, parameters)`
  - `CommitAsync()` de danh cho cac luong EF save truc tiep neu can.
- Khong ke thua truc tiep `_unitOfWork` cua HINOVA vi nam trong `DATABASECONNECT.dll` va phu thuoc SQL Server/project cu.
- Them AutoMapper va `DanTocProfile` theo mau `CHUCVUProfile`:
  - `CreateMap<DanTocDto, PostDanTocRequest>()`
  - `CreateMap<PostDanTocRequest, DanTocDto>()`
  - Dang ky `builder.Services.AddAutoMapper(_ => { }, typeof(Program).Assembly);`
  - `DanTocService.GetByPostAsync` dung `_mapper.Map<PostDanTocRequest>(item)`.
- Gop Insert/Update ve chung private method `SaveAsync(PostDanTocRequest request, bool isEdit)`.
  - Input truyen ca request/entity can luu.
  - Function `Save` tra ve `DanTocCommandResult` gom `Success`, `Message`, `Id`.
  - Bo `ExecuteCommandAsync`.
- Tach cach lay ten function ra dung chung toan he thong:
  - `IDatabaseFunctionResolver.GetFunctionName(module, key, fallback)`
  - `DatabaseFunctionResolver` doc `DatabaseFunctions:{module}:{key}` tu config.
  - Validate ten function bang regex tai mot cho.
  - `DanTocService` va `CaLamViecService` da dung resolver chung.
- Service tra `BaseResponse<T>` va bat loi bang `try/catch` trong tung method, theo style HINOVA:
  - `var response = new BaseResponse<T>();`
  - `try { ... response.Data = ...; }`
  - `catch (Exception ex) { response.Success = false; response.StatusCode = 500; response.Message = ex.Message; }`
- Validate ten function bang regex truoc khi ghep vao SQL.
- Khong tao migration tao table/function cho `DanToc`.
- Da go bo migration/function creation cua luong `CaLamViec` cu de dong nhat quy tac moi.
- Them config API React cho CRUD `DanToc`.

## Hop dong function PostgreSQL can co san

- `business.fn_dantoc_get_list(i_text_search, i_page_index, i_rows_per_page)`
- `business.fn_dantoc_get_by_id(i_id)`
- `business.fn_dantoc_save(i_id, i_ten_goi, i_ghi_chu, i_mo_ta, i_thu_tu_uu_tien, i_is_actived, i_is_edit, i_username)`
- `business.fn_dantoc_delete_list(i_ids, i_username)`
- `business.fn_dantoc_get_all_combobox()`

## Ket qua kiem tra

- Da chay `dotnet build IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj --no-restore`.
- Ket qua: build thanh cong, 0 error.
- Warning con lai:
  - package `OpenTelemetry.Exporter.OpenTelemetryProtocol` co advisory moderate tu truoc.
  - nullable warning cu trong `TrainingService`.
- Da chay `npm run build` trong `IELTSMaster.BusinessService/ClientApp`.
- Ket qua: build thanh cong, chi co warning chunk lon cua Vite.

## Luu y

- Chua tu chay server/app theo rule.md.
- Can tao/cap nhat cac PostgreSQL functions truc tiep tren database.
- Function tra ve can alias column dung voi DTO:
  - `DanTocDto`: `Id`, `TenGoi`, `GhiChu`, `MoTa`, `ThuTuUuTien`, `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `IsActived`, `IsEdit`, `Sort`, `TotalRow`.
  - `DanTocCommandResult`: `Success`, `Message`, `Id`.
  - `DanTocComboboxRow`: `Text`, `Value`, `Sort`, `Parent`, `IsSelected`.
