@echo off
title docFormat PDF Helper

echo ================================================
echo        docFormat PDF Helper - Local Server
echo ================================================
echo.

cd /d "%~dp0"

echo Thu muc hien tai:
cd
echo.

echo Kiem tra Node.js...
node -v
if errorlevel 1 (
    echo.
    echo [LOI] May tinh chua cai Node.js.
    echo Vui long cai Node.js LTS truoc, sau do chay lai file nay.
    echo.
    pause
    exit /b
)

echo.
echo Kiem tra package.json...
if not exist package.json (
    echo [LOI] Khong tim thay package.json trong thu muc pdf-converter.
    echo.
    pause
    exit /b
)

echo.
echo Kiem tra server.js...
if not exist server.js (
    echo [LOI] Khong tim thay server.js trong thu muc pdf-converter.
    echo.
    pause
    exit /b
)

echo.
echo Xoa node_modules cu neu bi loi...
if exist node_modules (
    echo Bo qua neu node_modules dang dung tot.
)

echo.
echo Dang cai dat thu vien can thiet...
call npm install

if errorlevel 1 (
    echo.
    echo [LOI] npm install that bai.
    echo Vui long kiem tra Internet hoac quyen ghi thu muc.
    echo.
    pause
    exit /b
)

echo.
echo Dang khoi dong PDF Helper tai http://localhost:8787
echo.
echo Hay giu cua so nay dang mo trong khi su dung chuc nang Tai PDF.
echo Neu muon tat PDF Helper, hay dong cua so nay.
echo.

node server.js

echo.
echo PDF Helper da dung hoac gap loi.
pause
