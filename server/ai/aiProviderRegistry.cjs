// File: server/ai/aiProviderRegistry.cjs

const openaiProvider =
  require(
    './providers/openaiProvider.cjs'
  );

const geminiProvider =
  require(
    './providers/geminiProvider.cjs'
  );

const providerMap = new Map([
  [
    openaiProvider.id,
    openaiProvider,
  ],
  [
    geminiProvider.id,
    geminiProvider,
  ],
]);

const supportedProviders =
  Object.freeze(
    Array.from(providerMap.keys())
  );

function normalizeProviderId(provider) {
  return String(provider || '')
    .trim()
    .toLowerCase();
}

function getSupportedProviders() {
  return [...supportedProviders];
}

function getProvider(provider) {
  const providerId =
    normalizeProviderId(provider);

  return (
    providerMap.get(providerId) ||
    null
  );
}

async function validateProviderKey({
  provider,
  apiKey,
}) {
  const providerId =
    normalizeProviderId(provider);

  const adapter =
    getProvider(providerId);

  if (!adapter) {
    return {
      valid: false,
      provider:
        providerId || null,
      models: [],
      errorCode:
        'AI_PROVIDER_UNSUPPORTED',
      message:
        'Nhà cung cấp AI không được hỗ trợ.',
      providerStatus: null,
    };
  }

  return adapter.validateKey(apiKey);
}

module.exports = {
  getSupportedProviders,
  getProvider,
  validateProviderKey,
};