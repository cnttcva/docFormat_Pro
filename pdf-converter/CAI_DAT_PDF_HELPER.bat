@echo off
chcp 65001 >nul
title Cai dat docFormat PDF Helper

echo ============================================================
echo              CAI DAT docFormat PDF Helper
echo ============================================================
echo.
echo Cong cu nay giup docFormat Pro xuat file PDF tren may tinh.
echo Ban KHONG can mo VS Code, KHONG can go lenh ky thuat.
echo.

cd /d "%~dp0"

set "INSTALL_DIR=%LOCALAPPDATA%\docFormatPDFHelper"
set "LIBREOFFICE_1=C:\Program Files\LibreOffice\program\soffice.exe"
set "LIBREOFFICE_2=C:\Program Files (x86)\LibreOffice\program\soffice.exe"

echo [1/5] Kiem tra cac file can thiet...

if not exist "server.js" (
    echo.
    echo [LOI] Khong tim thay file server.js trong thu muc hien tai.
    echo Vui long dat file CAI_DAT_PDF_HELPER.bat trong dung thu muc pdf-converter.
    echo.
    pause
    exit /b
)

if not exist "package.json" (
    echo.
    echo [LOI] Khong tim thay file package.json trong thu muc hien tai.
    echo Vui long dat file CAI_DAT_PDF_HELPER.bat trong dung thu muc pdf-converter.
    echo.
    pause
    exit /b
)

echo OK.
echo.

echo [2/5] Kiem tra Node.js...

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [CAN CAI THEM] May tinh chua co Node.js.
    echo.
    echo Vui long cai Node.js ban LTS theo huong dan:
    echo 1. Trinh duyet se mo trang tai Node.js.
    echo 2. Tai ban Windows Installer.
    echo 3. Cai dat voi cac lua chon mac dinh.
    echo 4. Cai xong, chay lai file CAI_DAT_PDF_HELPER.bat.
    echo.
    start "" "https://nodejs.org/en/download"
    pause
    exit /b
)

node -v
echo Node.js da san sang.
echo.

echo [3/5] Kiem tra LibreOffice...

if exist "%LIBREOFFICE_1%" (
    echo Da tim thay LibreOffice:
    echo %LIBREOFFICE_1%
) else if exist "%LIBREOFFICE_2%" (
    echo Da tim thay LibreOffice:
    echo %LIBREOFFICE_2%
) else (
    echo.
    echo [CAN CAI THEM] May tinh chua co LibreOffice.
    echo.
    echo Vui long cai LibreOffice theo huong dan:
    echo 1. Trinh duyet se mo trang tai LibreOffice.
    echo 2. Tai ban danh cho Windows.
    echo 3. Cai dat voi cac lua chon mac dinh.
    echo 4. Cai xong, chay lai file CAI_DAT_PDF_HELPER.bat.
    echo.
    start "" "https://www.libreoffice.org/download/"
    pause
    exit /b
)

echo LibreOffice da san sang.
echo.

echo [4/5] Sao chep PDF Helper vao may tinh...

if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

copy /Y "server.js" "%INSTALL_DIR%\server.js" >nul
copy /Y "package.json" "%INSTALL_DIR%\package.json" >nul

if exist "package-lock.json" (
    copy /Y "package-lock.json" "%INSTALL_DIR%\package-lock.json" >nul
)

copy /Y "START_PDF_HELPER.bat" "%INSTALL_DIR%\START_PDF_HELPER.bat" >nul
copy /Y "KIEM_TRA_PDF_HELPER.bat" "%INSTALL_DIR%\KIEM_TRA_PDF_HELPER.bat" >nul

if exist "HUONG_DAN_NGUOI_DUNG.txt" (
    copy /Y "HUONG_DAN_NGUOI_DUNG.txt" "%INSTALL_DIR%\HUONG_DAN_NGUOI_DUNG.txt" >nul
)

echo Da cai vao:
echo %INSTALL_DIR%
echo.

echo [5/5] Cai dat thu vien can thiet...

pushd "%INSTALL_DIR%"

call npm install --omit=dev

if errorlevel 1 (
    echo.
    echo [LOI] Khong the cai dat thu vien cho PDF Helper.
    echo Vui long kiem tra Internet, sau do chay lai file nay.
    echo.
    popd
    pause
    exit /b
)

popd

echo.
echo Dang tao bieu tuong ngoai Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$install = Join-Path $env:LOCALAPPDATA 'docFormatPDFHelper';" ^
"$desktop = [Environment]::GetFolderPath('Desktop');" ^
"$startup = [Environment]::GetFolderPath('Startup');" ^
"$wsh = New-Object -ComObject WScript.Shell;" ^
"$s = $wsh.CreateShortcut((Join-Path $desktop 'docFormat PDF Helper.lnk'));" ^
"$s.TargetPath = Join-Path $install 'START_PDF_HELPER.bat';" ^
"$s.WorkingDirectory = $install;" ^
"$s.IconLocation = 'C:\Windows\System32\shell32.dll,220';" ^
"$s.Description = 'Khoi dong docFormat PDF Helper de tai PDF';" ^
"$s.Save();" ^
"$k = $wsh.CreateShortcut((Join-Path $desktop 'Kiem tra PDF Helper.lnk'));" ^
"$k.TargetPath = Join-Path $install 'KIEM_TRA_PDF_HELPER.bat';" ^
"$k.WorkingDirectory = $install;" ^
"$k.IconLocation = 'C:\Windows\System32\shell32.dll,23';" ^
"$k.Description = 'Kiem tra trang thai docFormat PDF Helper';" ^
"$k.Save();"

echo.
echo ============================================================
echo                 CAI DAT THANH CONG
echo ============================================================
echo.
echo Ngoai Desktop da co 2 bieu tuong:
echo - docFormat PDF Helper
echo - Kiem tra PDF Helper
echo.
echo Bay gio PDF Helper se duoc khoi dong.
echo Khi su dung nut Tai PDF, hay giu cua so PDF Helper dang mo.
echo.

start "" "%INSTALL_DIR%\START_PDF_HELPER.bat"

pause