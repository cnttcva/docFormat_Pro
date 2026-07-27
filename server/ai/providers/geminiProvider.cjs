// File: server/ai/providers/geminiProvider.cjs

const {
  requestJson,
} = require('./providerHttpClient.cjs');
const {
  filterModels,
} = require('../aiModelPolicy.cjs');

const PROVIDER = 'gemini';

function createFailure(
  errorCode,
  message,
  providerStatus = null
) {
  return {
    valid: false,
    provider: PROVIDER,
    models: [],
    errorCode,
    message,
    providerStatus,
  };
}

function mapHttpFailure(statusCode) {
  if (
    statusCode === 400 ||
    statusCode === 401
  ) {
    return createFailure(
      'AI_KEY_INVALID',
      'Gemini API Key không hợp lệ hoặc không được API chấp nhận.',
      statusCode
    );
  }

  if (statusCode === 403) {
    return createFailure(
      'AI_KEY_RESTRICTED',
      'Gemini API Key bị giới hạn hoặc không có quyền truy cập cần thiết.',
      statusCode
    );
  }

  if (statusCode === 429) {
    return createFailure(
      'AI_RATE_LIMITED',
      'Gemini đang giới hạn yêu cầu hoặc dự án đã hết hạn mức.',
      statusCode
    );
  }

  if (statusCode >= 500) {
    return createFailure(
      'AI_PROVIDER_UNAVAILABLE',
      'Dịch vụ Gemini đang tạm thời không khả dụng.',
      statusCode
    );
  }

  return createFailure(
    'AI_PROVIDER_REJECTED',
    'Gemini từ chối yêu cầu kiểm tra API Key.',
    statusCode
  );
}

function getSupportedMethods(model) {
  if (
    Array.isArray(
      model.supportedGenerationMethods
    )
  ) {
    return (
      model.supportedGenerationMethods
    );
  }

  if (
    Array.isArray(
      model.supportedActions
    )
  ) {
    return model.supportedActions;
  }

  return [];
}

async function validateKey(apiKey) {
  const normalizedApiKey = String(
    apiKey || ''
  ).trim();

  if (!normalizedApiKey) {
    return createFailure(
      'AI_KEY_REQUIRED',
      'Gemini API Key không được để trống.'
    );
  }

  let response;

  try {
    response = await requestJson({
      hostname:
        'generativelanguage.googleapis.com',

      path:
        '/v1beta/models?pageSize=1000',

      headers: {
        'x-goog-api-key':
          normalizedApiKey,
      },
    });
  } catch (error) {
    return createFailure(
      error && error.code
        ? error.code
        : 'AI_PROVIDER_NETWORK_ERROR',

      error && error.message
        ? error.message
        : 'Không thể kết nối đến Gemini.'
    );
  }

  if (response.statusCode !== 200) {
    return mapHttpFailure(
      response.statusCode
    );
  }

  if (
    response.jsonParseFailed ||
    !response.body ||
    !Array.isArray(
      response.body.models
    )
  ) {
    return createFailure(
      'AI_PROVIDER_INVALID_RESPONSE',
      'Gemini trả về dữ liệu không đúng định dạng.',
      response.statusCode
    );
  }

  const providerModels = response.body.models
    .filter((model) => {
      if (
        !model ||
        typeof model !== 'object'
      ) {
        return false;
      }

      return getSupportedMethods(
        model
      ).includes('generateContent');
    })
    .map((model) => {
      const rawName =
        typeof model.baseModelId ===
          'string' &&
        model.baseModelId.trim()
          ? model.baseModelId.trim()
          : String(model.name || '')
              .replace(/^models\//, '')
              .trim();

      return {
        id: rawName,

        displayName:
          typeof model.displayName ===
            'string' &&
          model.displayName.trim()
            ? model.displayName.trim()
            : rawName,

        inputTokenLimit:
          Number.isFinite(
            model.inputTokenLimit
          )
            ? model.inputTokenLimit
            : null,

        outputTokenLimit:
          Number.isFinite(
            model.outputTokenLimit
          )
            ? model.outputTokenLimit
            : null,
      };
    })
    .filter(
      (model) =>
        model.id.length > 0
    )
    .sort((left, right) =>
      left.id.localeCompare(right.id)
    );

  const models = filterModels({
    provider: PROVIDER,
    models: providerModels,
  });

  return {
    valid: true,
    provider: PROVIDER,
    models,
    errorCode: null,
    message:
      'Gemini API Key hợp lệ.',
    providerStatus:
      response.statusCode,
  };
}

module.exports = {
  id: PROVIDER,
  validateKey,
};