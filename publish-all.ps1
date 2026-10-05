<#
.SYNOPSIS
    Script tự động Build & Publish toàn bộ hệ thống IELTSMaster ra thư mục ./publish
.DESCRIPTION
    Tuân thủ kiến trúc microservices và fullstack hiện tại:
    - ApiGateway (YARP)
    - AuthService (JWT & Centralized Auth)
    - BusinessService (Web API + React/Vite SPA ClientApp -> wwwroot)
    - FileService (Hybrid Storage)
#>

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       BAT DAU PUBLISH TOAN BO HE THONG IELTSMASTER  " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

$publishDir = "./publish"

# 1. Dọn dẹp thư mục publish cũ nếu có
if (Test-Path $publishDir) {
    Write-Host "`n[+] Dang don dep thu muc publish cu..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $publishDir
}

# 2. Publish ApiGateway
Write-Host "`n[1/4] Dang publish IELTSMaster.ApiGateway..." -ForegroundColor Yellow
dotnet publish IELTSMaster.ApiGateway/IELTSMaster.ApiGateway.csproj -c Release -o "$publishDir/gateway" --nologo
if ($LASTEXITCODE -ne 0) { throw "Loi khi publish ApiGateway" }

# 3. Publish AuthService
Write-Host "`n[2/4] Dang publish IELTSMaster.AuthService..." -ForegroundColor Yellow
dotnet publish IELTSMaster.AuthService/IELTSMaster.AuthService.csproj -c Release -o "$publishDir/auth" --nologo
if ($LASTEXITCODE -ne 0) { throw "Loi khi publish AuthService" }

# 4. Publish BusinessService (Fullstack: Web API + React Frontend)
Write-Host "`n[3/4] Dang publish IELTSMaster.BusinessService (kem React Web Frontend)..." -ForegroundColor Yellow
dotnet publish IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj -c Release -o "$publishDir/business" --nologo
if ($LASTEXITCODE -ne 0) { throw "Loi khi publish BusinessService" }

# 5. Publish FileService
Write-Host "`n[4/4] Dang publish IELTSMaster.FileService..." -ForegroundColor Yellow
dotnet publish IELTSMaster.FileService/IELTSMaster.FileService.csproj -c Release -o "$publishDir/file" --nologo
if ($LASTEXITCODE -ne 0) { throw "Loi khi publish FileService" }

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "     PUBLISH HOAN TAT THANH CONG RA THU MUC ./publish" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Cau truc thu muc san sang trien khai:" -ForegroundColor White
Write-Host " - ./publish/gateway  : API Gateway (YARP Reverse Proxy)" -ForegroundColor Gray
Write-Host " - ./publish/auth     : AuthService" -ForegroundColor Gray
Write-Host " - ./publish/business : BusinessService + Frontend React (trong wwwroot)" -ForegroundColor Gray
Write-Host " - ./publish/file     : FileService" -ForegroundColor Gray
