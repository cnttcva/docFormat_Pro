# docFormat PDF Helper - Installer Build Guide

Hướng dẫn build file `docFormatPDF_Setup.exe` từ source code.

## 📋 Yêu cầu hệ thống

- **Windows 10 hoặc 11** (64-bit)
- **NSIS** (Nullsoft Scriptable Install System) - phiên bản 3.x
- **Internet** (để download các tool phụ trợ)
- Khoảng **500MB dung lượng trống** (cho temp files)

## 🛠️ Bước 1: Cài đặt NSIS

1. Tải NSIS từ: https://nsis.sourceforge.io/Download
2. Chạy file installer, chọn **Full installation** (mặc định)
3. Mặc định cài tại: `C:\Program Files (x86)\NSIS\`

Kiểm tra cài đặt:
```cmd
"C:\Program Files (x86)\NSIS\makensis.exe" /VERSION
```

## 🛠️ Bước 2: Tải NSSM

NSSM (Non-Sucking Service Manager) - tool nhỏ ~330KB để biến server.cjs thành Windows Service.

1. Tải từ: https://nssm.cc/download
2. Chọn bản **NSSM 2.24** (stable)
3. Giải nén, tìm file `nssm.exe` trong thư mục `win64\`
4. Tạo thư mục `installer\bin\` trong dự án
5. Copy `nssm.exe` vào `installer\bin\nssm.exe`

## 🛠️ Bước 3: Chuẩn bị icon và welcome image (tùy chọn)

Để installer đẹp hơn, tạo:
- `installer\icon.ico` - Icon installer (256x256 .ico)
- `installer\welcome.bmp` - Ảnh welcome (164x314 .bmp)

Nếu không có, NSIS sẽ dùng icon mặc định. **Hoàn toàn OK cho bản đầu tiên.**

## 🚀 Bước 4: Build installer

Mở Command Prompt (cmd), điều hướng vào thư mục `installer\`:

```cmd
cd C:\path\to\docformat-pro\installer
"C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
```

Nếu thành công, file `docFormatPDF_Setup.exe` sẽ được tạo trong thư mục `installer\build\`.

## ✅ Bước 5: Test installer

1. Chạy `build\docFormatPDF_Setup.exe`
2. Cài vào `C:\Program Files\docFormatPDF\`
3. Sau khi cài xong, mở trình duyệt vào: `http://localhost:8787`
4. Phải thấy trang "docFormat PDF Helper - ĐANG HOẠT ĐỘNG"

## 🐛 Troubleshooting

### Service không khởi động được
```cmd
"C:\Program Files\docFormatPDF\bin\nssm.exe" status docFormatPDFHelper
```

Xem log lỗi:
```cmd
type "C:\Program Files\docFormatPDF\service-error.log"
```

### Reset hoàn toàn (gỡ + cài lại)
```cmd
"C:\Program Files\docFormatPDF\bin\nssm.exe" stop docFormatPDFHelper
"C:\Program Files\docFormatPDF\bin\nssm.exe" remove docFormatPDFHelper confirm
```

Sau đó vào **Settings > Apps** > tìm "docFormat PDF Helper" > Uninstall.

## 📦 Cấu trúc file sau khi build

```
installer/
├── installer.nsi          # NSIS script chính
├── install-helper.ps1     # PowerShell tải Node.js + LibreOffice
├── service-wrapper.bat    # Wrapper cho Windows Service
├── README.md              # File này
├── bin/
│   └── nssm.exe          # Service Manager (cần tải)
├── icon.ico              # (tùy chọn)
├── welcome.bmp           # (tùy chọn)
└── build/
    └── docFormatPDF_Setup.exe  # Output file
```

## 📤 Phân phối

Sau khi build xong, upload `docFormatPDF_Setup.exe` lên:
- **GitHub Releases** (khuyến nghị, miễn phí)
- Hoặc Vercel public folder
- Hoặc Google Drive với link share công khai

Cập nhật URL trong file `src/pages/DownloadHelperPage.tsx`:
```typescript
const INSTALLER_DOWNLOAD_URL = 'https://github.com/.../releases/latest';
```

---

**Tác giả:** Lại Cao Đằng - Đắk Lắk  
**Phiên bản:** 1.0.0  
**Ngày:** 30/04/2026
