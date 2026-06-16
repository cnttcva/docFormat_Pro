// File: server.cjs
// docFormat Pro - Web App + PDF Helper
// Dùng cho DirectAdmin Node.js / Passenger
// Application URL: https://docformatpro.com/VB/
// Startup file: server.cjs

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
// ============================================================
// MYSQL DATABASE - LICENSING STAGE
// ============================================================

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Firestore ISO timestamps were imported as UTC DATETIME values.
  // Read them back as UTC to avoid shifting times on the hosting server.
  timezone: 'Z',
};

let dbPool = null;

function getDbPool() {
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Thiếu biến môi trường kết nối MySQL: ${missingEnvVars.join(', ')}`
    );
  }

  if (!dbPool) {
    dbPool = mysql.createPool(DB_CONFIG);
  }

  return dbPool;
}
// ============================================================
// FIREBASE ADMIN - SERVER AUTH STAGE
// ============================================================

const {
  initializeApp: initializeFirebaseAdminApp,
  applicationDefault,
  getApps: getFirebaseAdminApps,
} = require('firebase-admin/app');

const { getAuth: getFirebaseAdminAuth } = require('firebase-admin/auth');
const { getFirestore: getFirebaseAdminFirestore } = require('firebase-admin/firestore');
function getFirebaseAdminApp() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'Thiếu biến môi trường GOOGLE_APPLICATION_CREDENTIALS để khởi tạo Firebase Admin.'
    );
  }

  if (getFirebaseAdminApps().length === 0) {
    return initializeFirebaseAdminApp({
      credential: applicationDefault(),
    });
  }

  return getFirebaseAdminApps()[0];
}

function getAdminAuth() {
  return getFirebaseAdminAuth(getFirebaseAdminApp());
}

function getAdminFirestore() {
  return getFirebaseAdminFirestore(getFirebaseAdminApp());
}
// ============================================================
// ADMIN AUTH MIDDLEWARE - FIREBASE ID TOKEN
// ============================================================

const ADMIN_EMAILS = new Set([
  'laicaodang@thcscva.edu.vn',
  'danglaicao@gmail.com',
]);

function normalizeAdminEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function requireAdminAuth(req, res, next) {
  try {
    const authorization = String(req.headers.authorization || '');
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return res.status(401).json({
        ok: false,
        error: 'Thiếu Firebase ID token để xác thực Admin.',
      });
    }

    const decodedToken = await getAdminAuth().verifyIdToken(tokenMatch[1]);
    const email = normalizeAdminEmail(decodedToken.email);

    if (!email || !ADMIN_EMAILS.has(email)) {
      return res.status(403).json({
        ok: false,
        error: 'Tài khoản không có quyền quản trị hệ thống.',
      });
    }

    req.adminUser = {
      uid: decodedToken.uid,
      email,
    };

    next();
  } catch (error) {
    console.error('Admin auth verification error:', error);

    return res.status(401).json({
      ok: false,
      error: 'Token đăng nhập Admin không hợp lệ hoặc đã hết hạn.',
    });
  }
}
const app = express();

const PORT = Number(process.env.PORT || process.env.HELPER_PORT || 8787);
const HELPER_VERSION = '1.3.0-hosting';

const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');

// ============================================================
// CORS
// ============================================================

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
  'https://doc-format-pro-six.vercel.app',
  'https://docformatpro.com',
  'https://www.docformatpro.com',
];

const customOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...customOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS: Origin ${origin} không được phép.`));
    },
  })
);

app.use(express.json());

// ============================================================
// FILE UPLOAD
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getJobId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

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

    if (result.status !== 0) {
      return null;
    }

    return (
      String(result.stdout || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean) || null
    );
  } catch {
    return null;
  }
}

