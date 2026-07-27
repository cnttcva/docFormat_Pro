// File: server/ai/aiRouter.cjs
// Module backend độc lập cho Trợ lý Văn phòng AI.
//
// Nguyên tắc:
// - Không import bất kỳ module xử lý DOCX nào.
// - Không can thiệp School, Department hoặc Party.
// - Không xử lý hoặc lưu API Key ở bước khởi tạo này.
// - Toàn bộ chức năng AI mặc định bị tắt bằng feature flag.

const express = require('express');
const {
  getSupportedProviders,
  validateProviderKey,
} = require(
  './aiProviderRegistry.cjs'
);

const {
  createSession,
  readSession,
  deleteSession,
} = require(
  './aiSessionVault.cjs'
);
const aiRouter = express.Router();

const AI_SESSION_COOKIE_NAME =
  'docformatpro_ai_sid';

const DEFAULT_ABSOLUTE_TTL_MS =
  8 * 60 * 60 * 1000;

const MAX_API_KEY_LENGTH = 4096;
const MAX_UNIT_ID_LENGTH = 191;

const SUPPORTED_PROVIDERS =
  Object.freeze(
    getSupportedProviders()
  );

/**
 * Chức năng AI chỉ được bật khi biến môi trường
 * AI_ASSISTANT_ENABLED có giá trị chính xác là "true".
 *
 * Mặc định luôn trả về false để bảo đảm an toàn
 * khi chưa cấu hình hoặc khi triển khai nhầm file.
 */
function isAiAssistantEnabled() {
  return (
    String(
      process.env.AI_ASSISTANT_ENABLED || 'false'
    )
      .trim()
      .toLowerCase() === 'true'
  );
}
function toPositiveInteger(
  value,
  fallbackValue
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallbackValue;
  }

  return Math.floor(parsed);
}

function isSessionCookieSecure() {
  return (
    String(
      process.env
        .AI_SESSION_COOKIE_SECURE ||
        'false'
    )
      .trim()
      .toLowerCase() === 'true'
  );
}

function getSessionCookieMaxAgeSeconds() {
  const absoluteTtlMs =
    toPositiveInteger(
      process.env
        .AI_SESSION_ABSOLUTE_TTL_MS,
      DEFAULT_ABSOLUTE_TTL_MS
    );

  return Math.max(
    1,
    Math.floor(absoluteTtlMs / 1000)
  );
}

