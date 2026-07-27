// File: server/ai/providers/openaiProvider.cjs

const {
  requestJson,
} = require('./providerHttpClient.cjs');
const {
  filterModels,
} = require('../aiModelPolicy.cjs');

const PROVIDER = 'openai';

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
  if (statusCode === 401) {
    return createFailure(
      'AI_KEY_INVALID',
      'OpenAI API Key không hợp lệ hoặc đã bị thu hồi.',
      statusCode
    );
  }

  if (statusCode === 403) {
    return createFailure(
      'AI_KEY_RESTRICTED',
      'OpenAI API Key không có quyền truy cập cần thiết.',
      statusCode
    );
  }

  if (statusCode === 429) {
    return createFailure(
      'AI_RATE_LIMITED',
      'OpenAI đang giới hạn yêu cầu hoặc tài khoản đã hết hạn mức.',
      statusCode
    );
  }

  if (statusCode >= 500) {
    return createFailure(
      'AI_PROVIDER_UNAVAILABLE',
      'Dịch vụ OpenAI đang tạm thời không khả dụng.',
      statusCode
    );
  }

  return createFailure(
    'AI_PROVIDER_REJECTED',
    'OpenAI từ chối yêu cầu kiểm tra API Key.',
    statusCode
  );
}

async function validateKey(apiKey) {
  const normalizedApiKey = String(
    apiKey || ''
  ).trim();

  if (!normalizedApiKey) {
    return createFailure(
      'AI_KEY_REQUIRED',
      'OpenAI API Key không được để trống.'
    );
  }

  let response;

  try {
    response = await requestJson({
      hostname: 'api.openai.com',
      path: '/v1/models',
      headers: {
        Authorization:
          `Bearer ${normalizedApiKey}`,
      },
    });
  } catch (error) {
    return createFailure(
      error && error.code
        ? error.code
        : 'AI_PROVIDER_NETWORK_ERROR',

      error && error.message
        ? error.message
        : 'Không thể kết nối đến OpenAI.'
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
    !Array.isArray(response.body.data)
  ) {
    return createFailure(
      'AI_PROVIDER_INVALID_RESPONSE',
      'OpenAI trả về dữ liệu không đúng định dạng.',
      response.statusCode
    );
  }

  const providerModels = response.body.data
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        item.id.trim().length > 0
    )
    .map((item) => ({
      id: item.id.trim(),
      displayName: item.id.trim(),
    }))
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
      'OpenAI API Key hợp lệ.',
    providerStatus:
      response.statusCode,
  };
}

module.exports = {
  id: PROVIDER,
  validateKey,
};