function runCommandV(commandName) {
  try {
    const result = spawnSync(`command -v ${commandName}`, {
      encoding: 'utf8',
      shell: true,
    });

    if (result.status !== 0) {
      return null;
    }

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

  if (process.platform === 'win32') {
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

    const located =
      runWhere('soffice.exe') ||
      runWhere('soffice') ||
      runWhere('libreoffice.exe') ||
      runWhere('libreoffice');

    if (located && fileExists(located)) {
      return located;
    }

    return null;
  }

  const located = runCommandV('libreoffice') || runCommandV('soffice');

  if (located) {
    return located;
  }

  const unixCandidates = [
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/usr/local/bin/libreoffice',
    '/usr/local/bin/soffice',
  ];

  for (const candidate of unixCandidates) {
    if (fileExists(candidate)) {
      return candidate;
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

    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', code => {
      clearTimeout(timer);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `LibreOffice lỗi mã ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
        )
      );
    });
  });
}

// ============================================================
// HEALTH CHECK
// ============================================================

function handleHealthCheck(_req, res) {
  const libreOfficePath = findLibreOfficeExecutable();
  const detected = Boolean(libreOfficePath);

  res.json({
    ok: true,
    name: 'docFormat Pro PDF Helper',
    version: HELPER_VERSION,
    libreOfficeDetected: detected,
    libreOfficeFound: detected,
    libreOfficePath: libreOfficePath || null,
    platform: process.platform,
  });
}

app.get(
  ['/health', '/api/health', '/VB/health', '/VB/api/health'],
  handleHealthCheck
);

app.get(['/api/version', '/VB/api/version'], (_req, res) => {
  res.json({
    ok: true,
    name: 'docFormat Pro PDF Helper',
    version: HELPER_VERSION,
    platform: process.platform,
  });
});
// ============================================================
// MYSQL HEALTH CHECK - LICENSING STAGE
// ============================================================

app.get(['/api/mysql-health', '/VB/api/mysql-health'], async (_req, res) => {
  try {
    const pool = getDbPool();

    const [rows] = await pool.query(
      'SELECT DATABASE() AS databaseName, VERSION() AS mysqlVersion, NOW() AS serverTime'
    );

    res.json({
      ok: true,
      service: 'docFormat Pro Licensing MySQL',
      database: rows[0]?.databaseName || null,
      mysqlVersion: rows[0]?.mysqlVersion || null,
      serverTime: rows[0]?.serverTime || null,
    });
  } catch (error) {
    console.error('MySQL health check error:', error);

    res.status(500).json({
      ok: false,
      service: 'docFormat Pro Licensing MySQL',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
// ============================================================
// FIREBASE ADMIN HEALTH CHECK - SERVER AUTH STAGE
// ============================================================

app.get(['/api/firebase-admin-health', '/VB/api/firebase-admin-health'], async (_req, res) => {
  try {
    const adminAuth = getAdminAuth();

    // Thực hiện một truy vấn đọc tối thiểu để xác nhận:
    // - Service Account Key đọc được;
    // - Firebase Admin SDK khởi tạo được;
    // - Máy chủ có quyền truy cập Firebase Authentication.
    await adminAuth.listUsers(1);

    res.json({
      ok: true,
      service: 'docFormat Pro Firebase Admin',
      projectId: 'giasutoanchuvanan',
      authAccess: true,
    });
  } catch (error) {
    console.error('Firebase Admin health check error:', error);

    res.status(500).json({
      ok: false,
      service: 'docFormat Pro Firebase Admin',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
// ============================================================
// PROTECTED ADMIN AUTH CHECK - STAGE
// ============================================================

app.get(
  ['/api/admin/auth-check', '/VB/api/admin/auth-check'],
  requireAdminAuth,
  (req, res) => {
    res.json({
      ok: true,
      service: 'docFormat Pro Protected Admin API',
      adminEmail: req.adminUser?.email || null,
    });
  }
);
// ============================================================
// FIRESTORE LICENSING SUMMARY - PROTECTED ADMIN API
// ============================================================

app.get(
  ['/api/admin/firestore/licensing-summary', '/VB/api/admin/firestore/licensing-summary'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const firestore = getAdminFirestore();

      const collectionNames = [
        'licenses',
        'licenseDevices',
        'licenseRequests',
      ];

      const results = await Promise.all(
        collectionNames.map(async (collectionName) => {
          const snapshot = await firestore.collection(collectionName).get();

          return {
            collection: collectionName,
            documentCount: snapshot.size,
          };
        })
      );

      res.json({
        ok: true,
        service: 'docFormat Pro Firestore Licensing Summary',
        requestedBy: req.adminUser?.email || null,
        collections: results,
      });
    } catch (error) {
      console.error('Firestore licensing summary error:', error);

      res.status(500).json({
        ok: false,
        service: 'docFormat Pro Firestore Licensing Summary',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
// ============================================================
// FIRESTORE LICENSING EXPORT BACKUP - PROTECTED ADMIN API
// ============================================================

function toJsonSafeFirestoreValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafeFirestoreValue(item));
  }

  if (typeof value === 'object') {
    const result = {};

    Object.entries(value).forEach(([key, item]) => {
      result[key] = toJsonSafeFirestoreValue(item);
    });

    return result;
  }

  return value;
}

app.get(
  ['/api/admin/firestore/licensing-export', '/VB/api/admin/firestore/licensing-export'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const firestore = getAdminFirestore();

      const collectionNames = [
        'licenses',
        'licenseDevices',
        'licenseRequests',
      ];

      const exportedCollections = {};

      for (const collectionName of collectionNames) {
        const snapshot = await firestore.collection(collectionName).get();

        exportedCollections[collectionName] = snapshot.docs.map((document) => ({
          firestoreDocId: document.id,
          ...toJsonSafeFirestoreValue(document.data()),
        }));
      }

      const exportedAt = new Date().toISOString();
      const safeTimestamp = exportedAt.replace(/[:.]/g, '-');

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="docformat-firestore-licensing-backup-${safeTimestamp}.json"`
      );

      res.json({
        ok: true,
        service: 'docFormat Pro Firestore Licensing Export Backup',
        exportedAt,
        exportedBy: req.adminUser?.email || null,
        collections: exportedCollections,
      });
    } catch (error) {
      console.error('Firestore licensing export error:', error);

      res.status(500).json({
        ok: false,
        service: 'docFormat Pro Firestore Licensing Export Backup',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// ============================================================
// MYSQL IMPORT FROM FIRESTORE LICENSING BACKUP - PROTECTED ADMIN API
// ============================================================

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Dữ liệu backup không hợp lệ: thiếu mảng ${label}.`);
  }
  return value;
}

function toMysqlDateTime3(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Giá trị thời gian không hợp lệ: ${value}`);
  }

  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function toMysqlJson(value) {
  return value === undefined ? null : JSON.stringify(value);
}

function requireFirestoreDocIdsUnique(records, collectionName) {
  const ids = new Set();

  records.forEach((record, index) => {
    const docId = String(record?.firestoreDocId || '').trim();

    if (!docId) {
      throw new Error(`${collectionName}[${index}] thiếu firestoreDocId.`);
    }

    if (ids.has(docId)) {
      throw new Error(`${collectionName} có firestoreDocId trùng lặp: ${docId}.`);
    }

    ids.add(docId);
  });
}

app.post(
  ['/api/admin/mysql/import-firestore-licensing', '/VB/api/admin/mysql/import-firestore-licensing'],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Firestore Licensing Import';
    let connection;

    try {
      const backup = req.body;
      const collections = backup?.collections;

      if (!backup || backup.ok !== true || !collections || typeof collections !== 'object') {
        return res.status(400).json({
          ok: false,
          service: serviceName,
          error: 'File backup không hợp lệ: không tìm thấy collections hoặc trạng thái export ok=true.',
        });
      }

      const licenses = requireArray(collections.licenses, 'collections.licenses');
      const licenseDevices = requireArray(collections.licenseDevices, 'collections.licenseDevices');
      const licenseRequests = requireArray(collections.licenseRequests, 'collections.licenseRequests');

      requireFirestoreDocIdsUnique(licenses, 'licenses');
      requireFirestoreDocIdsUnique(licenseDevices, 'licenseDevices');
      requireFirestoreDocIdsUnique(licenseRequests, 'licenseRequests');

      const sourceCounts = {
        licenses: licenses.length,
        licenseDevices: licenseDevices.length,
        licenseRequests: licenseRequests.length,
        total: licenses.length + licenseDevices.length + licenseRequests.length,
      };

      if (
        sourceCounts.licenses !== 6 ||
        sourceCounts.licenseDevices !== 14 ||
        sourceCounts.licenseRequests !== 41 ||
        sourceCounts.total !== 61
      ) {
        return res.status(400).json({
          ok: false,
          service: serviceName,
          error: 'Số lượng bản ghi trong backup không khớp bản backup đã kiểm kê; dừng import để kiểm tra lại.',
          sourceCounts,
        });
      }

      const pool = getDbPool();
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [targetCountsRows] = await connection.query(`
        SELECT 'licenses' AS tableName, COUNT(*) AS rowCount FROM licenses
        UNION ALL
        SELECT 'license_devices' AS tableName, COUNT(*) AS rowCount FROM license_devices
        UNION ALL
        SELECT 'license_requests' AS tableName, COUNT(*) AS rowCount FROM license_requests
      `);

      const existingCounts = Object.fromEntries(
        targetCountsRows.map((row) => [row.tableName, Number(row.rowCount)])
      );

      if (
        existingCounts.licenses !== 0 ||
        existingCounts.license_devices !== 0 ||
        existingCounts.license_requests !== 0
      ) {
        await connection.rollback();

        return res.status(409).json({
          ok: false,
          service: serviceName,
          error: 'Import bị chặn vì ít nhất một bảng MySQL đã có dữ liệu.',
          existingCounts,
        });
      }

      const licenseSql = `
        INSERT INTO licenses (
          firestore_doc_id, activation_code, school_id, org_name, license_type, status,
          governing_body, location, party_cell, party_upper, departments, receivers,
          max_devices, active_device_count, departments_updated_at, created_at, updated_at,
          firestore_raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of licenses) {
        await connection.execute(licenseSql, [
          item.firestoreDocId,
          item.activationCode ?? null,
          item.schoolId ?? null,
          item.orgName ?? null,
          item.licenseType ?? null,
          item.status ?? null,
          item.governingBody ?? null,
          item.location ?? null,
          item.partyCell ?? null,
          item.partyUpper ?? null,
          toMysqlJson(item.departments),
          toMysqlJson(item.receivers),
          Number(item.maxDevices ?? 0),
          Number(item.activeDeviceCount ?? 0),
          toMysqlDateTime3(item.departmentsUpdatedAt),
          toMysqlDateTime3(item.createdAt),
          toMysqlDateTime3(item.updatedAt),
          toMysqlJson(item),
        ]);
      }

      const deviceSql = `
        INSERT INTO license_devices (
          firestore_doc_id, device_id, device_name, license_doc_id, school_id, org_name,
          user_name, user_role, phone, status, activated_at, revoked_at, blocked_at,
          restored_at, last_seen_at, created_at, updated_at, firestore_raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of licenseDevices) {
        await connection.execute(deviceSql, [
          item.firestoreDocId,
          item.deviceId ?? null,
          item.deviceName ?? null,
          item.licenseDocId ?? null,
          item.schoolId ?? null,
          item.orgName ?? null,
          item.userName ?? null,
          item.userRole ?? null,
          item.phone ?? null,
          item.status ?? null,
          toMysqlDateTime3(item.activatedAt),
          toMysqlDateTime3(item.revokedAt),
          toMysqlDateTime3(item.blockedAt),
          toMysqlDateTime3(item.restoredAt),
          toMysqlDateTime3(item.lastSeenAt),
          toMysqlDateTime3(item.createdAt),
          toMysqlDateTime3(item.updatedAt),
          toMysqlJson(item),
        ]);
      }

      const requestSql = `
        INSERT INTO license_requests (
          firestore_doc_id, device_id, device_name, license_doc_id, school_id, requested_school_id,
          org_name, governing_body, location, party_upper, party_cell, departments, user_name,
          user_role, phone, request_type, status, approved_at, rejected_at, created_at, updated_at,
          firestore_raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of licenseRequests) {
        await connection.execute(requestSql, [
          item.firestoreDocId,
          item.deviceId ?? null,
          item.deviceName ?? null,
          item.licenseDocId ?? null,
          item.schoolId ?? null,
          item.requestedSchoolId ?? null,
          item.orgName ?? null,
          item.governingBody ?? null,
          item.location ?? null,
          item.partyUpper ?? null,
          item.partyCell ?? null,
          item.departments ?? null,
          item.userName ?? null,
          item.userRole ?? null,
          item.phone ?? null,
          item.requestType ?? null,
          item.status ?? null,
          toMysqlDateTime3(item.approvedAt),
          toMysqlDateTime3(item.rejectedAt),
          toMysqlDateTime3(item.createdAt),
          toMysqlDateTime3(item.updatedAt),
          toMysqlJson(item),
        ]);
      }

      const [verificationRows] = await connection.query(`
        SELECT 'licenses' AS tableName, COUNT(*) AS rowCount FROM licenses
        UNION ALL
        SELECT 'license_devices' AS tableName, COUNT(*) AS rowCount FROM license_devices
        UNION ALL
        SELECT 'license_requests' AS tableName, COUNT(*) AS rowCount FROM license_requests
      `);

      const importedCounts = Object.fromEntries(
        verificationRows.map((row) => [row.tableName, Number(row.rowCount)])
      );

      if (
        importedCounts.licenses !== sourceCounts.licenses ||
        importedCounts.license_devices !== sourceCounts.licenseDevices ||
        importedCounts.license_requests !== sourceCounts.licenseRequests
      ) {
        throw new Error('Đối chiếu số lượng sau import không khớp nguồn backup.');
      }

      await connection.commit();

      res.json({
        ok: true,
        service: serviceName,
        importedBy: req.adminUser?.email || null,
        sourceExportedAt: backup.exportedAt || null,
        sourceExportedBy: backup.exportedBy || null,
        sourceCounts,
        importedCounts,
        note: 'Import đã hoàn thành trong transaction. Firebase chưa bị thay đổi.',
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('MySQL import rollback error:', rollbackError);
        }
      }

      console.error('MySQL Firestore licensing import error:', error);

      res.status(500).json({
        ok: false,
        service: serviceName,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);


// ============================================================
// MYSQL LICENSING DASHBOARD READ - PROTECTED ADMIN API
// Read-only stage: phục vụ kiểm tra API trước khi giao diện chuyển khỏi Firestore.
// ============================================================

function parseMysqlJsonValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch (_error) {
    return value;
  }
}

app.get(
  ['/api/admin/mysql/licensing-dashboard', '/VB/api/admin/mysql/licensing-dashboard'],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Licensing Dashboard';

    try {
      const pool = getDbPool();

      const [licenseRows] = await pool.query(`
        SELECT
          firestore_doc_id AS id,
          firestore_doc_id AS firestoreDocId,
          activation_code AS activationCode,
          school_id AS schoolId,
          org_name AS orgName,
          license_type AS licenseType,
          status,
          activated_at AS activatedAt,
          expires_at AS expiresAt,
          renew_requested_at AS renewRequestedAt,
          renewed_at AS renewedAt,
          governing_body AS governingBody,
          location,
          party_cell AS partyCell,
          party_upper AS partyUpper,
          departments,
          receivers,
          max_devices AS maxDevices,
          active_device_count AS activeDeviceCount,
          departments_updated_at AS departmentsUpdatedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM licenses
        ORDER BY org_name ASC, firestore_doc_id ASC
      `);

      const [deviceRows] = await pool.query(`
        SELECT
          firestore_doc_id AS id,
          firestore_doc_id AS firestoreDocId,
          device_id AS deviceId,
          device_name AS deviceName,
          license_doc_id AS licenseDocId,
          school_id AS schoolId,
          org_name AS orgName,
          user_name AS userName,
          user_role AS userRole,
          phone,
          status,
          activated_at AS activatedAt,
          revoked_at AS revokedAt,
          blocked_at AS blockedAt,
          restored_at AS restoredAt,
          last_seen_at AS lastSeenAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM license_devices
        ORDER BY created_at DESC, firestore_doc_id ASC
      `);

      const [requestRows] = await pool.query(`
        SELECT
          firestore_doc_id AS id,
          firestore_doc_id AS firestoreDocId,
          device_id AS deviceId,
          device_name AS deviceName,
          license_doc_id AS licenseDocId,
          school_id AS schoolId,
          requested_school_id AS requestedSchoolId,
          org_name AS orgName,
          governing_body AS governingBody,
          location,
          party_upper AS partyUpper,
          party_cell AS partyCell,
          departments,
          user_name AS userName,
          user_role AS userRole,
          phone,
          request_type AS requestType,
          status,
          approved_at AS approvedAt,
          rejected_at AS rejectedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM license_requests
        ORDER BY created_at DESC, firestore_doc_id ASC
      `);

      const licenses = licenseRows.map((row) => ({
        ...row,
        departments: parseMysqlJsonValue(row.departments),
        receivers: parseMysqlJsonValue(row.receivers),
        maxDevices: Number(row.maxDevices ?? 0),
        activeDeviceCount: Number(row.activeDeviceCount ?? 0),
      }));

      const licenseDevices = deviceRows.map((row) => ({ ...row }));
      const licenseRequests = requestRows.map((row) => ({ ...row }));

      const counts = {
        licenses: licenses.length,
        licenseDevices: licenseDevices.length,
        licenseRequests: licenseRequests.length,
        total: licenses.length + licenseDevices.length + licenseRequests.length,
      };

      res.json({
        ok: true,
        service: serviceName,
        requestedBy: req.adminUser?.email || null,
        source: 'mysql',
        counts,
        licenses,
        licenseDevices,
        licenseRequests,
      });
    } catch (error) {
      console.error('MySQL licensing dashboard read error:', error);

      res.status(500).json({
        ok: false,
        service: serviceName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);


// ============================================================
// MYSQL LICENSING ADMIN COMMANDS - PROTECTED ADMIN API
// These routes are not used by the current frontend yet.
// They are prepared for a later controlled switch away from Firestore.
// ============================================================

function normalizeLicensingSchoolId(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

function makeMysqlExternalDocId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
}

function requireRouteIdentifier(value, label) {
  const id = String(value || '').trim();

  if (!id) {
    const error = new Error(`Thiếu ${label}.`);
    error.httpStatus = 400;
    throw error;
  }

  return id;
}

function makeApiError(message, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  return error;
}

function sendMysqlAdminCommandError(res, serviceName, error) {
  const httpStatus =
    Number(error?.httpStatus) >= 400 && Number(error?.httpStatus) < 600
      ? Number(error.httpStatus)
      : 500;

  if (httpStatus >= 500) {
    console.error(`${serviceName} error:`, error);
  }

  res.status(httpStatus).json({
    ok: false,
    service: serviceName,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function runMysqlTransaction(work) {
  const connection = await getDbPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('MySQL licensing command rollback error:', rollbackError);
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function getLockedLicenseByDocId(connection, licenseDocId) {
  const [rows] = await connection.execute(
    `
      SELECT *
      FROM licenses
      WHERE firestore_doc_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [licenseDocId]
  );

  return rows[0] || null;
}

async function getLockedLicenseBySchoolId(connection, schoolId) {
  const [rows] = await connection.execute(
    `
      SELECT *
      FROM licenses
      WHERE school_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [schoolId]
  );

  return rows[0] || null;
}

async function countActiveDevicesForLicense(connection, licenseDocId, schoolId) {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS activeCount
      FROM license_devices
      WHERE status = 'ACTIVE'
        AND (
          license_doc_id = ?
          OR (? IS NOT NULL AND school_id = ?)
        )
    `,
    [licenseDocId, schoolId || null, schoolId || null]
  );

  return Number(rows[0]?.activeCount || 0);
}

async function syncActiveDeviceCount(connection, licenseDocId) {
  const license = await getLockedLicenseByDocId(connection, licenseDocId);

  if (!license) {
    return null;
  }

  const activeCount = await countActiveDevicesForLicense(
    connection,
    license.firestore_doc_id,
    license.school_id
  );

  await connection.execute(
    `
      UPDATE licenses
      SET active_device_count = ?, updated_at = ?
      WHERE firestore_doc_id = ?
    `,
    [activeCount, toMysqlDateTime3(new Date()), license.firestore_doc_id]
  );

  return activeCount;
}
app.post(
  ['/api/license/request', '/VB/api/license/request'],
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Client License Request';

    try {
      const body = req.body || {};

      const requestType = String(body.requestType || 'NEW_SCHOOL').trim();
      const deviceId = String(body.deviceId || '').trim();
      const deviceName = String(body.deviceName || '').trim();
      const userName = String(body.userName || '').trim();
      const userRole = String(body.userRole || '').trim();
      const phone = String(body.phone || '').trim();
      const schoolId = normalizeLicensingSchoolId(body.schoolId || body.requestedSchoolId || '');

      if (!deviceId) {
        throw makeApiError('Thiếu mã thiết bị.', 400);
      }

      if (!deviceName) {
        throw makeApiError('Thiếu tên máy / ghi chú thiết bị.', 400);
      }

      if (!userName) {
        throw makeApiError('Thiếu họ tên người sử dụng.', 400);
      }

      if (requestType === 'EXISTING_SCHOOL' && !schoolId) {
        throw makeApiError('Thiếu mã định danh trường.', 400);
      }

      const result = await runMysqlTransaction(async (connection) => {
        let license = null;

        if (requestType === 'EXISTING_SCHOOL') {
          const [licenseRows] = await connection.execute(
            `
              SELECT *
              FROM licenses
              WHERE school_id = ?
              LIMIT 1
              FOR UPDATE
            `,
            [schoolId]
          );

          license = licenseRows[0] || null;

          if (!license) {
            throw makeApiError('Không tìm thấy trường có mã định danh này trong hệ thống.', 404);
          }

          if (license.status !== 'ACTIVE') {
            throw makeApiError('Bản quyền của đơn vị này chưa hoạt động hoặc đã bị khóa.', 409);
          }

          const maxDevices = Number(license.max_devices || 15);
          const activeDeviceCount = Number(license.active_device_count || 0);

          if (activeDeviceCount >= maxDevices) {
            throw makeApiError(
              `Đơn vị ${schoolId} đã đạt giới hạn ${activeDeviceCount}/${maxDevices} thiết bị.`,
              409
            );
          }
        }

        const [existingDeviceRows] = await connection.execute(
          `
            SELECT *
            FROM license_devices
            WHERE device_id = ?
            LIMIT 1
          `,
          [deviceId]
        );

        const existingDevice = existingDeviceRows[0] || null;

        if (existingDevice?.status === 'ACTIVE') {
          return {
            alreadyLicensed: true,
            requestId: null,
            deviceId,
            status: 'ACTIVE',
            message: 'Thiết bị này đã được cấp phép trước đó.',
          };
        }

        if (existingDevice?.status === 'REVOKED') {
          throw makeApiError('Thiết bị này đã bị thu hồi bản quyền. Vui lòng liên hệ Admin để được cấp lại.', 409);
        }

        if (existingDevice?.status === 'BLOCKED') {
          throw makeApiError('Thiết bị này đã bị khóa. Vui lòng liên hệ Admin.', 409);
        }

        const [pendingRows] = await connection.execute(
          `
            SELECT *
            FROM license_requests
            WHERE device_id = ? AND status = 'PENDING'
            ORDER BY updated_at DESC
            LIMIT 1
          `,
          [deviceId]
        );

        const pendingRequest = pendingRows[0] || null;

        if (pendingRequest) {
          return {
            alreadyPending: true,
            requestId: pendingRequest.firestore_doc_id,
            requestType: pendingRequest.request_type,
            schoolId: pendingRequest.school_id || pendingRequest.requested_school_id || schoolId || null,
            licenseDocId: pendingRequest.license_doc_id || null,
            orgName: pendingRequest.org_name || null,
            deviceId: pendingRequest.device_id,
            deviceName: pendingRequest.device_name,
            userName: pendingRequest.user_name,
            userRole: pendingRequest.user_role || '',
            phone: pendingRequest.phone || '',
            status: pendingRequest.status,
            createdAt: pendingRequest.created_at,
            updatedAt: pendingRequest.updated_at,
            message: 'Thiết bị này đã có yêu cầu đang chờ duyệt.',
          };
        }

        const requestId = makeMysqlExternalDocId('REQ');
        const now = toMysqlDateTime3(new Date());

        const requestPayload = {
          requestType,
          schoolId: requestType === 'EXISTING_SCHOOL' ? schoolId : null,
          requestedSchoolId: schoolId || null,
          licenseDocId: license?.firestore_doc_id || null,
          orgName: license?.org_name || String(body.orgName || '').trim() || null,
          deviceId,
          deviceName,
          userName,
          userRole,
          phone,
          status: 'PENDING',
        };

        await connection.execute(
          `
            INSERT INTO license_requests (
              firestore_doc_id,
              license_doc_id,
              school_id,
              requested_school_id,
              org_name,
              device_id,
              device_name,
              user_name,
              user_role,
              phone,
              request_type,
              status,
              created_at,
              updated_at,
              firestore_raw_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, CAST(? AS JSON))
          `,
          [
            requestId,
            requestPayload.licenseDocId,
            requestPayload.schoolId,
            requestPayload.requestedSchoolId,
            requestPayload.orgName,
            requestPayload.deviceId,
            requestPayload.deviceName,
            requestPayload.userName,
            requestPayload.userRole,
            requestPayload.phone,
            requestPayload.requestType,
            now,
            now,
            JSON.stringify(requestPayload),
          ]
        );

        return {
          alreadyPending: false,
          requestId,
          requestType: requestPayload.requestType,
          schoolId: requestPayload.schoolId,
          requestedSchoolId: requestPayload.requestedSchoolId,
          licenseDocId: requestPayload.licenseDocId,
          orgName: requestPayload.orgName,
          deviceId: requestPayload.deviceId,
          deviceName: requestPayload.deviceName,
          userName: requestPayload.userName,
          userRole: requestPayload.userRole,
          phone: requestPayload.phone,
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
          message: 'Yêu cầu cấp phép đã được gửi lên hệ thống.',
        };
      });

      return res.json({
        ok: true,
        service: serviceName,
        ...result,
      });
    } catch (error) {
      console.error(`[${serviceName}]`, error);

      return res.status(error.statusCode || 500).json({
        ok: false,
        service: serviceName,
        error: error.message || 'Không gửi được yêu cầu cấp phép.',
      });
    }
  }
);

app.post(
  ['/api/license/status', '/VB/api/license/status'],
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Client License Status';

    try {
      const body = req.body || {};
      const deviceId = String(body.deviceId || '').trim();

      if (!deviceId) {
        throw makeApiError('Thiếu mã thiết bị.', 400);
      }

      const pool = getDbPool();

      const [deviceRows] = await pool.execute(
        `
          SELECT
            d.*,
            l.firestore_doc_id AS license_firestore_doc_id,
            l.activation_code,
            l.license_type,
            l.max_devices,
            l.active_device_count,
            l.status AS license_status,
            l.activated_at,
            l.expires_at,
            l.renew_requested_at,
            l.renewed_at,
            l.governing_body,
            l.location,
            l.party_cell,
            l.party_upper,
            l.departments,
            l.receivers
          FROM license_devices d
          LEFT JOIN licenses l ON l.firestore_doc_id = d.license_doc_id
          WHERE d.device_id = ?
          LIMIT 1
        `,
        [deviceId]
      );

      const device = deviceRows[0] || null;

      if (!device) {
        return res.status(200).json({
          ok: false,
          service: serviceName,
          status: 'UNREGISTERED',
          error: 'Thiết bị chưa được cấp phép.',
        });
      }

      if (device.status !== 'ACTIVE') {
        return res.status(403).json({
          ok: false,
          service: serviceName,
          status: device.status || 'BLOCKED',
          error:
            device.status === 'REVOKED'
              ? 'Thiết bị đã bị thu hồi bản quyền.'
              : device.status === 'BLOCKED'
                ? 'Thiết bị đã bị khóa.'
                : 'Thiết bị chưa được kích hoạt.',
        });
      }

      if (device.license_status === 'EXPIRED') {
  return res.status(403).json({
    ok: false,
    service: serviceName,
    status: 'EXPIRED',
    error: 'Bản quyền của bạn đã hết hạn sử dụng chính thức. Muốn sử dụng tiếp, vui lòng chọn Gia hạn bản quyền.',
    expiredAt: device.expires_at || null,
  });
}

if (device.license_status && device.license_status !== 'ACTIVE') {
  return res.status(403).json({
    ok: false,
    service: serviceName,
    status: 'LICENSE_INACTIVE',
    error: 'Bản quyền của đơn vị chưa hoạt động hoặc đã bị khóa.',
  });
}
          if (device.expires_at && new Date(device.expires_at).getTime() < Date.now()) {
      await pool.execute(
        `
          UPDATE licenses
          SET status = 'EXPIRED',
              updated_at = ?
          WHERE firestore_doc_id = ?
        `,
        [toMysqlDateTime3(new Date()), device.license_doc_id]
      );

      return res.status(403).json({
        ok: false,
        service: serviceName,
        status: 'EXPIRED',
        error: 'Bản quyền đã hết hạn. Vui lòng gửi yêu cầu phục hồi bản quyền.',
        expiredAt: device.expires_at
      });
    }
      const now = toMysqlDateTime3(new Date());

      await pool.execute(
        `
          UPDATE license_devices
          SET last_seen_at = ?, updated_at = ?
          WHERE device_id = ?
        `,
        [now, now, deviceId]
      );

      return res.json({
        ok: true,
        service: serviceName,
        status: 'ACTIVE',
        device: {
          id: device.firestore_doc_id,
          firestoreDocId: device.firestore_doc_id,
          licenseDocId: device.license_doc_id,
          schoolId: device.school_id,
          orgName: device.org_name,
          deviceId: device.device_id,
          deviceName: device.device_name,
          userName: device.user_name,
          userRole: device.user_role,
          phone: device.phone,
          status: device.status,
          activatedAt: device.activated_at,
          lastSeenAt: now,
        },
        license: {
          id: device.license_doc_id,
          firestoreDocId: device.license_doc_id,
          activationCode: device.activation_code,
          schoolId: device.school_id,
          orgName: device.org_name,
          licenseType: device.license_type,
          status: device.license_status || 'ACTIVE',
          activatedAt: device.activated_at || null,
          expiresAt: device.expires_at || null,
          renewRequestedAt: device.renew_requested_at || null,
          renewedAt: device.renewed_at || null,
          maxDevices: Number(device.max_devices || 15),
          activeDeviceCount: Number(device.active_device_count || 0),
          governingBody: device.governing_body || '',
          location: device.location || '',
          partyCell: device.party_cell || '',
          partyUpper: device.party_upper || '',
          departments: parseMysqlJsonValue(device.departments) || [],
receivers: parseMysqlJsonValue(device.receivers) || [],
        },
      });
    } catch (error) {
      console.error(`[${serviceName}]`, error);

      return res.status(error.statusCode || 500).json({
        ok: false,
        service: serviceName,
        error: error.message || 'Không kiểm tra được trạng thái cấp phép.',
      });
    }
  }
);

app.post(
  [
    '/api/admin/mysql/license-requests/:requestId/approve',
    '/VB/api/admin/mysql/license-requests/:requestId/approve',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Approve License Request';

    try {
      const requestId = requireRouteIdentifier(req.params.requestId, 'requestId');

      const result = await runMysqlTransaction(async (connection) => {
        const [requestRows] = await connection.execute(
          `
            SELECT *
            FROM license_requests
            WHERE firestore_doc_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [requestId]
        );

        const request = requestRows[0];

        if (!request) {
          throw makeApiError('Yêu cầu không tồn tại.', 404);
        }

        if (request.status !== 'PENDING') {
          throw makeApiError('Yêu cầu này đã được xử lý trước đó.', 409);
        }

        const deviceId = String(request.device_id || '').trim();

        if (!deviceId) {
          throw makeApiError('Yêu cầu thiếu deviceId.', 400);
        }
        
        const now = toMysqlDateTime3(new Date());

        if (request.request_type === 'NEW_SCHOOL') {
          const schoolId = normalizeLicensingSchoolId(
            request.requested_school_id || request.school_id
          );

          if (!schoolId) {
            throw makeApiError('Yêu cầu trường mới thiếu schoolId.', 400);
          }

          const existingLicense = await getLockedLicenseBySchoolId(connection, schoolId);

          if (existingLicense) {
            throw makeApiError(
              `Mã định danh ${schoolId} đã tồn tại. Không thể tạo trường mới trùng mã.`,
              409
            );
          }

          const [deviceRows] = await connection.execute(
            `
              SELECT firestore_doc_id, status
              FROM license_devices
              WHERE firestore_doc_id = ? OR device_id = ?
              LIMIT 1
              FOR UPDATE
            `,
            [deviceId, deviceId]
          );

          if (deviceRows.length > 0) {
            throw makeApiError(
              'Mã thiết bị đã tồn tại. Vui lòng kiểm tra thiết bị trước khi duyệt trường mới.',
              409
            );
          }

          const licenseDocId = makeMysqlExternalDocId('LICENSE');
          const activatedAt = now;
          const expiresAtDate = new Date();
          expiresAtDate.setFullYear(expiresAtDate.getFullYear() + 1);
          const expiresAt = toMysqlDateTime3(expiresAtDate);

          await connection.execute(
            `
                  INSERT INTO licenses (
      firestore_doc_id, school_id, org_name, license_type, status,
      activated_at, expires_at,
      governing_body, location, party_cell, party_upper, departments,
      max_devices, active_device_count, created_at, updated_at, firestore_raw_json
    ) VALUES (?, ?, ?, 'SCHOOL', 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, 15, 1, ?, ?, NULL)`,
            [
  licenseDocId,
  schoolId,
  request.org_name || '',
  activatedAt,
  expiresAt,
  request.governing_body || '',
  request.location || '',
  request.party_cell || '',
  request.party_upper || '',
  toMysqlJson(request.departments || ''),
  now,
  now,
]
          );

          await connection.execute(
            `
              INSERT INTO license_devices (
                firestore_doc_id, device_id, device_name, license_doc_id, school_id,
                org_name, user_name, user_role, phone, status, activated_at,
                last_seen_at, created_at, updated_at, firestore_raw_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, NULL)
            `,
            [
              deviceId,
              deviceId,
              request.device_name || '',
              licenseDocId,
              schoolId,
              request.org_name || '',
              request.user_name || '',
              request.user_role || '',
              request.phone || '',
              now,
              now,
              now,
              now,
            ]
          );

          await connection.execute(
            `
              UPDATE license_requests
              SET status = 'APPROVED', license_doc_id = ?, school_id = ?,
                  approved_at = ?, updated_at = ?
              WHERE firestore_doc_id = ?
            `,
            [licenseDocId, schoolId, now, now, requestId]
          );

          return {
            requestId,
            requestType: 'NEW_SCHOOL',
            licenseDocId,
            schoolId,
            message: 'Đã tạo trường mới và cấp phép thiết bị đầu tiên.',
          };
        }

        if (request.request_type !== 'EXISTING_SCHOOL') {
          throw makeApiError(`Loại yêu cầu không được hỗ trợ: ${request.request_type || 'UNKNOWN'}.`, 400);
        }

        const schoolId = normalizeLicensingSchoolId(request.school_id);
        let license = null;

        if (request.license_doc_id) {
          license = await getLockedLicenseByDocId(connection, request.license_doc_id);
        }

        if (!license && schoolId) {
          license = await getLockedLicenseBySchoolId(connection, schoolId);
        }

        if (!license) {
          throw makeApiError('Không tìm thấy hồ sơ bản quyền của trường.', 404);
        }

        if (!['ACTIVE', 'EXPIRED', 'RENEW_PENDING'].includes(license.status)) {
  throw makeApiError('Bản quyền của trường đã bị khóa hoặc không thể phục hồi.', 409);
}

        const [deviceRows] = await connection.execute(
          `
            SELECT *
            FROM license_devices
            WHERE firestore_doc_id = ? OR device_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [deviceId, deviceId]
        );

        const existingDevice = deviceRows[0] || null;

        if (existingDevice?.status === 'ACTIVE') {
          throw makeApiError('Thiết bị này đã được cấp phép trước đó.', 409);
        }

        if (existingDevice?.status === 'BLOCKED') {
          throw makeApiError(
            'Thiết bị này đang bị khóa. Vui lòng mở khóa hoặc kiểm tra lại trước khi cấp phép.',
            409
          );
        }

        const currentActiveCount = await countActiveDevicesForLicense(
          connection,
          license.firestore_doc_id,
          license.school_id
        );
        const maxDevices = Number(license.max_devices || 15);

        if (currentActiveCount >= maxDevices) {
          throw makeApiError(
            `Đơn vị đã đạt giới hạn ${currentActiveCount}/${maxDevices} thiết bị. Vui lòng thu hồi thiết bị cũ trước.`,
            409
          );
        }

        if (existingDevice) {
          await connection.execute(
            `
              UPDATE license_devices
              SET device_id = ?, device_name = ?, license_doc_id = ?, school_id = ?,
                  org_name = ?, user_name = ?, user_role = ?, phone = ?, status = 'ACTIVE',
                  activated_at = ?, last_seen_at = ?, created_at = ?, updated_at = ?
              WHERE firestore_doc_id = ?
            `,
            [
              deviceId,
              request.device_name || '',
              license.firestore_doc_id,
              license.school_id || schoolId || null,
              license.org_name || request.org_name || '',
              request.user_name || '',
              request.user_role || '',
              request.phone || '',
              now,
              now,
              now,
              now,
              existingDevice.firestore_doc_id,
            ]
          );
        } else {
          await connection.execute(
            `
              INSERT INTO license_devices (
                firestore_doc_id, device_id, device_name, license_doc_id, school_id,
                org_name, user_name, user_role, phone, status, activated_at,
                last_seen_at, created_at, updated_at, firestore_raw_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, NULL)
            `,
            [
              deviceId,
              deviceId,
              request.device_name || '',
              license.firestore_doc_id,
              license.school_id || schoolId || null,
              license.org_name || request.org_name || '',
              request.user_name || '',
              request.user_role || '',
              request.phone || '',
              now,
              now,
              now,
              now,
            ]
          );
        }
              await connection.execute(
        `
          UPDATE licenses
          SET status = 'ACTIVE',
              renewed_at = ?,
              expires_at = DATE_ADD(?, INTERVAL 1 YEAR),
              renew_requested_at = NULL,
              updated_at = ?
          WHERE firestore_doc_id = ? OR school_id = ?
        `,
        [now, now, now, license.firestore_doc_id, license.school_id]
      );
        await connection.execute(
          `
            UPDATE license_requests
            SET status = 'APPROVED', license_doc_id = ?, approved_at = ?, updated_at = ?
            WHERE firestore_doc_id = ?
          `,
          [license.firestore_doc_id, now, now, requestId]
        );

        const activeCount = await syncActiveDeviceCount(connection, license.firestore_doc_id);

        return {
          requestId,
          requestType: 'EXISTING_SCHOOL',
          licenseDocId: license.firestore_doc_id,
          schoolId: license.school_id,
          activeDeviceCount: activeCount,
          message: 'Đã cấp phép thiết bị thành công.',
        };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.post(
  [
    '/api/admin/mysql/license-requests/:requestId/reject',
    '/VB/api/admin/mysql/license-requests/:requestId/reject',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Reject License Request';

    try {
      const requestId = requireRouteIdentifier(req.params.requestId, 'requestId');

      const result = await runMysqlTransaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT status FROM license_requests WHERE firestore_doc_id = ? LIMIT 1 FOR UPDATE`,
          [requestId]
        );

        if (!rows[0]) {
          throw makeApiError('Yêu cầu không tồn tại.', 404);
        }

        if (rows[0].status !== 'PENDING') {
          throw makeApiError('Chỉ có thể từ chối yêu cầu đang chờ duyệt.', 409);
        }

        const now = toMysqlDateTime3(new Date());

        await connection.execute(
          `
            UPDATE license_requests
            SET status = 'REJECTED', rejected_at = ?, updated_at = ?
            WHERE firestore_doc_id = ?
          `,
          [now, now, requestId]
        );

        return { requestId, status: 'REJECTED' };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.delete(
  [
    '/api/admin/mysql/license-requests/:requestId',
    '/VB/api/admin/mysql/license-requests/:requestId',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Delete License Request';

    try {
      const requestId = requireRouteIdentifier(req.params.requestId, 'requestId');

      const result = await runMysqlTransaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT firestore_doc_id FROM license_requests WHERE firestore_doc_id = ? LIMIT 1 FOR UPDATE`,
          [requestId]
        );

        if (!rows[0]) {
          throw makeApiError('Yêu cầu không tồn tại hoặc đã bị xóa.', 404);
        }

        await connection.execute(
          `DELETE FROM license_requests WHERE firestore_doc_id = ?`,
          [requestId]
        );

        return { requestId, deleted: true };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.patch(
  [
    '/api/admin/mysql/licenses/:licenseId/status',
    '/VB/api/admin/mysql/licenses/:licenseId/status',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Update License Status';

    try {
      const licenseId = requireRouteIdentifier(req.params.licenseId, 'licenseId');
      const nextStatus = String(req.body?.status || '').trim().toUpperCase();

      if (!['ACTIVE', 'BLOCKED'].includes(nextStatus)) {
        throw makeApiError('Trạng thái license chỉ được là ACTIVE hoặc BLOCKED.', 400);
      }

      const result = await runMysqlTransaction(async (connection) => {
        const license = await getLockedLicenseByDocId(connection, licenseId);

        if (!license) {
          throw makeApiError('Hồ sơ bản quyền không tồn tại.', 404);
        }

        const now = toMysqlDateTime3(new Date());

        await connection.execute(
          `UPDATE licenses SET status = ?, updated_at = ? WHERE firestore_doc_id = ?`,
          [nextStatus, now, licenseId]
        );

        return { licenseId, status: nextStatus };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.delete(
  [
    '/api/admin/mysql/licenses/:licenseId',
    '/VB/api/admin/mysql/licenses/:licenseId',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Delete License';

    try {
      const licenseId = requireRouteIdentifier(req.params.licenseId, 'licenseId');

      const result = await runMysqlTransaction(async (connection) => {
        const license = await getLockedLicenseByDocId(connection, licenseId);

        if (!license) {
          throw makeApiError('Hồ sơ bản quyền không tồn tại hoặc đã bị xóa.', 404);
        }

        if (license.status !== 'BLOCKED') {
          throw makeApiError('Chỉ có thể xóa trường sau khi đã Khóa trường.', 409);
        }

        const [deviceCountRows] = await connection.execute(
          `
            SELECT COUNT(*) AS deviceCount
            FROM license_devices
            WHERE license_doc_id = ? OR school_id = ?
          `,
          [license.firestore_doc_id, license.school_id]
        );
        const deletedDeviceCount = Number(deviceCountRows[0]?.deviceCount || 0);

        await connection.execute(
          `DELETE FROM license_devices WHERE license_doc_id = ? OR school_id = ?`,
          [license.firestore_doc_id, license.school_id]
        );

        await connection.execute(
          `DELETE FROM licenses WHERE firestore_doc_id = ?`,
          [license.firestore_doc_id]
        );

        return {
          licenseId,
          schoolId: license.school_id,
          deletedDeviceCount,
          deleted: true,
          note: 'Các yêu cầu license_requests được giữ nguyên để truy vết lịch sử.',
        };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.post(
  [
    '/api/admin/mysql/license-devices/:deviceDocId/revoke',
    '/VB/api/admin/mysql/license-devices/:deviceDocId/revoke',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Revoke License Device';

    try {
      const deviceDocId = requireRouteIdentifier(req.params.deviceDocId, 'deviceDocId');

      const result = await runMysqlTransaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT * FROM license_devices WHERE firestore_doc_id = ? LIMIT 1 FOR UPDATE`,
          [deviceDocId]
        );
        const device = rows[0];

        if (!device) {
          throw makeApiError('Thiết bị không tồn tại.', 404);
        }

        if (device.status !== 'ACTIVE') {
          throw makeApiError('Thiết bị này đã bị thu hồi hoặc không còn hoạt động.', 409);
        }

        const now = toMysqlDateTime3(new Date());

        await connection.execute(
          `
            UPDATE license_devices
            SET status = 'REVOKED', revoked_at = ?, updated_at = ?
            WHERE firestore_doc_id = ?
          `,
          [now, now, deviceDocId]
        );

        const activeDeviceCount = device.license_doc_id
          ? await syncActiveDeviceCount(connection, device.license_doc_id)
          : null;

        return { deviceDocId, status: 'REVOKED', activeDeviceCount };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.post(
  [
    '/api/admin/mysql/license-devices/:deviceDocId/block',
    '/VB/api/admin/mysql/license-devices/:deviceDocId/block',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Block License Device';

    try {
      const deviceDocId = requireRouteIdentifier(req.params.deviceDocId, 'deviceDocId');

      const result = await runMysqlTransaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT * FROM license_devices WHERE firestore_doc_id = ? LIMIT 1 FOR UPDATE`,
          [deviceDocId]
        );
        const device = rows[0];

        if (!device) {
          throw makeApiError('Thiết bị không tồn tại.', 404);
        }

        if (device.status === 'BLOCKED') {
          throw makeApiError('Thiết bị này đã ở trạng thái BLOCKED.', 409);
        }

        const now = toMysqlDateTime3(new Date());

        await connection.execute(
          `
            UPDATE license_devices
            SET status = 'BLOCKED', blocked_at = ?, updated_at = ?
            WHERE firestore_doc_id = ?
          `,
          [now, now, deviceDocId]
        );

        const activeDeviceCount = device.license_doc_id
          ? await syncActiveDeviceCount(connection, device.license_doc_id)
          : null;

        return { deviceDocId, status: 'BLOCKED', activeDeviceCount };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.post(
  [
    '/api/admin/mysql/license-devices/:deviceDocId/restore',
    '/VB/api/admin/mysql/license-devices/:deviceDocId/restore',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Restore License Device';

    try {
      const deviceDocId = requireRouteIdentifier(req.params.deviceDocId, 'deviceDocId');

      const result = await runMysqlTransaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT * FROM license_devices WHERE firestore_doc_id = ? LIMIT 1 FOR UPDATE`,
          [deviceDocId]
        );
        const device = rows[0];

        if (!device) {
          throw makeApiError('Thiết bị không tồn tại.', 404);
        }

        if (!['REVOKED', 'BLOCKED'].includes(device.status)) {
          throw makeApiError('Chỉ có thể phục hồi thiết bị REVOKED hoặc BLOCKED.', 409);
        }

        let license = null;

        if (device.license_doc_id) {
          license = await getLockedLicenseByDocId(connection, device.license_doc_id);
        }

        if (!license && device.school_id) {
          license = await getLockedLicenseBySchoolId(connection, device.school_id);
        }

        if (!license) {
          throw makeApiError('Không tìm thấy hồ sơ bản quyền của đơn vị để phục hồi thiết bị.', 404);
        }

        if (!['ACTIVE', 'EXPIRED', 'RENEW_PENDING'].includes(license.status)) {
  throw makeApiError('Bản quyền của trường đã bị khóa hoặc không thể phục hồi.', 409);
}

        const activeDeviceCount = await countActiveDevicesForLicense(
          connection,
          license.firestore_doc_id,
          license.school_id
        );
        const maxDevices = Number(license.max_devices || 15);

        if (activeDeviceCount >= maxDevices) {
          throw makeApiError(
            `Đơn vị đã đạt giới hạn ${activeDeviceCount}/${maxDevices} thiết bị. Vui lòng thu hồi thiết bị khác trước khi phục hồi.`,
            409
          );
        }

        const now = toMysqlDateTime3(new Date());

        await connection.execute(
          `
            UPDATE license_devices
            SET status = 'ACTIVE', license_doc_id = ?, school_id = ?,
                restored_at = ?, last_seen_at = ?, updated_at = ?
            WHERE firestore_doc_id = ?
          `,
          [
            license.firestore_doc_id,
            license.school_id,
            now,
            now,
            now,
            deviceDocId,
          ]
        );

        const nextActiveDeviceCount = await syncActiveDeviceCount(
          connection,
          license.firestore_doc_id
        );

        return {
          deviceDocId,
          status: 'ACTIVE',
          licenseDocId: license.firestore_doc_id,
          activeDeviceCount: nextActiveDeviceCount,
        };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.delete(
  [
    '/api/admin/mysql/license-devices/:deviceDocId',
    '/VB/api/admin/mysql/license-devices/:deviceDocId',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Delete License Device';

    try {
      const deviceDocId = requireRouteIdentifier(req.params.deviceDocId, 'deviceDocId');

      const result = await runMysqlTransaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT * FROM license_devices WHERE firestore_doc_id = ? LIMIT 1 FOR UPDATE`,
          [deviceDocId]
        );
        const device = rows[0];

        if (!device) {
          throw makeApiError('Thiết bị không tồn tại hoặc đã bị xóa.', 404);
        }

        if (device.status === 'ACTIVE') {
          throw makeApiError(
            'Không thể xóa thiết bị ACTIVE. Vui lòng Thu hồi hoặc Khóa thiết bị trước.',
            409
          );
        }

        await connection.execute(
          `DELETE FROM license_devices WHERE firestore_doc_id = ?`,
          [deviceDocId]
        );

        const activeDeviceCount = device.license_doc_id
          ? await syncActiveDeviceCount(connection, device.license_doc_id)
          : null;

        return { deviceDocId, deleted: true, activeDeviceCount };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);

app.post(
  [
    '/api/admin/mysql/licenses/:licenseId/sync-device-count',
    '/VB/api/admin/mysql/licenses/:licenseId/sync-device-count',
  ],
  requireAdminAuth,
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Sync Active Device Count';

    try {
      const licenseId = requireRouteIdentifier(req.params.licenseId, 'licenseId');

      const result = await runMysqlTransaction(async (connection) => {
        const license = await getLockedLicenseByDocId(connection, licenseId);

        if (!license) {
          throw makeApiError('Hồ sơ bản quyền không tồn tại.', 404);
        }

        const activeDeviceCount = await syncActiveDeviceCount(
          connection,
          license.firestore_doc_id
        );

        return {
          licenseId,
          schoolId: license.school_id,
          activeDeviceCount,
          maxDevices: Number(license.max_devices || 15),
        };
      });

      res.json({ ok: true, service: serviceName, actedBy: req.adminUser?.email || null, ...result });
    } catch (error) {
      sendMysqlAdminCommandError(res, serviceName, error);
    }
  }
);


// ============================================================
// DOCX TO PDF
// ============================================================

async function handleConvert(req, res) {
  let workDir = '';

  try {
    if (!req.file) {
      res.status(400).send('Không nhận được file DOCX.');
      return;
    }

    const libreOfficePath = findLibreOfficeExecutable();

    if (!libreOfficePath) {
      res.status(500).send(
        [
          'Hosting chưa tìm thấy LibreOffice/soffice.',
          '',
          'Chức năng xuất PDF chỉ hoạt động khi máy chủ đã cài LibreOffice.',
          'Vui lòng liên hệ nhà cung cấp hosting hoặc chuyển PDF Helper sang VPS.',
        ].join('\n')
      );
      return;
    }

    const originalName = safeFileName(req.file.originalname || 'document.docx');
    const parsed = path.parse(originalName);

    const docxName =
      parsed.ext.toLowerCase() === '.docx'
        ? originalName
        : `${parsed.name || 'document'}.docx`;

    const jobId = getJobId();
    workDir = path.join(os.tmpdir(), `docformat-pdf-${jobId}`);

    const profileDir = path.join(workDir, 'lo-profile');

    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(profileDir, { recursive: true });

    const inputPath = path.join(workDir, docxName);
    fs.writeFileSync(inputPath, req.file.buffer);

    const profileUri = pathToFileURL(profileDir).href;

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

    await runLibreOffice(libreOfficePath, args);

    const expectedPdfPath = path.join(
      workDir,
      `${path.parse(docxName).name}.pdf`
    );

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
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(pdfName)}`
    );

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
          // Không dừng ứng dụng nếu việc dọn file tạm thất bại.
        }
      }, 5000);
    }
  }
}

app.post(
  [
    '/convert-to-pdf',
    '/api/convert-docx-to-pdf',
    '/VB/convert-to-pdf',
    '/VB/api/convert-docx-to-pdf',
  ],
  upload.single('file'),
  handleConvert
);

// ============================================================
// FRONTEND REACT / VITE BUILD
// ============================================================

function sendFrontendIndex(_req, res) {
  if (!fs.existsSync(INDEX_FILE)) {
    res
      .status(503)
      .type('text/plain')
      .send(
        [
          'docFormat Pro chưa có bản build giao diện.',
          'Không tìm thấy file dist/index.html trên hosting.',
          'Hãy chạy npm run build trên máy tính và tải thư mục dist lên ứng dụng.',
        ].join('\n')
      );
    return;
  }

  res.sendFile(INDEX_FILE);
}

if (fs.existsSync(DIST_DIR)) {
  /*
   * Passenger có thể chuyển request /VB/assets/... thành /assets/...
   * hoặc giữ nguyên đường dẫn /VB/assets/..., tùy cấu hình máy chủ.
   * Khai báo cả hai trường hợp để ứng dụng hoạt động ổn định.
   */
   // ============================================================
// docFormat Pro - MySQL Trial Usage API
// Quản lý 5 lượt dùng thử bằng MySQL thay vì localStorage
// ============================================================

const TRIAL_LIMIT = 5;

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }

  return String(req.socket?.remoteAddress || req.ip || '').slice(0, 64);
}

function normalizeTrialText(value, maxLength = 255) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  return text.slice(0, maxLength);
}

function normalizeTrialDeviceId(value) {
  const deviceId = normalizeTrialText(value, 191);

  if (!deviceId) {
    const error = new Error('Thiếu deviceId để kiểm tra dùng thử.');
    error.statusCode = 400;
    throw error;
  }

  return deviceId;
}

function buildTrialResponse(row) {
  if (!row) return null;

  return {
    id: row.id,

    // Dữ liệu cũ từ bảng trial_usage
    deviceId: row.device_id || row.first_device_id || null,
    schoolId: row.school_id || null,
    orgName: row.org_name || null,

    // Dữ liệu mới từ bảng trial_registrations
    phone: row.phone || null,
    zalo: row.zalo || null,
    contactName: row.contact_name || null,
    schoolName: row.school_name || null,
    registrationKey: row.registration_key || null,

    trialLimit: Number(row.trial_limit || TRIAL_LIMIT),
    trialUsed: Number(row.trial_used || 0),
    trialRemaining: Number(row.trial_remaining || 0),
    status: row.status || 'ACTIVE',

    firstUsedAt: row.first_used_at || null,
    lastUsedAt: row.last_used_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function ensureTrialUsageRecord(connectionOrPool, req) {
  const body = req.body || {};
  const deviceId = normalizeTrialDeviceId(body.deviceId || body.device_id);

  const schoolId = normalizeTrialText(body.schoolId || body.school_id, 191);
  const orgName = normalizeTrialText(body.orgName || body.org_name, 255);
  const browserFingerprint = normalizeTrialText(
    body.browserFingerprint || body.browser_fingerprint,
    255
  );
  const userAgent = normalizeTrialText(req.headers['user-agent'], 4000);
  const ipAddress = getRequestIp(req);

  await connectionOrPool.execute(
    `
      INSERT INTO trial_usage (
        device_id,
        school_id,
        org_name,
        trial_limit,
        trial_used,
        trial_remaining,
        status,
        browser_fingerprint,
        user_agent,
        ip_address,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 0, ?, 'ACTIVE', ?, ?, ?, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE
        school_id = COALESCE(VALUES(school_id), school_id),
        org_name = COALESCE(VALUES(org_name), org_name),
        browser_fingerprint = COALESCE(VALUES(browser_fingerprint), browser_fingerprint),
        user_agent = VALUES(user_agent),
        ip_address = VALUES(ip_address),
        updated_at = NOW(3)
    `,
    [
      deviceId,
      schoolId,
      orgName,
      TRIAL_LIMIT,
      TRIAL_LIMIT,
      browserFingerprint,
      userAgent,
      ipAddress,
    ]
  );

  const [rows] = await connectionOrPool.execute(
    `
      SELECT *
      FROM trial_usage
      WHERE device_id = ?
      LIMIT 1
    `,
    [deviceId]
  );

  return rows[0] || null;
}
async function ensureTrialRegistrationRecord(connectionOrPool, req) {
  const body = req.body || {};

  const phone = normalizeTrialText(body.phone || body.zalo || body.contactPhone || body.contact_phone, 50);
  const zalo = normalizeTrialText(body.zalo || body.phone || '', 50);
  const contactName = normalizeTrialText(body.contactName || body.contact_name, 255);
  const schoolName = normalizeTrialText(body.schoolName || body.school_name, 255);
  const registrationKey = normalizeTrialText(body.registrationKey || body.registration_key || phone, 191);

  const deviceId = normalizeTrialDeviceId(body.deviceId || body.device_id);
  const browserFingerprint = normalizeTrialText(
    body.browserFingerprint || body.browser_fingerprint,
    255
  );
  const userAgent = normalizeTrialText(req.headers['user-agent'], 4000);
  const ipAddress = getRequestIp(req);

  if (!phone) {
    const error = new Error('Vui lòng nhập số điện thoại/Zalo để đăng ký dùng thử.');
    error.statusCode = 400;
    throw error;
  }

  await connectionOrPool.execute(
    `
      INSERT INTO trial_registrations (
        phone,
        zalo,
        contact_name,
        school_name,
        registration_key,
        trial_limit,
        trial_used,
        trial_remaining,
        status,
        first_device_id,
        first_browser_fingerprint,
        first_ip_address,
        first_user_agent,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?, ?, ?, ?, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE
        zalo = COALESCE(VALUES(zalo), zalo),
        contact_name = COALESCE(VALUES(contact_name), contact_name),
        school_name = COALESCE(VALUES(school_name), school_name),
        registration_key = COALESCE(VALUES(registration_key), registration_key),
        first_device_id = COALESCE(first_device_id, VALUES(first_device_id)),
        first_browser_fingerprint = COALESCE(first_browser_fingerprint, VALUES(first_browser_fingerprint)),
        first_ip_address = COALESCE(first_ip_address, VALUES(first_ip_address)),
        first_user_agent = COALESCE(first_user_agent, VALUES(first_user_agent)),
        updated_at = NOW(3)
    `,
    [
      phone,
      zalo,
      contactName,
      schoolName,
      registrationKey,
      TRIAL_LIMIT,
      TRIAL_LIMIT,
      deviceId,
      browserFingerprint,
      ipAddress,
      userAgent,
    ]
  );

  const [rows] = await connectionOrPool.execute(
    `
      SELECT *
      FROM trial_registrations
      WHERE phone = ?
      LIMIT 1
    `,
    [phone]
  );

  return rows[0] || null;
}
app.post(
  ['/api/trial/status', '/VB/api/trial/status'],
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Trial Status';

    try {
      const pool = getDbPool();
      const row = await ensureTrialUsageRecord(pool, req);

      return res.json({
        ok: true,
        service: serviceName,
        trial: buildTrialResponse(row),
      });
    } catch (error) {
      console.error(`[${serviceName}]`, error);

      return res.status(error.statusCode || 500).json({
        ok: false,
        service: serviceName,
        error: error.message || 'Không kiểm tra được trạng thái dùng thử.',
      });
    }
  }
);

app.post(
  ['/api/trial/consume', '/VB/api/trial/consume'],
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Trial Consume';
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const row = await ensureTrialRegistrationRecord(connection, req);
      const phone = row.phone;

      const [lockedRows] = await connection.execute(
  `
    SELECT *
    FROM trial_registrations
    WHERE phone = ?
    LIMIT 1
    FOR UPDATE
  `,
  [phone]
);

      const current = lockedRows[0];

      if (!current) {
        const error = new Error('Không tìm thấy bản ghi dùng thử.');
        error.statusCode = 404;
        throw error;
      }

      if (current.status === 'BLOCKED') {
        const error = new Error('Thiết bị dùng thử này đã bị khóa.');
        error.statusCode = 403;
        throw error;
      }

      const trialLimit = Number(current.trial_limit || TRIAL_LIMIT);
      const trialUsed = Number(current.trial_used || 0);
      const trialRemaining = Number(current.trial_remaining || 0);

      if (
        current.status === 'EXHAUSTED' ||
        trialRemaining <= 0 ||
        trialUsed >= trialLimit
      ) {
        const error = new Error('Thiết bị đã hết lượt dùng thử.');
        error.statusCode = 403;
        throw error;
      }

      const nextUsed = trialUsed + 1;
      const nextRemaining = Math.max(trialLimit - nextUsed, 0);
      const nextStatus = nextRemaining <= 0 ? 'EXHAUSTED' : 'ACTIVE';

      await connection.execute(
  `
    UPDATE trial_registrations
    SET
      trial_used = ?,
      trial_remaining = ?,
      status = ?,
      first_used_at = COALESCE(first_used_at, NOW(3)),
      last_used_at = NOW(3),
      updated_at = NOW(3)
    WHERE phone = ?
  `,
  [nextUsed, nextRemaining, nextStatus, phone]
);

      const [updatedRows] = await connection.execute(
  `
    SELECT *
    FROM trial_registrations
    WHERE phone = ?
    LIMIT 1
  `,
  [phone]
);

      await connection.commit();

      return res.json({
        ok: true,
        service: serviceName,
        consumed: true,
        trial: buildTrialResponse(updatedRows[0]),
      });
    } catch (error) {
      await connection.rollback();

      console.error(`[${serviceName}]`, error);

      return res.status(error.statusCode || 500).json({
        ok: false,
        service: serviceName,
        error: error.message || 'Không ghi nhận được lượt dùng thử.',
      });
    } finally {
      connection.release();
    }
  }
);

app.post(
  ['/api/trial/reset-test', '/VB/api/trial/reset-test'],
  async (req, res) => {
    const serviceName = 'docFormat Pro MySQL Trial Reset Test';

    try {
      const body = req.body || {};
      const deviceId = normalizeTrialDeviceId(body.deviceId || body.device_id);

      if (!deviceId.startsWith('MYSQL_TRIAL_TEST_')) {
        return res.status(400).json({
          ok: false,
          service: serviceName,
          error: 'Chỉ được reset thiết bị kiểm thử có tiền tố MYSQL_TRIAL_TEST_.',
        });
      }

      const pool = getDbPool();

      await pool.execute(
        `
          DELETE FROM trial_usage
          WHERE device_id = ?
        `,
        [deviceId]
      );

      return res.json({
        ok: true,
        service: serviceName,
        deletedDeviceId: deviceId,
      });
    } catch (error) {
      console.error(`[${serviceName}]`, error);

      return res.status(error.statusCode || 500).json({
        ok: false,
        service: serviceName,
        error: error.message || 'Không reset được dữ liệu dùng thử kiểm thử.',
      });
    }
  }
);
  app.use(express.static(DIST_DIR));
  app.use('/VB', express.static(DIST_DIR));
}

app.get(['/', '/VB', '/VB/'], sendFrontendIndex);

/*
 * Hỗ trợ các đường dẫn giao diện React.
 * Không áp dụng cho API hoặc request không phải GET.
 */
// ============================================================
// Middleware support React frontend (GET only)
// Trả index.html cho các route React như /VB/admin, /VB/admin-login.
// Không áp dụng cho API hoặc file tĩnh.
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/VB/api/') ||
    req.path.includes('.')
  ) {
    next();
    return;
  }

  sendFrontendIndex(req, res);
});

// --- Route POST trial_registrations ---
app.post('/VB/api/trial_registrations', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('Received trial registration payload:', payload);

    const phone = String(payload.phone || '').trim();
    const zalo = String(payload.zalo || '').trim();
    const contactName = String(payload.contact_name || '').trim();
    const schoolName = String(payload.school_name || '').trim();

    if (!phone) {
      return res.status(400).json({
        ok: false,
        message: 'Vui lòng nhập Số điện thoại / Zalo.',
      });
    }

    const registrationKey = phone;
    const trialLimit = 5;
    const trialUsed = 0;
    const trialRemaining = 5;
    const status = 'ACTIVE';

    const pool = require('./db.cjs').promise();

    const [result] = await pool.execute(
      `
        INSERT INTO trial_registrations
          (
            phone,
            zalo,
            contact_name,
            school_name,
            registration_key,
            trial_limit,
            trial_used,
            trial_remaining,
            status,
            created_at,
            updated_at
          )
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        phone,
        zalo,
        contactName,
        schoolName,
        registrationKey,
        trialLimit,
        trialUsed,
        trialRemaining,
        status,
      ]
    );

    return res.json({
      ok: true,
      message: 'Đăng ký dùng thử / bản quyền thành công.',
      id: result.insertId,
      trial: {
        phone,
        contact_name: contactName,
        school_name: schoolName,
        registration_key: registrationKey,
        trial_limit: trialLimit,
        trial_used: trialUsed,
        trial_remaining: trialRemaining,
        status,
      },
    });
  } catch (error) {
    console.error('[trial_registrations insert failed]', error);

    return res.status(500).json({
      ok: false,
      message: error.message || 'Không lưu được đăng ký dùng thử.',
    });
  }
});

// Khai báo apiPaths (không chặn route trial_registrations)
const apiPaths = [
  '/convert-to-pdf',
  '/api/convert-docx-to-pdf',
  '/VB/health',
  '/VB/api/health',
  '/VB/api/version',
  '/VB/convert-to-pdf',
  '/VB/api/convert-docx-to-pdf',
  '/VB/api/trial_registrations',
];

// Middleware check apiPaths
app.use((req, res, next) => {
  if (apiPaths.includes(req.path) || req.path.startsWith('/api/')) {
    next();
    return;
  }
  sendFrontendIndex(req, res);
});

// ERROR HANDLER
app.use((error, _req, res, _next) => {
  console.error('Server error:', error);
  if (!res.headersSent) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  const libreOfficePath = findLibreOfficeExecutable();

  console.log('');
  console.log('============================================================');
  console.log(` docFormat Pro Web App + PDF Helper v${HELPER_VERSION}`);
  console.log('============================================================');
  console.log(` Port: ${PORT}`);
  console.log(` Frontend build: ${fs.existsSync(INDEX_FILE) ? 'FOUND' : 'NOT FOUND'}`);
  console.log(` LibreOffice: ${libreOfficePath || 'NOT FOUND'}`);
  console.log(' Endpoints:');
  console.log(' - GET  /health');
  console.log(' - POST /convert-to-pdf');
  console.log(' - POST /VB/api/trial_registrations');
  console.log('============================================================');
  console.log('');
});