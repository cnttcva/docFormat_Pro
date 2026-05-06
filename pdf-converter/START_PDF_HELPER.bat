@echo off
chcp 65001 >nul
title docFormat PDF Helper

cd /d "%~dp0"

echo ============================================================
echo              docFormat PDF Helper dang khoi dong
echo ============================================================
echo.
echo Cong cu nay giup docFormat Pro xuat file PDF.
echo Hay giu cua so nay dang mo trong luc su dung nut Tai PDF.
echo.

set "LIBREOFFICE_1=C:\Program Files\LibreOffice\program\soffice.exe"
set "LIBREOFFICE_2=C:\Program Files (x86)\LibreOffice\program\soffice.exe"

echo [1/4] Kiem tra Node.js...

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [CAN CAI THEM] May tinh chua co Node.js.
    echo Trinh duyet se mo trang tai Node.js.
    echo Cai xong, hay chay lai docFormat PDF Helper.
    echo.
    start "" "https://nodejs.org/en/download"
    pause
    exit /b
)

node -v
echo OK.
echo.

echo [2/4] Kiem tra LibreOffice...

if exist "%LIBREOFFICE_1%" (
    echo Da tim thay LibreOffice.
) else if exist "%LIBREOFFICE_2%" (
    echo Da tim thay LibreOffice.
) else (
    echo.
    echo [CAN CAI THEM] May tinh chua co LibreOffice.
    echo Trinh duyet se mo trang tai LibreOffice.
    echo Cai xong, hay chay lai docFormat PDF Helper.
    echo.
    start "" "https://www.libreoffice.org/download/"
    pause
    exit /b
)

echo OK.
echo.

echo [3/4] Kiem tra file he thong...

if not exist "server.js" (
    echo.
    echo [LOI] Khong tim thay server.js.
    echo Vui long cai lai docFormat PDF Helper.
    echo.
    pause
    exit /b
)

if not exist "package.json" (
    echo.
    echo [LOI] Khong tim thay package.json.
    echo Vui long cai lai docFormat PDF Helper.
    echo.
    pause
    exit /b
)

echo OK.
echo.

echo [4/4] Kiem tra thu vien...

if not exist "node_modules" (
    echo Dang cai thu vien lan dau. Vui long doi trong giay lat...
    call npm install --omit=dev

    if errorlevel 1 (
        echo.
        echo [LOI] Khong the cai dat thu vien.
        echo Vui long kiem tra Internet, sau do chay lai.
        echo.
        pause
        exit /b
    )
)

echo.
echo ============================================================
echo             docFormat PDF Helper dang chay
echo             Dia chi: http://localhost:8787
echo ============================================================
echo.
echo Luu y:
echo - KHONG dong cua so nay khi dang dung nut Tai PDF.
echo - Neu muon tat PDF Helper, hay dong cua so nay.
echo.

node server.js

echo.
echo PDF Helper da dung hoac gap loi.
echo Neu ban van can tai PDF, hay chay lai bieu tuong docFormat PDF Helper.
echo.
pause