function serializeSessionCookie(
  sessionId
) {
  const parts = [
    `${AI_SESSION_COOKIE_NAME}=${encodeURIComponent(
      sessionId
    )}`,
    'Path=/VB/api/ai',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${getSessionCookieMaxAgeSeconds()}`,
  ];

  if (isSessionCookieSecure()) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function serializeClearedSessionCookie() {
  const parts = [
    `${AI_SESSION_COOKIE_NAME}=`,
    'Path=/VB/api/ai',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (isSessionCookieSecure()) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function readCookie(req, cookieName) {
  const cookieHeader = String(
    req.headers.cookie || ''
  );

  if (!cookieHeader) {
    return null;
  }

  const cookieParts =
    cookieHeader.split(';');

  for (const cookiePart of cookieParts) {
    const separatorIndex =
      cookiePart.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const name = cookiePart
      .slice(0, separatorIndex)
      .trim();

    if (name !== cookieName) {
      continue;
    }

    const rawValue = cookiePart
      .slice(separatorIndex + 1)
      .trim();

    try {
      return decodeURIComponent(rawValue);
    } catch (_error) {
      return rawValue;
    }
  }

  return null;
}

function getSessionIdFromRequest(req) {
  const sessionId = readCookie(
    req,
    AI_SESSION_COOKIE_NAME
  );

  if (
    typeof sessionId !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(sessionId)
  ) {
    return null;
  }

  return sessionId;
}

function setNoStore(res) {
  res.setHeader(
    'Cache-Control',
    'no-store, max-age=0'
  );

  res.setHeader(
    'Pragma',
    'no-cache'
  );
}

function normalizeProviderId(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeUnitId(value) {
  return String(value || '').trim();
}

function validateConnectPayload(body) {
  const safeBody =
    body &&
    typeof body === 'object' &&
    !Array.isArray(body)
      ? body
      : {};

  const provider =
    normalizeProviderId(
      safeBody.provider
    );

  const apiKey = String(
    safeBody.apiKey || ''
  ).trim();

  const unitId = normalizeUnitId(
    safeBody.unitId ||
      safeBody.schoolId
  );

  if (
    !SUPPORTED_PROVIDERS.includes(
      provider
    )
  ) {
    return {
      ok: false,
      errorCode:
        'AI_PROVIDER_UNSUPPORTED',
      message:
        'Nhà cung cấp AI không được hỗ trợ.',
    };
  }

  if (!apiKey) {
    return {
      ok: false,
      errorCode: 'AI_KEY_REQUIRED',
      message:
        'API Key không được để trống.',
    };
  }

  if (
    apiKey.length >
    MAX_API_KEY_LENGTH
  ) {
    return {
      ok: false,
      errorCode:
        'AI_KEY_TOO_LONG',
      message:
        'API Key vượt quá giới hạn cho phép.',
    };
  }

  if (!unitId) {
    return {
      ok: false,
      errorCode:
        'AI_UNIT_ID_REQUIRED',
      message:
        'Thiếu mã định danh đơn vị.',
    };
  }

  if (
    unitId.length >
    MAX_UNIT_ID_LENGTH
  ) {
    return {
      ok: false,
      errorCode:
        'AI_UNIT_ID_TOO_LONG',
      message:
        'Mã định danh đơn vị vượt quá giới hạn cho phép.',
    };
  }

  return {
    ok: true,
    provider,
    apiKey,
    unitId,
  };
}

function mapProviderFailureStatus(
  errorCode
) {
  switch (errorCode) {
    case 'AI_KEY_REQUIRED':
    case 'AI_PROVIDER_UNSUPPORTED':
      return 400;

    case 'AI_KEY_INVALID':
      return 401;

    case 'AI_KEY_RESTRICTED':
      return 403;

    case 'AI_RATE_LIMITED':
      return 429;

    case 'AI_PROVIDER_TIMEOUT':
    case 'AI_PROVIDER_NETWORK_ERROR':
    case 'AI_PROVIDER_UNAVAILABLE':
      return 503;

    default:
      return 502;
  }
}

function sendSessionConfigurationError(
  res,
  error
) {
  const isConfigurationError =
    error &&
    error.code ===
      'AI_SESSION_CONFIGURATION_ERROR';

  return res
    .status(
      isConfigurationError
        ? 500
        : 500
    )
    .json({
      ok: false,
      connected: false,
      errorCode:
        isConfigurationError
          ? 'AI_SESSION_CONFIGURATION_ERROR'
          : 'AI_SESSION_INTERNAL_ERROR',
      message:
        isConfigurationError
          ? 'Máy chủ chưa được cấu hình khóa mã hóa phiên AI hợp lệ.'
          : 'Không thể tạo hoặc đọc phiên AI.',
    });
}

/**
 * Endpoint trạng thái luôn được phép truy cập,
 * kể cả khi chức năng AI đang bị tắt.
 *
 * Endpoint đầy đủ sau khi router được mount:
 * GET /VB/api/ai/status
 */
aiRouter.get('/status', (_req, res) => {
  res.status(200).json({
    ok: true,
    module: 'docformatpro-ai-assistant',
    stage: 'phase-1-session-api',
    enabled: isAiAssistantEnabled(),
    supportedProviders: SUPPORTED_PROVIDERS,
  });
});

/**
 * Khóa tất cả endpoint AI còn lại khi feature flag
 * chưa được bật.
 *
 * Middleware này chỉ áp dụng bên trong aiRouter,
 * không tác động đến API hoặc chức năng khác.
 */
aiRouter.use((_req, res, next) => {
  if (isAiAssistantEnabled()) {
    next();
    return;
  }

  res.status(503).json({
    ok: false,
    errorCode: 'AI_ASSISTANT_DISABLED',
    message:
      'Module Trợ lý Văn phòng AI hiện chưa được kích hoạt.',
  });
});
/**
 * Kết nối nhà cung cấp AI.
 *
 * API Key chỉ được đưa vào kho phiên sau khi
 * nhà cung cấp xác nhận khóa hợp lệ.
 */
aiRouter.post('/session/connect', async (req, res) => {
  setNoStore(res);

  const input = validateConnectPayload(req.body);

  if (!input.ok) {
    return res.status(400).json({
      ok: false,
      connected: false,
      errorCode: input.errorCode,
      message: input.message,
    });
  }

  const validation = await validateProviderKey({
    provider: input.provider,
    apiKey: input.apiKey,
  });

  if (!validation.valid) {
    return res
      .status(
        mapProviderFailureStatus(
          validation.errorCode
        )
      )
      .json({
        ok: false,
        connected: false,
        provider: validation.provider,
        errorCode: validation.errorCode,
        message: validation.message,
      });
  }

  try {
    const existingSessionId =
      getSessionIdFromRequest(req);

    const newSession = createSession({
      provider: input.provider,
      apiKey: input.apiKey,
      unitId: input.unitId,
    });

    // Chỉ xóa phiên cũ sau khi phiên mới
    // đã được tạo thành công.
    if (existingSessionId) {
      deleteSession(existingSessionId);
    }

    res.setHeader(
      'Set-Cookie',
      serializeSessionCookie(
        newSession.sessionId
      )
    );
    setNoStore(res);
    return res.status(200).json({
      ok: true,
      connected: true,
      provider: newSession.provider,
      unitId: newSession.unitId,
      expiresAt: newSession.expiresAt,
      absoluteExpiresAt:
        newSession.absoluteExpiresAt,
      modelCount: validation.models.length,
      models: validation.models,
      message: validation.message,
    });
  } catch (error) {
    return sendSessionConfigurationError(
      res,
      error
    );
  }
});

/**
 * Kiểm tra trạng thái phiên AI hiện tại.
 *
 * Response tuyệt đối không chứa API Key
 * hoặc session ID.
 */
aiRouter.get('/session/status', (req, res) => {
  setNoStore(res);

  const sessionId =
    getSessionIdFromRequest(req);

  if (!sessionId) {
    return res.status(200).json({
      ok: true,
      connected: false,
      provider: null,
    });
  }

  try {
    const session =
      readSession(sessionId);

    if (!session) {
      res.setHeader(
        'Set-Cookie',
        serializeClearedSessionCookie()
      );

      return res.status(200).json({
        ok: true,
        connected: false,
        provider: null,
      });
    }

    return res.status(200).json({
      ok: true,
      connected: true,
      provider: session.provider,
      unitId: session.unitId,
      createdAt: session.createdAt,
      lastAccessAt: session.lastAccessAt,
      expiresAt: session.expiresAt,
      absoluteExpiresAt:
        session.absoluteExpiresAt,
    });
  } catch (error) {
    deleteSession(sessionId);

    res.setHeader(
      'Set-Cookie',
      serializeClearedSessionCookie()
    );

    if (
      error &&
      error.code ===
        'AI_SESSION_CONFIGURATION_ERROR'
    ) {
      return sendSessionConfigurationError(
        res,
        error
      );
    }

    return res.status(401).json({
      ok: false,
      connected: false,
      errorCode:
        'AI_SESSION_INVALIDATED',
      message:
        'Phiên AI không còn hợp lệ. Vui lòng kết nối lại.',
    });
  }
});

/**
 * Ngắt kết nối AI.
 *
 * Endpoint mang tính idempotent:
 * gọi nhiều lần vẫn trả về thành công.
 */
aiRouter.delete('/session', (req, res) => {
  setNoStore(res);

  const sessionId =
    getSessionIdFromRequest(req);

  if (sessionId) {
    deleteSession(sessionId);
  }

  res.setHeader(
    'Set-Cookie',
    serializeClearedSessionCookie()
  );

  return res.status(200).json({
    ok: true,
    connected: false,
    message:
      'Đã ngắt kết nối và xóa API Key khỏi phiên máy chủ.',
  });
});

/**
 * Không để các URL AI không tồn tại rơi xuống
 * middleware phục vụ frontend React.
 */
aiRouter.use((_req, res) => {
  setNoStore(res);

  return res.status(404).json({
    ok: false,
    errorCode: 'AI_ENDPOINT_NOT_FOUND',
    message:
      'Không tìm thấy endpoint AI được yêu cầu.',
  });
});
module.exports = aiRouter;