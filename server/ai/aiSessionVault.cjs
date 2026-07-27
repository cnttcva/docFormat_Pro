// File: server/ai/aiSessionVault.cjs
//
// Kho API Key theo phiên dành riêng cho Module AI.
// Không lưu API Key vào MySQL, cookie hoặc trình duyệt.

const crypto = require('crypto');

const SUPPORTED_PROVIDERS = new Set([
  'openai',
  'gemini',
]);

function toPositiveInteger(value, fallbackValue) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return Math.floor(parsed);
}

// Hết hạn khi không hoạt động: mặc định 60 phút.
const IDLE_TTL_MS = toPositiveInteger(
  process.env.AI_SESSION_IDLE_TTL_MS,
  60 * 60 * 1000
);

// Thời hạn tuyệt đối: mặc định 8 giờ.
const ABSOLUTE_TTL_MS = toPositiveInteger(
  process.env.AI_SESSION_ABSOLUTE_TTL_MS,
  8 * 60 * 60 * 1000
);

// Chu kỳ dọn phiên hết hạn: mặc định 5 phút.
const CLEANUP_INTERVAL_MS = toPositiveInteger(
  process.env.AI_SESSION_CLEANUP_INTERVAL_MS,
  5 * 60 * 1000
);

// Map chỉ lưu session hash và API Key đã mã hóa.
const sessionStore = new Map();

function createConfigurationError(message) {
  const error = new Error(message);
  error.code = 'AI_SESSION_CONFIGURATION_ERROR';
  return error;
}

/**
 * Đọc khóa mã hóa tổng từ biến môi trường.
 *
 * Khóa phải gồm 64 ký tự hexadecimal,
 * tương ứng 32 byte dành cho AES-256.
 *
 * Hàm chỉ được gọi khi thực sự tạo hoặc đọc phiên,
 * vì vậy chưa cấu hình key sẽ không làm server hiện tại lỗi.
 */
function getEncryptionKey() {
  const rawKey = String(
    process.env.AI_SESSION_ENCRYPTION_KEY || ''
  ).trim();

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw createConfigurationError(
      'AI_SESSION_ENCRYPTION_KEY phải gồm đúng 64 ký tự hexadecimal.'
    );
  }

  return Buffer.from(rawKey, 'hex');
}

/**
 * Không dùng session ID thô làm khóa của Map.
 */
function hashSessionId(sessionId) {
  return crypto
    .createHash('sha256')
    .update(String(sessionId), 'utf8')
    .digest('hex');
}

/**
 * Ràng buộc bản mã với đúng nhà cung cấp và đơn vị.
 */
function buildAdditionalAuthenticatedData(
  provider,
  unitId
) {
  return Buffer.from(
    `${provider}\n${unitId}`,
    'utf8'
  );
}

function encryptApiKey(apiKey, provider, unitId) {
  const encryptionKey = getEncryptionKey();

  // IV 12 byte ngẫu nhiên cho AES-GCM.
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    encryptionKey,
    iv,
    {
      authTagLength: 16,
    }
  );

  cipher.setAAD(
    buildAdditionalAuthenticatedData(
      provider,
      unitId
    )
  );

  const encrypted = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher
      .getAuthTag()
      .toString('base64'),
  };
}

function decryptApiKey(record) {
  const encryptionKey = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(record.iv, 'base64'),
    {
      authTagLength: 16,
    }
  );

  decipher.setAAD(
    buildAdditionalAuthenticatedData(
      record.provider,
      record.unitId
    )
  );

  decipher.setAuthTag(
    Buffer.from(record.authTag, 'base64')
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(
        record.ciphertext,
        'base64'
      )
    ),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function validateCreateSessionInput({
  provider,
  apiKey,
  unitId,
}) {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new TypeError(
      'Nhà cung cấp AI không được hỗ trợ.'
    );
  }

  if (
    typeof apiKey !== 'string' ||
    apiKey.trim().length === 0
  ) {
    throw new TypeError(
      'API Key không được để trống.'
    );
  }

  if (
    typeof unitId !== 'string' ||
    unitId.trim().length === 0
  ) {
    throw new TypeError(
      'Mã đơn vị không được để trống.'
    );
  }
}

function calculateEffectiveExpiresAt(record) {
  return Math.min(
    record.idleExpiresAt,
    record.absoluteExpiresAt
  );
}

