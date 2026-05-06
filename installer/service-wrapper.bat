@echo off
REM ============================================================
REM docFormat PDF Helper - Service Wrapper
REM Wrapper de Windows Service co the chay node + server.cjs
REM ============================================================

cd /d "%~dp0"

REM Tim node.exe theo thu tu uu tien:
REM 1. Node Portable (kem theo installer)
REM 2. Node trong PATH he thong

set "NODE_EXE="

if exist "%~dp0node-portable\node.exe" (
    set "NODE_EXE=%~dp0node-portable\node.exe"
    goto :run
)

where node.exe >nul 2>nul
if not errorlevel 1 (
    set "NODE_EXE=node.exe"
    goto :run
)

echo [LOI] Khong tim thay Node.js!
echo Vui long cai dat lai docFormat PDF Helper.
exit /b 1

:run
REM Chay server.cjs
"%NODE_EXE%" "%~dp0server.cjs"
