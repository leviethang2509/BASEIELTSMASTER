<#
.SYNOPSIS
    Tự động kiểm tra thay đổi Model/Entity trên toàn bộ hệ thống và tự động cập nhật CSDL PostgreSQL (Code-First Auto Sync).

.DESCRIPTION
    Script này tự động:
    1. So sánh (auto-diff) toàn bộ Entity C# trong DbContext với cơ sở dữ liệu hiện tại.
    2. Nếu phát hiện thay đổi (thêm bảng, thêm cột, sửa kiểu dữ liệu, index, khóa ngoại,...):
       - Tự động sinh Migration với tên gợi nhớ hoặc timestamp.
       - Tự động áp dụng Migration thẳng vào PostgreSQL schema tương ứng (auth hoặc business).
    3. Nếu không có bất kỳ thay đổi nào trong code C#:
       - Tự động hủy migration rỗng, giữ cho thư mục Migrations luôn gọn gàng.
    4. Lập trình viên KHÔNG CẦN phải nhớ bảng nào thay đổi hay gõ lệnh SQL thủ công.

.PARAMETER Service
    Dịch vụ cần đồng bộ: "All" (mặc định), "Auth", hoặc "Business".

.PARAMETER Name
    Tên gợi nhớ cho Migration (tùy chọn). Mặc định sẽ tự sinh: AutoSync_yyyyMMdd_HHmmss.

.EXAMPLE
    .\scripts\sync-database.ps1
    Đồng bộ tất cả dịch vụ (AuthService và BusinessService).

.EXAMPLE
    .\scripts\sync-database.ps1 -Service Business -Name "AddStudentSubmission"
    Đồng bộ riêng BusinessService với tên migration cụ thể.
#>

param(
    [ValidateSet("All", "Auth", "Business")]
    [string]$Service = "All",
    [string]$Name = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
if (-not $rootDir) {
    $rootDir = Get-Location
}

function Sync-Service {
    param(
        [string]$ServiceName,
        [string]$ProjectPath,
        [string]$SchemaName
    )

    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host " [KIỂM TRA & ĐỒNG BỘ] Dịch vụ: $ServiceName (Schema: $SchemaName)" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $migrationName = "AutoSync_$timestamp"
    if ($Name -ne "") {
        $migrationName = "${Name}_$timestamp"
    }

    Write-Host "--> Đang quét toàn bộ Entity/Bảng để tìm thay đổi..." -ForegroundColor Yellow
    $addResult = dotnet dotnet-ef migrations add $migrationName -p $ProjectPath -s $ProjectPath 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[LỖI] Không thể tạo Migration cho $ServiceName :" -ForegroundColor Red
        Write-Host ($addResult -join "`n") -ForegroundColor Red
        return $false
    }

    # Tìm file migration vừa tạo
    $migrationsDir = Join-Path $ProjectPath "Migrations"
    $migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*$migrationName.cs"
    if (-not $migrationFiles -or $migrationFiles.Count -eq 0) {
        Write-Host "[CẢNH BÁO] Không tìm thấy file migration vừa tạo: $migrationName" -ForegroundColor Yellow
        return $false
    }
    $migrationFile = $migrationFiles[0]

    # Đọc nội dung file migration để kiểm tra xem Up() có chứa thay đổi không
    $content = Get-Content -Path $migrationFile.FullName -Raw
    $hasRealChanges = $content -match "migrationBuilder\.\w+"

    if (-not $hasRealChanges) {
        Write-Host "--> [KHÔNG ĐỔI] Không phát hiện bất kỳ thay đổi nào trong Model/Entity của $ServiceName." -ForegroundColor Gray
        Write-Host "--> Đang dọn dẹp migration rỗng..." -ForegroundColor Gray
        $removeResult = dotnet dotnet-ef migrations remove -p $ProjectPath -s $ProjectPath --force 2>&1
        Write-Host "[OK] CSDL cho $ServiceName đã ở trạng thái mới nhất!" -ForegroundColor Green
        return $true
    }

    Write-Host "--> [PHÁT HIỆN THAY ĐỔI] Đã phát hiện thay đổi Entity trong $ServiceName!" -ForegroundColor Magenta
    Write-Host "    File migration: $($migrationFile.Name)" -ForegroundColor Magenta
    Write-Host "--> Đang tự động áp dụng (Database Update) vào PostgreSQL (schema: $SchemaName)..." -ForegroundColor Yellow

    $updateResult = dotnet dotnet-ef database update -p $ProjectPath -s $ProjectPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[LỖI] Áp dụng Migration thất bại:" -ForegroundColor Red
        Write-Host ($updateResult -join "`n") -ForegroundColor Red
        return $false
    }

    Write-Host "[THÀNH CÔNG] Đã cập nhật thành công tất cả thay đổi vào CSDL PostgreSQL schema '$SchemaName'!" -ForegroundColor Green
    return $true
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  IELTS MASTER - CÔNG CỤ TỰ ĐỘNG ĐỒNG BỘ CSDL (CODE-FIRST AUTO SYNC)  " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green

$authProject = Join-Path $rootDir "IELTSMaster.AuthService"
$businessProject = Join-Path $rootDir "IELTSMaster.BusinessService"

$success = $true

if ($Service -eq "All" -or $Service -eq "Auth") {
    $res = Sync-Service -ServiceName "AuthService" -ProjectPath $authProject -SchemaName "auth"
    if (-not $res) {
        $success = $false
    }
}

if ($Service -eq "All" -or $Service -eq "Business") {
    $res = Sync-Service -ServiceName "BusinessService" -ProjectPath $businessProject -SchemaName "business"
    if (-not $res) {
        $success = $false
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
if ($success) {
    Write-Host " [HOÀN TẤT] Quá trình kiểm tra và cập nhật CSDL hoàn tất thành công!" -ForegroundColor Green
}
if (-not $success) {
    Write-Host " [CẢNH BÁO] Có dịch vụ gặp lỗi trong quá trình đồng bộ." -ForegroundColor Red
}
Write-Host "======================================================================" -ForegroundColor Cyan
