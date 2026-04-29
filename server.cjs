// File: server.cjs
// docFormat PDF Helper - PHIÊN BẢN 1.2.0
// Cập nhật: 30/04/2026
// 
// THAY ĐỔI v1.2.0:
// - Thêm ALIAS endpoints để tương thích với MainApp.tsx hiện tại:
//   * GET /health (alias của /api/health)
//   * POST /convert-to-pdf (alias của /api/convert-docx-to-pdf)
// - Trả về cả libreOfficeDetected (cũ) và libreOfficeFound (mới) trong response
// - Giữ nguyên CORS cho Vercel + localhost
// - Giữ nguyên log đẹp ở console

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const app = express();
const PORT = process.env.HELPER_PORT || 8787;
const HELPER_VERSION = '1.2.0';

// ============================================================
// CORS - Cho phép app trên Vercel + localhost gọi tới Helper
// ============================================================
const DEFAULT_ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Production - Vercel
  'https://doc-format-pro-six.vercel.app',
];

const customOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...customOrigins];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} không được phép`));
  },
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

function getJobId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

function safeFileName(name) {
  const base = path.basename(name || 'document.docx');
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function fileExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
}

function runWhere(commandName) {
  try {
    const result = spawnSync('where', [commandName], {
      encoding: 'utf8',
      windowsHide: true,
    });

    if (result.status !== 0) return null;

    const firstLine = String(result.stdout || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean);

    return firstLine || null;
  } catch {
    return null;
  }
}

function runCommandV(commandName) {
  try {
    const result = spawnSync('command', ['-v', commandName], {
      encoding: 'utf8',
      shell: true,
    });

    if (result.status !== 0) return null;

    const output = String(result.stdout || '').trim();
    return output || null;
  } catch {
    return null;
  }
}

function findLibreOfficeExecutable() {
  const envPath = process.env.LIBREOFFICE_PATH;

  if (envPath && fileExists(envPath)) {
    return envPath;
  }

  const windowsCandidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files\\LibreOffice 7\\program\\soffice.exe',
    'C:\\Program Files\\LibreOffice 24\\program\\soffice.exe',
    'C:\\Program Files\\LibreOffice 25\\program\\soffice.exe',
  ];

  for (const candidate of windowsCandidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  if (process.platform === 'win32') {
    const whereSoffice = runWhere('soffice.exe') || runWhere('soffice');
    if (whereSoffice && fileExists(whereSoffice)) return whereSoffice;

    const whereLibreOffice = runWhere('libreoffice.exe') || runWhere('libreoffice');
    if (whereLibreOffice && fileExists(whereLibreOffice)) return whereLibreOffice;
  } else {
    const commandLibreOffice = runCommandV('libreoffice');
    if (commandLibreOffice) return commandLibreOffice;

    const commandSoffice = runCommandV('soffice');
    if (commandSoffice) return commandSoffice;

    const unixCandidates = [
      '/usr/bin/libreoffice',
      '/usr/bin/soffice',
      '/usr/local/bin/libreoffice',
      '/usr/local/bin/soffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    ];

    for (const candidate of unixCandidates) {
      if (fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function runLibreOffice(command, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('LibreOffice chuyển đổi quá lâu và đã bị dừng.'));
    }, timeoutMs);

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', code => {
      clearTimeout(timer);

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(
          `LibreOffice lỗi mã ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
        ));
      }
    });
  });
}

