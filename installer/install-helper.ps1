# ============================================================
# docFormat PDF Helper - Install Helper Script
# Phiên bản: 1.0.0
# 
# Script này sẽ:
# 1. Kiểm tra Node.js (cài Node Portable nếu chưa có)
# 2. Kiểm tra LibreOffice (download installer nếu chưa có)
# 3. Chạy npm install để cài thư viện
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallDir
)

# UTF-8 cho output console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==================================================="
Write-Host "  docFormat PDF Helper - Cai dat moi truong"
Write-Host "==================================================="
Write-Host ""

# Set TLS 1.2 cho việc download (Windows cũ default TLS 1.0)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ============================================================
# BUOC 1: KIEM TRA NODE.JS
# ============================================================
Write-Host "[1/3] Kiem tra Node.js..." -ForegroundColor Cyan

$nodeCmd = $null

# Kiểm tra node trong PATH hệ thống
try {
    $nodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Path
    if ($nodePath) {
        $nodeVersion = & node --version 2>&1
        Write-Host "  [OK] Da co Node.js $nodeVersion tai: $nodePath" -ForegroundColor Green
        $nodeCmd = "node"
    }
} catch {
    # Tiếp tục kiểm tra portable
}

# Nếu không có Node trong PATH, tải Node Portable
if (-not $nodeCmd) {
    Write-Host "  [!] Khong tim thay Node.js. Dang tai Node Portable..." -ForegroundColor Yellow
    
    $nodePortableDir = Join-Path $InstallDir "node-portable"
    $nodeZipPath = Join-Path $env:TEMP "node-portable.zip"
    
    # Node.js 20 LTS portable (~30MB)
    $nodeUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
    
    try {
        Write-Host "  Dang tai tu: $nodeUrl"
        Write-Host "  (Khoang 30MB, vui long doi...)"
        
        $progressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZipPath -UseBasicParsing
        $progressPreference = 'Continue'
        
        Write-Host "  Da tai xong. Dang giai nen..."
        
        # Giải nén
        if (Test-Path $nodePortableDir) {
            Remove-Item $nodePortableDir -Recurse -Force
        }
        Expand-Archive -Path $nodeZipPath -DestinationPath $InstallDir -Force
        
        # Đổi tên thư mục giải nén thành "node-portable"
        $extractedDir = Get-ChildItem -Path $InstallDir -Directory | Where-Object { $_.Name -like "node-v*-win-x64" } | Select-Object -First 1
        if ($extractedDir) {
            Move-Item -Path $extractedDir.FullName -Destination $nodePortableDir -Force
        }
        
        # Xóa file zip
        Remove-Item $nodeZipPath -Force -ErrorAction SilentlyContinue
        
        $nodeCmd = Join-Path $nodePortableDir "node.exe"
        $nodeVersion = & $nodeCmd --version 2>&1
        Write-Host "  [OK] Da cai Node Portable $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "  [LOI] Khong the tai Node.js: $_" -ForegroundColor Red
        Write-Host "  Vui long cai Node.js thu cong tu https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# ============================================================
# BUOC 2: KIEM TRA LIBREOFFICE
# ============================================================
Write-Host "[2/3] Kiem tra LibreOffice..." -ForegroundColor Cyan

$libreOfficePaths = @(
    "C:\Program Files\LibreOffice\program\soffice.exe",
    "C:\Program Files (x86)\LibreOffice\program\soffice.exe"
)

$libreOfficeFound = $false
foreach ($path in $libreOfficePaths) {
    if (Test-Path $path) {
        Write-Host "  [OK] Da co LibreOffice tai: $path" -ForegroundColor Green
        $libreOfficeFound = $true
        break
    }
}

if (-not $libreOfficeFound) {
    Write-Host "  [!] Khong tim thay LibreOffice. Dang tai installer..." -ForegroundColor Yellow
    
    $libreOfficeInstallerPath = Join-Path $env:TEMP "LibreOffice_installer.msi"
    
    # LibreOffice 24.8 stable (~350MB)
    $libreOfficeUrl = "https://download.documentfoundation.org/libreoffice/stable/24.8.4/win/x86_64/LibreOffice_24.8.4_Win_x86-64.msi"
    
    try {
        Write-Host "  Dang tai LibreOffice tu: $libreOfficeUrl"
        Write-Host "  (Khoang 350MB, co the mat 5-10 phut tuy toc do mang...)"
        
        $progressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $libreOfficeUrl -OutFile $libreOfficeInstallerPath -UseBasicParsing
        $progressPreference = 'Continue'
        
        Write-Host "  Da tai xong. Dang cai dat (silent mode)..."
        Write-Host "  (Co the mat 2-3 phut, vui long doi...)"
        
        # Cài silent với MSI
        $msiArgs = @(
            "/i",
            "`"$libreOfficeInstallerPath`"",
            "/quiet",
            "/norestart",
            "ADDLOCAL=ALL",
            "REMOVE=gm_o_Onlineupdate"
        )
        
        $process = Start-Process "msiexec.exe" -ArgumentList $msiArgs -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-Host "  [OK] Da cai LibreOffice thanh cong." -ForegroundColor Green
        } else {
            Write-Host "  [CANH BAO] Cai dat LibreOffice tra ve ma: $($process.ExitCode)" -ForegroundColor Yellow
        }
        
        # Xóa file installer
        Remove-Item $libreOfficeInstallerPath -Force -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "  [LOI] Khong the tai/cai LibreOffice: $_" -ForegroundColor Red
        Write-Host "  Vui long tai thu cong tu https://www.libreoffice.org/" -ForegroundColor Yellow
        # Không exit - tiếp tục cài Helper
    }
}

Write-Host ""

# ============================================================
# BUOC 3: CHAY NPM INSTALL
# ============================================================
Write-Host "[3/3] Cai dat thu vien Node.js..." -ForegroundColor Cyan

Set-Location $InstallDir

# Xác định npm command
$npmCmd = "npm"
if ($nodeCmd -ne "node") {
    $npmCmd = Join-Path (Split-Path $nodeCmd -Parent) "npm.cmd"
}

try {
    Write-Host "  Dang chay: npm install --omit=dev --no-audit --no-fund"
    Write-Host "  (Co the mat 1-2 phut...)"
    
    $npmOutput = & $npmCmd install --omit=dev --no-audit --no-fund 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Da cai thu vien thanh cong." -ForegroundColor Green
    } else {
        Write-Host "  [CANH BAO] npm install tra ve ma: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host $npmOutput
    }
} catch {
    Write-Host "  [LOI] Khong the chay npm install: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================="
Write-Host "  Cai dat moi truong hoan tat!"
Write-Host "==================================================="
Write-Host ""

exit 0
