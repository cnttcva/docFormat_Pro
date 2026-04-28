const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();

const PORT = process.env.PORT || 8787;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
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

function findLibreOfficeExecutable() {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/usr/local/bin/libreoffice',
    '/usr/local/bin/soffice',
    'libreoffice',
    'soffice',
  ].filter(Boolean);

  return candidates[0];
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
  res.type('html').send(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>DocFormat PDF Converter</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 32px; line-height: 1.6;">
        <h2>DocFormat PDF Converter</h2>
        <p>PDF converter đang chạy.</p>
        <p>Health check: <a href="/api/health">/api/health</a></p>
      </body>
    </html>
  `);
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'docformat-pdf-converter',
    port: PORT,
    libreOfficeCommand: findLibreOfficeExecutable(),
  });
});

app.post('/api/convert-docx-to-pdf', upload.single('file'), async (req, res) => {
  let workDir = '';

  try {
    if (!req.file) {
      return res.status(400).send('Không nhận được file DOCX.');
    }

    const sofficePath = findLibreOfficeExecutable();

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

    const profileUri = `file://${profileDir}`;

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DocFormat PDF Converter is running on port ${PORT}`);
});