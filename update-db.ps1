<#
.SYNOPSIS
    Công cụ cập nhật CSDL Code-First cho IELTS Master (chọn project cần update).
#>
param(
    [string]$Project = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

# Nếu chưa truyền tham số, hiển thị menu để chọn project
if ($Project -eq "") {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "        IELTS MASTER - CHỌN PROJECT CẦN UPDATE DATABASE (CODE-FIRST) " -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  [1] IELTSMaster.AuthService      (Schema CSDL: auth)" -ForegroundColor Yellow
    Write-Host "  [2] IELTSMaster.BusinessService  (Schema CSDL: business)" -ForegroundColor Yellow
    Write-Host "  [0] Thoát" -ForegroundColor Gray
    Write-Host "======================================================================" -ForegroundColor Cyan
    $choice = Read-Host "Nhập lựa chọn của bạn [1 hoặc 2]"
} else {
    $choice = $Project
}

$targetProject = ""
$targetSchema = ""

switch ($choice.Trim().ToLower()) {
    "1" { $targetProject = "IELTSMaster.AuthService"; $targetSchema = "auth" }
    "auth" { $targetProject = "IELTSMaster.AuthService"; $targetSchema = "auth" }
    "authservice" { $targetProject = "IELTSMaster.AuthService"; $targetSchema = "auth" }
    "2" { $targetProject = "IELTSMaster.BusinessService"; $targetSchema = "business" }
    "business" { $targetProject = "IELTSMaster.BusinessService"; $targetSchema = "business" }
    "businessservice" { $targetProject = "IELTSMaster.BusinessService"; $targetSchema = "business" }
    default {
        Write-Host "Đã hủy hoặc lựa chọn không hợp lệ." -ForegroundColor Gray
        exit 0
    }
}

$projectPath = Join-Path $rootDir $targetProject

Write-Host ""
Write-Host "--> Đang kiểm tra và cập nhật CSDL cho: $targetProject (Schema: $targetSchema)..." -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$migrationName = "AutoSync_$timestamp"

$addResult = dotnet dotnet-ef migrations add $migrationName -p $projectPath -s $projectPath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[LỖI] Không thể tạo migration:" -ForegroundColor Red
    Write-Host ($addResult -join "`n") -ForegroundColor Red
    exit 1
}

$migrationsDir = Join-Path $projectPath "Migrations"
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*$migrationName.cs"
if ($migrationFiles -and $migrationFiles.Count -gt 0) {
    $content = Get-Content -Path $migrationFiles[0].FullName -Raw
    $hasChanges = $content -match "migrationBuilder\.\w+"
    if (-not $hasChanges) {
        Write-Host "--> [KHÔNG ĐỔI] Không có thay đổi nào trong Model của $targetProject." -ForegroundColor Gray
        Write-Host "--> Đang dọn dẹp migration rỗng..." -ForegroundColor Gray
        $null = dotnet dotnet-ef migrations remove -p $projectPath -s $projectPath --force 2>&1
        Write-Host "[OK] CSDL schema '$targetSchema' đã ở trạng thái mới nhất!" -ForegroundColor Green
        exit 0
    }
}

Write-Host "--> [PHÁT HIỆN THAY ĐỔI] Đang cập nhật vào PostgreSQL schema '$targetSchema'..." -ForegroundColor Magenta
$updateResult = dotnet dotnet-ef database update -p $projectPath -s $projectPath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[LỖI] Cập nhật database thất bại:" -ForegroundColor Red
    Write-Host ($updateResult -join "`n") -ForegroundColor Red
    exit 1
}

Write-Host "[THÀNH CÔNG] Đã cập nhật thành công CSDL cho $targetProject (Schema: $targetSchema)!" -ForegroundColor Green
