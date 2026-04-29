@echo off
title Kiem tra LibreOffice

echo ================================================
echo        Kiem tra LibreOffice cho docFormat Pro
echo ================================================
echo.

set LO_PATH_1=C:\Program Files\LibreOffice\program\soffice.exe
set LO_PATH_2=C:\Program Files (x86)\LibreOffice\program\soffice.exe

if exist "%LO_PATH_1%" (
    echo [OK] Da tim thay LibreOffice:
    echo %LO_PATH_1%
    echo.
    "%LO_PATH_1%" --version
    echo.
    pause
    exit /b
)

if exist "%LO_PATH_2%" (
    echo [OK] Da tim thay LibreOffice:
    echo %LO_PATH_2%
    echo.
    "%LO_PATH_2%" --version
    echo.
    pause
    exit /b
)

echo [CHUA CO] Khong tim thay LibreOffice trong duong dan mac dinh.
echo.
echo Vui long cai LibreOffice truoc khi dung chuc nang Tai PDF.
echo Sau khi cai xong, chay lai file nay de kiem tra.
echo.

pause