// ============================================================
// HOME PAGE - Trang chào mừng (giúp user biết Helper đang chạy)
// ============================================================
app.get('/', (_req, res) => {
  const sofficePath = findLibreOfficeExecutable();

  res.type('html').send(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>docFormat PDF Helper</title>
        <style>
          body {
            font-family: -apple-system, "Segoe UI", Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 32px;
            line-height: 1.6;
            background: #f8fafc;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          h2 { color: #1e293b; margin-top: 0; }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 13px;
          }
          .badge.ok { background: #dcfce7; color: #15803d; }
          .badge.bad { background: #fee2e2; color: #b91c1c; }
          .info {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
          }
          code {
            background: #e2e8f0;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 13px;
          }
          .footer {
            text-align: center;
            margin-top: 24px;
            color: #64748b;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🚀 docFormat PDF Helper</h2>
          <p>
            <span class="badge ok">ĐANG HOẠT ĐỘNG</span>
            <span style="color:#64748b;font-size:13px;margin-left:8px">Phiên bản ${HELPER_VERSION}</span>
          </p>
          
          <div class="info">
            <strong>Trạng thái LibreOffice:</strong>
            ${
              sofficePath
                ? `<span class="badge ok">ĐÃ TÌM THẤY</span><br><code style="margin-top:8px;display:inline-block">${sofficePath}</code>`
                : `<span class="badge bad">CHƯA TÌM THẤY</span>`
            }
          </div>
          
          <div class="info">
            <strong>Cổng kết nối:</strong> <code>http://localhost:${PORT}</code>
          </div>
          
          ${
            sofficePath
              ? `<p>✅ Bạn có thể quay lại app docFormat Pro và bấm <strong>"Tải PDF"</strong>.</p>`
              : `<p>❌ Hãy cài LibreOffice từ <a href="https://www.libreoffice.org/download/">libreoffice.org</a> rồi khởi động lại Helper.</p>`
          }
        </div>
        <div class="footer">
          docFormat Pro © 2026 - Hỗ trợ chuyển đổi văn bản hành chính
        </div>
      </body>
    </html>
  `);
});

// ============================================================
// HÀM XỬ LÝ HEALTH CHECK (dùng chung cho cả 2 endpoint)
// ============================================================
function handleHealthCheck(_req, res) {
  const sofficePath = findLibreOfficeExecutable();
  const detected = Boolean(sofficePath);

  res.json({
    ok: true,
    // Field cũ (MainApp.tsx đang dùng)
    libreOfficeDetected: detected,
    // Field mới (chuẩn REST)
    libreOfficeFound: detected,
    libreOfficePath: sofficePath || null,
    port: PORT,
    version: HELPER_VERSION,
  });
}

// API health - cả 2 đường dẫn cũ và mới
app.get('/api/health', handleHealthCheck);
app.get('/health', handleHealthCheck);  // ALIAS cho MainApp.tsx hiện tại

// ============================================================
// API: Version info
// ============================================================
app.get('/api/version', (_req, res) => {
  res.json({
    version: HELPER_VERSION,
    name: 'docFormat PDF Helper',
    platform: process.platform,
  });
});

// ============================================================
// HÀM XỬ LÝ CONVERT (dùng chung cho cả 2 endpoint)
// ============================================================
async function handleConvert(req, res) {
  let workDir = '';

  try {
    if (!req.file) {
      return res.status(400).send('Không nhận được file DOCX.');
    }

    const sofficePath = findLibreOfficeExecutable();

    if (!sofficePath) {
      return res.status(500).send(
        [
          'Không tìm thấy LibreOffice/soffice trên máy.',
          '',
          'Cách xử lý:',
          '1. Cài LibreOffice bản Windows.',
          '2. Sau khi cài, kiểm tra file này có tồn tại không:',
          '   C:\\Program Files\\LibreOffice\\program\\soffice.exe',
          '3. Nếu LibreOffice nằm ở thư mục khác, khai báo biến môi trường LIBREOFFICE_PATH trỏ tới soffice.exe.',
        ].join('\n')
      );
    }

    const originalName = safeFileName(req.file.originalname || 'document.docx');
    const parsed = path.parse(originalName);

    const docxName = parsed.ext.toLowerCase() === '.docx'
      ? originalName
      : `${parsed.name || 'document'}.docx`;

    const jobId = getJobId();
    workDir = path.join(os.tmpdir(), `docformat-pdf-${jobId}`);
    const profileDir = path.join(workDir, 'lo-profile');

    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(profileDir, { recursive: true });

    const inputPath = path.join(workDir, docxName);
    fs.writeFileSync(inputPath, req.file.buffer);

    const profileUri = `file:///${profileDir.replace(/\\/g, '/')}`;

    const args = [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      '--nodefault',
      '--nolockcheck',
      `-env:UserInstallation=${profileUri}`,
      '--convert-to',
      'pdf:writer_pdf_Export',
      '--outdir',
      workDir,
      inputPath,
    ];

    await runLibreOffice(sofficePath, args);

    const expectedPdfPath = path.join(workDir, `${path.parse(docxName).name}.pdf`);
    let outputPdfPath = expectedPdfPath;

    if (!fs.existsSync(outputPdfPath)) {
      const pdfFiles = fs
        .readdirSync(workDir)
        .filter(file => file.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        throw new Error('LibreOffice chạy xong nhưng không tạo ra file PDF.');
      }

      outputPdfPath = path.join(workDir, pdfFiles[0]);
    }

    const pdfBuffer = fs.readFileSync(outputPdfPath);
    const pdfName = `${path.parse(docxName).name}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfName)}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF conversion error:', error);
    res.status(500).send(error instanceof Error ? error.message : String(error));
  } finally {
    if (workDir && fs.existsSync(workDir)) {
      setTimeout(() => {
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup error
        }
      }, 5000);
    }
  }
}

// API convert - cả 2 đường dẫn cũ và mới
app.post('/api/convert-docx-to-pdf', upload.single('file'), handleConvert);
app.post('/convert-to-pdf', upload.single('file'), handleConvert);  // ALIAS cho MainApp.tsx hiện tại

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  const sofficePath = findLibreOfficeExecutable();

  console.log('');
  console.log('============================================================');
  console.log(`   docFormat PDF Helper v${HELPER_VERSION}`);
  console.log('============================================================');
  console.log('');
  console.log(`   Đang chạy tại: http://localhost:${PORT}`);
  console.log('');
  
  if (sofficePath) {
    console.log(`   ✓ LibreOffice: ${sofficePath}`);
  } else {
    console.log('   ✗ LibreOffice: CHƯA TÌM THẤY');
    console.log('     → Vui lòng cài đặt từ libreoffice.org');
  }
  
  console.log('');
  console.log('   Endpoints:');
  console.log('   - GET  /health  hoặc  /api/health');
  console.log('   - POST /convert-to-pdf  hoặc  /api/convert-docx-to-pdf');
  console.log('');
  console.log('   Các domain được phép:');
  allowedOrigins.forEach(origin => {
    console.log(`   - ${origin}`);
  });
  console.log('   - *.vercel.app (auto)');
  console.log('');
  console.log('============================================================');
  console.log('');
});
