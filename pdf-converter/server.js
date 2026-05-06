// File: pdf-converter/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const app = express();
const PORT = 8787;

const TEMP_ROOT = path.join(os.tmpdir(), 'docformat-pdf-helper');
const UPLOAD_DIR = path.join(TEMP_ROOT, 'uploads');
const OUTPUT_DIR = path.join(TEMP_ROOT, 'outputs');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

function findLibreOffice() {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    'soffice',
    'libreoffice'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate.endsWith('.exe')) {
        if (fs.existsSync(candidate)) return candidate;
      } else {
        return candidate;
      }
    } catch (_) {}
  }

  return null;
}

function cleanupFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

function cleanupDirectoryFiles(dir, olderThanMs = 60 * 60 * 1000) {
  try {
    const now = Date.now();
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > olderThanMs) {
        cleanupFile(filePath);
      }
    }
  } catch (_) {}
}

function convertDocxToPdf(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const sofficePath = findLibreOffice();

    if (!sofficePath) {
      reject(new Error('Không tìm thấy LibreOffice. Vui lòng cài LibreOffice trước.'));
      return;
    }

    const args = [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath
    ];

    execFile(sofficePath, args, { windowsHide: true, timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`LibreOffice convert failed: ${stderr || stdout || error.message}`));
        return;
      }

      const inputBaseName = path.basename(inputPath, path.extname(inputPath));
      const expectedPdf = path.join(outputDir, `${inputBaseName}.pdf`);

      if (fs.existsSync(expectedPdf)) {
        resolve(expectedPdf);
        return;
      }

      const pdfFiles = fs
        .readdirSync(outputDir)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => path.join(outputDir, file))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

      if (pdfFiles.length > 0) {
        resolve(pdfFiles[0]);
        return;
      }

      reject(new Error('LibreOffice đã chạy nhưng không tạo được file PDF.'));
    });
  });
}

app.get('/', (req, res) => {
  const sofficePath = findLibreOffice();

  res.json({
    ok: true,
    name: 'docFormat PDF Helper',
    port: PORT,
    libreOfficeDetected: !!sofficePath,
    libreOfficePath: sofficePath || null,
    endpoints: [
      'POST /convert',
      'POST /convert-to-pdf'
    ]
  });
});

app.get('/health', (req, res) => {
  const sofficePath = findLibreOffice();

  res.json({
    ok: true,
    libreOfficeDetected: !!sofficePath,
    libreOfficePath: sofficePath || null
  });
});

async function handleConvert(req, res) {
  cleanupDirectoryFiles(UPLOAD_DIR);
  cleanupDirectoryFiles(OUTPUT_DIR);

  const uploadedFile = req.file || (req.files && req.files[0]);

  if (!uploadedFile) {
    res.status(400).json({
      ok: false,
      error: 'Không nhận được file DOCX.'
    });
    return;
  }

  const originalName = uploadedFile.originalname || 'document.docx';
  const ext = path.extname(originalName) || '.docx';

  const safeBaseName = path
    .basename(originalName, ext)
    .replace(/[^\w\-À-ỹ\s]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'document';

  const normalizedInputPath = path.join(
    UPLOAD_DIR,
    `${Date.now()}_${safeBaseName}${ext}`
  );

  fs.renameSync(uploadedFile.path, normalizedInputPath);

  try {
    const pdfPath = await convertDocxToPdf(normalizedInputPath, OUTPUT_DIR);
    const pdfName = `${safeBaseName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfName)}"`);

    const stream = fs.createReadStream(pdfPath);

    stream.on('close', () => {
      cleanupFile(normalizedInputPath);
      cleanupFile(pdfPath);
    });

    stream.pipe(res);
  } catch (error) {
    cleanupFile(normalizedInputPath);

    res.status(500).json({
      ok: false,
      error: error.message || String(error)
    });
  }
}

app.post('/convert', upload.any(), handleConvert);
app.post('/convert-to-pdf', upload.any(), handleConvert);
app.post('/api/convert', upload.any(), handleConvert);

app.listen(PORT, '127.0.0.1', () => {
  console.log('================================================');
  console.log(' docFormat PDF Helper dang chay');
  console.log(` Dia chi: http://localhost:${PORT}`);
  console.log('================================================');
  console.log('');
  console.log('Hay giu cua so nay dang mo khi dung chuc nang Tai PDF.');
  console.log('');
});