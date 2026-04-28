// File: server.cjs
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const app = express();
const PORT = 8787;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
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

app.get('/', (_req, res) => {
  const sofficePath = findLibreOfficeExecutable();

  res.type('html').send(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>DocFormat PDF Converter</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            line-height: 1.6;
          }
          .ok { color: #059669; font-weight: 700; }
          .bad { color: #dc2626; font-weight: 700; }
          code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <h2>DocFormat PDF Converter</h2>
        <p>Server PDF đang chạy tại <code>http://localhost:${PORT}</code>.</p>
        <p>Trạng thái LibreOffice:
          ${
            sofficePath
              ? `<span class="ok">ĐÃ TÌM THẤY</span>`
              : `<span class="bad">CHƯA TÌM THẤY</span>`
          }
        </p>
        <p>Đường dẫn phát hiện:</p>
        <pre>${sofficePath || 'Không có'}</pre>
        ${
          sofficePath
            ? `<p>Bây giờ bạn có thể quay lại app và bấm <b>Tải PDF</b>.</p>`
            : `<p>Hãy cài LibreOffice hoặc khai báo biến môi trường <code>LIBREOFFICE_PATH</code> trỏ tới <code>soffice.exe</code>.</p>`
        }
      </body>
    </html>
  `);
});

app.get('/api/health', (_req, res) => {
  const sofficePath = findLibreOfficeExecutable();

  res.json({
    ok: true,
    libreOfficeFound: Boolean(sofficePath),
    libreOfficePath: sofficePath || null,
    port: PORT,
  });
});

app.post('/api/convert-docx-to-pdf', upload.single('file'), async (req, res) => {
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
          '',
          'Ví dụ PowerShell:',
          '$env:LIBREOFFICE_PATH="C:\\Program Files\\LibreOffice\\program\\soffice.exe"',
          'npm run dev',
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
});

app.listen(PORT, () => {
  const sofficePath = findLibreOfficeExecutable();

  console.log(`DocFormat PDF Converter is running at http://localhost:${PORT}`);

  if (sofficePath) {
    console.log(`LibreOffice found: ${sofficePath}`);
  } else {
    console.log('LibreOffice NOT FOUND. Please install LibreOffice or set LIBREOFFICE_PATH.');
  }
});