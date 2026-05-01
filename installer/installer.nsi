; ============================================================
; docFormat PDF Helper - Installer Script
; Phien ban: 1.0.0
; Tac gia: Lai Cao Dang
; 
; CAP NHAT 30/04/2026: Tam bo yeu cau icon.ico va welcome.bmp
; ============================================================

; --- Thong tin co ban ---
!define APP_NAME "docFormat PDF Helper"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Lai Cao Dang"
!define APP_URL "https://doc-format-pro-six.vercel.app"
!define APP_EXE_NAME "docFormatPDF_Setup.exe"
!define INSTALL_DIR "$PROGRAMFILES64\docFormatPDF"
!define SERVICE_NAME "docFormatPDFHelper"

; --- Cau hinh installer ---
Name "${APP_NAME}"
OutFile "build\${APP_EXE_NAME}"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel admin
ShowInstDetails show
ShowUninstDetails show
SetCompressor /SOLID lzma

; --- Modern UI 2 ---
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

; --- Giao dien installer (dung icon mac dinh cua NSIS) ---
!define MUI_ABORTWARNING

; --- Pages cua installer ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN_TEXT "Khoi dong PDF Helper ngay"
!define MUI_FINISHPAGE_RUN "$INSTDIR\start-service.bat"
!define MUI_FINISHPAGE_LINK "Mo docFormat Pro tren trinh duyet"
!define MUI_FINISHPAGE_LINK_LOCATION "${APP_URL}"
!insertmacro MUI_PAGE_FINISH

; --- Pages cua uninstaller ---
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; --- Ngon ngu ---
!insertmacro MUI_LANGUAGE "English"

; ============================================================
; SECTION CHINH: CAI DAT
; ============================================================
Section "Cai dat docFormat PDF Helper" SecMain
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  
  DetailPrint "==================================================="
  DetailPrint "  docFormat PDF Helper - Dang cai dat..."
  DetailPrint "==================================================="
  
  DetailPrint "Dang sao chep file cai dat..."
  File "..\server.cjs"
  File "..\package.json"
  File "service-wrapper.bat"
  File "install-helper.ps1"
  
  DetailPrint "Dang cai dat Service Manager..."
  SetOutPath "$INSTDIR\bin"
  File "bin\nssm.exe"
  SetOutPath "$INSTDIR"
  
  DetailPrint "Dang tao cac shortcut..."
  
  FileOpen $0 "$INSTDIR\start-service.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo Khoi dong docFormat PDF Helper Service...$\r$\n'
  FileWrite $0 'net start ${SERVICE_NAME}$\r$\n'
  FileWrite $0 'if errorlevel 1 ($\r$\n'
  FileWrite $0 '    echo Service da chay san hoac chua duoc cai dat.$\r$\n'
  FileWrite $0 ') else ($\r$\n'
  FileWrite $0 '    echo Service da khoi dong thanh cong.$\r$\n'
  FileWrite $0 '    start "" "http://localhost:8787"$\r$\n'
  FileWrite $0 ')$\r$\n'
  FileWrite $0 'timeout /t 3 >nul$\r$\n'
  FileClose $0
  
  FileOpen $0 "$INSTDIR\stop-service.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo Dung docFormat PDF Helper Service...$\r$\n'
  FileWrite $0 'net stop ${SERVICE_NAME}$\r$\n'
  FileWrite $0 'pause$\r$\n'
  FileClose $0
  
  DetailPrint "==================================================="
  DetailPrint "  Dang kiem tra moi truong..."
  DetailPrint "==================================================="
  
  nsExec::ExecToLog 'powershell.exe -ExecutionPolicy Bypass -NoProfile -File "$INSTDIR\install-helper.ps1" -InstallDir "$INSTDIR"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "CANH BAO: PowerShell script tra ve ma $0"
  ${EndIf}
  
  DetailPrint "==================================================="
  DetailPrint "  Dang dang ky Windows Service..."
  DetailPrint "==================================================="
  
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" stop ${SERVICE_NAME}'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" remove ${SERVICE_NAME} confirm'
  
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" install ${SERVICE_NAME} "$INSTDIR\service-wrapper.bat"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} DisplayName "docFormat PDF Helper"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} Description "Helper service de xuat PDF cho docFormat Pro"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} Start SERVICE_AUTO_START'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} AppDirectory "$INSTDIR"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} AppStdout "$INSTDIR\service.log"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} AppStderr "$INSTDIR\service-error.log"'
  
  DetailPrint "Dang khoi dong Service..."
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" start ${SERVICE_NAME}'
  
  CreateDirectory "$SMPROGRAMS\docFormat PDF Helper"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\docFormat Pro (Web).lnk" "${APP_URL}"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Trang thai Helper.lnk" "http://localhost:8787"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Khoi dong Helper.lnk" "$INSTDIR\start-service.bat"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Dung Helper.lnk" "$INSTDIR\stop-service.bat"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Go cai dat.lnk" "$INSTDIR\uninstall.exe"
  
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout" "${APP_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1
  
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  DetailPrint "==================================================="
  DetailPrint "  Cai dat hoan tat!"
  DetailPrint "  Helper dang chay tai: http://localhost:8787"
  DetailPrint "==================================================="
SectionEnd

; ============================================================
; SECTION GO CAI DAT
; ============================================================
Section "Uninstall"
  DetailPrint "Dang dung va go Service..."
  
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" stop ${SERVICE_NAME}'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" remove ${SERVICE_NAME} confirm'
  
  DetailPrint "Dang xoa file..."
  Delete "$INSTDIR\server.cjs"
  Delete "$INSTDIR\package.json"
  Delete "$INSTDIR\service-wrapper.bat"
  Delete "$INSTDIR\install-helper.ps1"
  Delete "$INSTDIR\start-service.bat"
  Delete "$INSTDIR\stop-service.bat"
  Delete "$INSTDIR\service.log"
  Delete "$INSTDIR\service-error.log"
  Delete "$INSTDIR\uninstall.exe"
  
  RMDir /r "$INSTDIR\bin"
  RMDir /r "$INSTDIR\node_modules"
  RMDir /r "$INSTDIR\node-portable"
  RMDir "$INSTDIR"
  
  Delete "$SMPROGRAMS\docFormat PDF Helper\*.*"
  RMDir "$SMPROGRAMS\docFormat PDF Helper"
  
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
  
  DetailPrint "Da go cai dat hoan tat."
  
  MessageBox MB_OK "docFormat PDF Helper da duoc go cai dat."
SectionEnd