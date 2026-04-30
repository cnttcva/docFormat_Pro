; ============================================================
; docFormat PDF Helper - Installer Script
; Phiên bản: 1.0.0
; Tác giả: Lại Cao Đằng
; ============================================================

; --- Thông tin cơ bản ---
!define APP_NAME "docFormat PDF Helper"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Lại Cao Đằng"
!define APP_URL "https://doc-format-pro-six.vercel.app"
!define APP_EXE_NAME "docFormatPDF_Setup.exe"
!define INSTALL_DIR "$PROGRAMFILES64\docFormatPDF"
!define SERVICE_NAME "docFormatPDFHelper"

; --- Cấu hình installer ---
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

; --- Giao diện installer ---
!define MUI_ABORTWARNING
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_HEADERIMAGE
!define MUI_WELCOMEFINISHPAGE_BITMAP "welcome.bmp"

; --- Pages của installer ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN_TEXT "Khởi động PDF Helper ngay"
!define MUI_FINISHPAGE_RUN "$INSTDIR\start-service.bat"
!define MUI_FINISHPAGE_LINK "Mở docFormat Pro trên trình duyệt"
!define MUI_FINISHPAGE_LINK_LOCATION "${APP_URL}"
!insertmacro MUI_PAGE_FINISH

; --- Pages của uninstaller ---
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; --- Ngôn ngữ ---
!insertmacro MUI_LANGUAGE "Vietnamese"
!insertmacro MUI_LANGUAGE "English"

