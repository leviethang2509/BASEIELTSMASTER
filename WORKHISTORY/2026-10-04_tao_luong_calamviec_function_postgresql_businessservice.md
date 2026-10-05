# Tao luong CaLamViec function PostgreSQL cho BusinessService

## Thoi gian

- Ngay thuc hien: 2026-10-04

## Noi dung cong viec

- Lay mau luong `CaLamViecController` tu PROJECTBASE:
  - FE controller goi URL API `calamviec/get-all-combobox`.
  - BE controller mong, goi service.
  - Service tra danh sach `ModelCombobox`.
- Thiet ke luong tuong tu trong `IELTSMaster.BusinessService`.
- Doi truy van combobox sang PostgreSQL function.
- Bo sung config API phia React ClientApp.

## File da thay doi

- `IELTSMaster.BusinessService/Controllers/CaLamViecController.cs`
- `IELTSMaster.BusinessService/Services/ICaLamViecService.cs`
- `IELTSMaster.BusinessService/Services/CaLamViecService.cs`
- `IELTSMaster.BusinessService/DTOs/DanhMuc/CaLamViecDtos.cs`
- `IELTSMaster.BusinessService/Entities/WorkShift.cs`
- `IELTSMaster.BusinessService/Infrastructure/Data/BusinessDbContext.cs`
- `IELTSMaster.BusinessService/Program.cs`
- `IELTSMaster.BusinessService/Migrations/20261004090000_AddWorkShiftFunctionFlow.cs`
- `IELTSMaster.BusinessService/ClientApp/src/config/constants.ts`
- `IELTSMaster.BusinessService/ClientApp/src/features/danhmuc/api/calamviec.api.ts`
- `IELTSMaster.BusinessService/ClientApp/src/features/danhmuc/types/calamviec.types.ts`

## Ly do thay doi

- Can co mot luong quan ly mau trong `BusinessService` tuong tu PROJECTBASE.
- Can chuan hoa endpoint API theo pattern `controller/action`.
- Can dam bao truy van combobox bang PostgreSQL function thay vi query truc tiep tren service.

## Cach xu ly

- Tao entity `WorkShift` map bang `business.work_shifts`.
- Tao DTO request `GetAllCaLamViecRequest` va keyless DTO `CaLamViecComboboxRow`.
- Tao `ICaLamViecService` va `CaLamViecService`.
- `CaLamViecService` goi:
  - `SELECT * FROM business.fn_calamviec_get_all_combobox(isChiLayCaNoiBo, currentTime)`
- Tao `CaLamViecController` route:
  - `POST /api/calamviec/get-all-combobox`
- Dang ky DI trong `Program.cs`.
- Tao migration de tao bang `work_shifts`, index, va function `business.fn_calamviec_get_all_combobox`.
- Bo sung config frontend:
  - `API_ENDPOINTS.DanhMuc.CaLamViec.GET_ALL_COMBOBOX`
  - `caLamViecService.getAllCombobox(request)`

## Ket qua kiem tra

- Da chay `dotnet build IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj --no-restore`.
- Ket qua: build thanh cong, 0 error.
- Warning con lai la warning cu cua solution/package nullable va vulnerability package `OpenTelemetry.Exporter.OpenTelemetryProtocol`.
- Da chay `npm run build` trong `IELTSMaster.BusinessService/ClientApp`.
- Ket qua: build thanh cong, chi co warning chunk lon cua Vite.

## Luu y

- Chua tu chay du an/server theo rule.md.
- Can chay migration/app de tao `business.work_shifts` va `business.fn_calamviec_get_all_combobox` tren PostgreSQL.
- Neu can du lieu mau, them ban ghi vao `business.work_shifts` sau khi migration da ap dung.
