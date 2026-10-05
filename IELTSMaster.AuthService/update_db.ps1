<#
.SYNOPSIS
    Script cập nhật database Code-First độc lập phạm vi riêng cho AuthService (Schema: auth).
#>
param(
    [string]$Name = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$serviceDir = $PSScriptRoot
if (-not $serviceDir) { $serviceDir = Get-Location }

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " [AUTH SERVICE] CAP NHAT DATABASE CODE-FIRST (SCHEMA: auth)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$migrationName = "AutoSync_$timestamp"
if ($Name -ne "") {
    $migrationName = "${Name}_$timestamp"
}

Write-Host "--> Dang kiem tra thay doi Entity trong AuthService..." -ForegroundColor Yellow
$addResult = dotnet dotnet-ef migrations add $migrationName -p $serviceDir -s $serviceDir 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[LOI] Khong the tao migration cho AuthService:" -ForegroundColor Red
    Write-Host ($addResult -join "`n") -ForegroundColor Red
    exit 1
}

$migrationsDir = Join-Path $serviceDir "Migrations"
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*$migrationName.cs"
if (-not $migrationFiles -or $migrationFiles.Count -eq 0) {
    Write-Host "[CANH BAO] Khong tim thay file migration $migrationName" -ForegroundColor Yellow
    exit 1
}
$migrationFile = $migrationFiles[0]

$content = Get-Content -Path $migrationFile.FullName -Raw
$hasRealChanges = $content -match "migrationBuilder\.\w+"

if (-not $hasRealChanges) {
    Write-Host "--> [KHONG DOI] Khong co thay doi nao trong Model/Entity cua AuthService." -ForegroundColor Gray
    Write-Host "--> Dang don dep migration rong..." -ForegroundColor Gray
    $null = dotnet dotnet-ef migrations remove -p $serviceDir -s $serviceDir --force 2>&1
    Write-Host "[OK] CSDL schema 'auth' da o trang thai moi nhat!" -ForegroundColor Green
    exit 0
}

Write-Host "--> [PHAT HIEN THAY DOI] Phat hien thay doi Entity trong AuthService!" -ForegroundColor Magenta
Write-Host "    File migration: $($migrationFile.Name)" -ForegroundColor Magenta
Write-Host "--> Dang cap nhat (database update) vao PostgreSQL schema 'auth'..." -ForegroundColor Yellow

$updateResult = dotnet dotnet-ef database update -p $serviceDir -s $serviceDir 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[LOI] Cap nhat database that bai:" -ForegroundColor Red
    Write-Host ($updateResult -join "`n") -ForegroundColor Red
    exit 1
}

Write-Host "[THANH CONG] Da cap nhat thanh cong vao PostgreSQL schema 'auth'!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