; ============================================================
; SECTION CHÍNH: CÀI ĐẶT
; ============================================================
Section "Cài đặt docFormat PDF Helper" SecMain
  SectionIn RO ; Bắt buộc cài (không cho bỏ chọn)
  
  SetOutPath "$INSTDIR"
  
  ; --- Hiển thị thông báo bắt đầu ---
  DetailPrint "==================================================="
  DetailPrint "  docFormat PDF Helper - Đang cài đặt..."
  DetailPrint "==================================================="
  
  ; --- Copy các file cần thiết ---
  DetailPrint "Đang sao chép file cài đặt..."
  File "..\server.cjs"
  File "..\package.json"
  File "service-wrapper.bat"
  File "install-helper.ps1"
  
  ; --- Copy NSSM (Windows Service Manager) ---
  ; NSSM sẽ được copy từ thư mục bin\
  DetailPrint "Đang cài đặt Service Manager..."
  SetOutPath "$INSTDIR\bin"
  File "bin\nssm.exe"
  SetOutPath "$INSTDIR"
  
  ; --- Tạo các batch file tiện ích ---
  DetailPrint "Đang tạo các shortcut..."
  
  ; start-service.bat
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
  
  ; stop-service.bat
  FileOpen $0 "$INSTDIR\stop-service.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo Dung docFormat PDF Helper Service...$\r$\n'
  FileWrite $0 'net stop ${SERVICE_NAME}$\r$\n'
  FileWrite $0 'pause$\r$\n'
  FileClose $0
  
  ; --- Chạy PowerShell script để cài Node.js + LibreOffice + npm install ---
  DetailPrint "==================================================="
  DetailPrint "  Đang kiểm tra môi trường..."
  DetailPrint "  (Có thể tải Node.js + LibreOffice nếu chưa có)"
  DetailPrint "==================================================="
  
  ; Chạy PowerShell với ExecutionPolicy Bypass
  nsExec::ExecToLog 'powershell.exe -ExecutionPolicy Bypass -NoProfile -File "$INSTDIR\install-helper.ps1" -InstallDir "$INSTDIR"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "CẢNH BÁO: PowerShell script trả về mã $0"
    DetailPrint "Một số bước có thể chưa hoàn thành. Helper vẫn được cài đặt."
  ${EndIf}
  
  ; --- Đăng ký Windows Service ---
  DetailPrint "==================================================="
  DetailPrint "  Đang đăng ký Windows Service..."
  DetailPrint "==================================================="
  
  ; Gỡ service cũ (nếu có) trước khi cài mới
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" stop ${SERVICE_NAME}'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" remove ${SERVICE_NAME} confirm'
  
  ; Cài service mới - dùng service-wrapper.bat thay vì gọi trực tiếp node
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" install ${SERVICE_NAME} "$INSTDIR\service-wrapper.bat"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} DisplayName "docFormat PDF Helper"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} Description "Helper service de xuat PDF cho docFormat Pro"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} Start SERVICE_AUTO_START'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} AppDirectory "$INSTDIR"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} AppStdout "$INSTDIR\service.log"'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" set ${SERVICE_NAME} AppStderr "$INSTDIR\service-error.log"'
  
  ; --- Khởi động service ---
  DetailPrint "Đang khởi động Service..."
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" start ${SERVICE_NAME}'
  
  ; --- Tạo shortcut Start Menu ---
  CreateDirectory "$SMPROGRAMS\docFormat PDF Helper"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\docFormat Pro (Web).lnk" "${APP_URL}"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Trạng thái Helper.lnk" "http://localhost:8787"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Khởi động Helper.lnk" "$INSTDIR\start-service.bat"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Dừng Helper.lnk" "$INSTDIR\stop-service.bat"
  CreateShortcut "$SMPROGRAMS\docFormat PDF Helper\Gỡ cài đặt.lnk" "$INSTDIR\uninstall.exe"
  
  ; --- Đăng ký vào Add/Remove Programs ---
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout" "${APP_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1
  
  ; --- Tạo uninstaller ---
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  DetailPrint "==================================================="
  DetailPrint "  Cài đặt hoàn tất!"
  DetailPrint "  Helper đang chạy tại: http://localhost:8787"
  DetailPrint "==================================================="
SectionEnd

; ============================================================
; SECTION GỠ CÀI ĐẶT
; ============================================================
Section "Uninstall"
  DetailPrint "Đang dừng và gỡ Service..."
  
  ; Dừng và gỡ service
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" stop ${SERVICE_NAME}'
  nsExec::ExecToLog '"$INSTDIR\bin\nssm.exe" remove ${SERVICE_NAME} confirm'
  
  ; Xóa file
  DetailPrint "Đang xóa file..."
  Delete "$INSTDIR\server.cjs"
  Delete "$INSTDIR\package.json"
  Delete "$INSTDIR\service-wrapper.bat"
  Delete "$INSTDIR\install-helper.ps1"
  Delete "$INSTDIR\start-service.bat"
  Delete "$INSTDIR\stop-service.bat"
  Delete "$INSTDIR\service.log"
  Delete "$INSTDIR\service-error.log"
  Delete "$INSTDIR\uninstall.exe"
  
  ; Xóa thư mục bin (chứa nssm.exe)
  RMDir /r "$INSTDIR\bin"
  
  ; Xóa thư mục node_modules (npm install đã tạo)
  RMDir /r "$INSTDIR\node_modules"
  
  ; Xóa Node.js portable nếu có
  RMDir /r "$INSTDIR\node-portable"
  
  ; Xóa thư mục cài đặt
  RMDir "$INSTDIR"
  
  ; Xóa Start Menu shortcuts
  Delete "$SMPROGRAMS\docFormat PDF Helper\*.*"
  RMDir "$SMPROGRAMS\docFormat PDF Helper"
  
  ; Xóa registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
  
  DetailPrint "Đã gỡ cài đặt hoàn tất."
  
  MessageBox MB_OK "docFormat PDF Helper đã được gỡ cài đặt.$\r$\n$\r$\nLưu ý: LibreOffice (nếu có) không bị gỡ vì có thể được sử dụng bởi phần mềm khác.$\r$\nNếu muốn gỡ LibreOffice, vui lòng vào Settings > Apps."
SectionEnd
