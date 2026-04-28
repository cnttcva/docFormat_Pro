@echo off
chcp 65001 >nul
title Kiem tra docFormat PDF Helper

echo ============================================================
echo              KIEM TRA docFormat PDF Helper
echo ============================================================
echo.

echo Dang kiem tra trang thai PDF Helper...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"try {" ^
"  $r = Invoke-RestMethod -Uri 'http://localhost:8787/health' -TimeoutSec 3;" ^
"  if ($r.ok -eq $true -and $r.libreOfficeDetected -eq $true) {" ^
"    Write-Host '[OK] PDF Helper dang chay va da tim thay LibreOffice.';" ^
"    exit 0;" ^
"  } elseif ($r.ok -eq $true -and $r.libreOfficeDetected -eq $false) {" ^
"    Write-Host '[CAN CAI LIBREOFFICE] PDF Helper dang chay nhung chua tim thay LibreOffice.';" ^
"    exit 2;" ^
"  } else {" ^
"    Write-Host '[LOI] PDF Helper phan hoi khong dung.';" ^
"    exit 3;" ^
"  }" ^
"} catch {" ^
"  Write-Host '[CHUA CHAY] Chua ket noi duoc PDF Helper tai http://localhost:8787';" ^
"  exit 1;" ^
"}"

set "STATUS=%ERRORLEVEL%"

echo.

if "%STATUS%"=="0" (
    echo May tinh da san sang de dung nut Tai PDF trong docFormat Pro.
    echo.
    start "" "http://localhost:8787"
    pause
    exit /b
)

if "%STATUS%"=="1" (
    echo PDF Helper chua chay.
    echo.
    echo Cach xu ly:
    echo 1. Ra Desktop.
    echo 2. Bam dup bieu tuong docFormat PDF Helper.
    echo 3. Giu cua so PDF Helper dang mo.
    echo 4. Quay lai docFormat Pro va bam Tai PDF.
    echo.
    pause
    exit /b
)

if "%STATUS%"=="2" (
    echo May tinh chua co LibreOffice hoac cai khong dung duong dan mac dinh.
    echo Trinh duyet se mo trang tai LibreOffice.
    echo.
    start "" "https://www.libreoffice.org/download/"
    pause
    exit /b
)

echo Co loi khong xac dinh khi kiem tra PDF Helper.
echo Vui long tat PDF Helper, mo lai, sau do kiem tra lai.
echo.
pause