function isExpired(
  record,
  now = Date.now()
) {
  return (
    calculateEffectiveExpiresAt(record) <= now
  );
}

/**
 * Tạo phiên AI mới.
 *
 * Giá trị sessionId được trả về để router đặt vào
 * cookie HttpOnly trong bước triển khai tiếp theo.
 */
function createSession({
  provider,
  apiKey,
  unitId,
}) {
  validateCreateSessionInput({
    provider,
    apiKey,
    unitId,
  });

  const normalizedUnitId = unitId.trim();
  const now = Date.now();

  const sessionId = crypto
    .randomBytes(32)
    .toString('hex');

  const sessionHash = hashSessionId(sessionId);

  const encryptedSecret = encryptApiKey(
    apiKey.trim(),
    provider,
    normalizedUnitId
  );

  const record = {
    provider,
    unitId: normalizedUnitId,

    ...encryptedSecret,

    createdAt: now,
    lastAccessAt: now,
    idleExpiresAt: now + IDLE_TTL_MS,
    absoluteExpiresAt:
      now + ABSOLUTE_TTL_MS,
  };

  sessionStore.set(
    sessionHash,
    record
  );

  return {
    sessionId,
    provider,
    unitId: normalizedUnitId,

    expiresAt: new Date(
      calculateEffectiveExpiresAt(record)
    ).toISOString(),

    absoluteExpiresAt: new Date(
      record.absoluteExpiresAt
    ).toISOString(),
  };
}

/**
 * Đọc phiên và giải mã API Key để backend gọi
 * OpenAI hoặc Gemini.
 *
 * API Key giải mã không được gửi về frontend.
 */
function readSession(sessionId) {
  if (
    typeof sessionId !== 'string' ||
    sessionId.length === 0
  ) {
    return null;
  }

  const sessionHash =
    hashSessionId(sessionId);

  const record =
    sessionStore.get(sessionHash);

  if (!record) {
    return null;
  }

  const now = Date.now();

  if (isExpired(record, now)) {
    sessionStore.delete(sessionHash);
    return null;
  }

  const apiKey = decryptApiKey(record);

  record.lastAccessAt = now;

  record.idleExpiresAt = Math.min(
    now + IDLE_TTL_MS,
    record.absoluteExpiresAt
  );

  return {
    provider: record.provider,
    unitId: record.unitId,
    apiKey,

    createdAt: new Date(
      record.createdAt
    ).toISOString(),

    lastAccessAt: new Date(
      record.lastAccessAt
    ).toISOString(),

    expiresAt: new Date(
      calculateEffectiveExpiresAt(record)
    ).toISOString(),

    absoluteExpiresAt: new Date(
      record.absoluteExpiresAt
    ).toISOString(),
  };
}

/**
 * Xóa một phiên khi ngắt kết nối hoặc đăng xuất.
 */
function deleteSession(sessionId) {
  if (
    typeof sessionId !== 'string' ||
    sessionId.length === 0
  ) {
    return false;
  }

  return sessionStore.delete(
    hashSessionId(sessionId)
  );
}

/**
 * Dọn các phiên đã hết hạn.
 */
function cleanupExpiredSessions(
  now = Date.now()
) {
  let removedCount = 0;

  for (
    const [sessionHash, record]
    of sessionStore
  ) {
    if (isExpired(record, now)) {
      sessionStore.delete(sessionHash);
      removedCount += 1;
    }
  }

  return removedCount;
}

/**
 * Dùng khi dừng server hoặc cần vô hiệu hóa
 * toàn bộ phiên AI.
 */
function clearAllSessions() {
  const removedCount = sessionStore.size;

  sessionStore.clear();

  return removedCount;
}

function getActiveSessionCount() {
  cleanupExpiredSessions();
  return sessionStore.size;
}

const cleanupTimer = setInterval(
  cleanupExpiredSessions,
  CLEANUP_INTERVAL_MS
);

// Không để timer này giữ tiến trình Node.js sống
// khi server đang dừng.
if (
  typeof cleanupTimer.unref === 'function'
) {
  cleanupTimer.unref();
}

function stopCleanupTimer() {
  clearInterval(cleanupTimer);
}

module.exports = {
  createSession,
  readSession,
  deleteSession,
  cleanupExpiredSessions,
  clearAllSessions,
  getActiveSessionCount,
  stopCleanupTimer,
};