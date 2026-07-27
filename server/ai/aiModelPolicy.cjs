// File: server/ai/aiModelPolicy.cjs
//
// Chính sách lựa chọn model cho Trợ lý Văn phòng AI.
//
// Nguyên tắc:
// - Chỉ hiển thị model phù hợp với sinh văn bản.
// - Mặc định loại preview, latest và experimental.
// - Không import hoặc gọi bất kỳ logic DOCX nào.
// - Danh sách model thực tế luôn phụ thuộc API Key của đơn vị.

const SUPPORTED_PROVIDERS = new Set([
  'openai',
  'gemini',
]);

const DEFAULT_MAX_VISIBLE_MODELS = 12;

const MODEL_TIERS = Object.freeze({
  ECONOMY: 'economy',
  BALANCED: 'balanced',
  QUALITY: 'quality',
});

const MODEL_STABILITIES = Object.freeze({
  STABLE: 'stable',
  PREVIEW: 'preview',
  LATEST: 'latest',
  EXPERIMENTAL: 'experimental',
});

const BLOCKED_MODEL_PATTERNS = Object.freeze({
  openai: [
    /audio/i,
    /realtime/i,
    /transcri(?:be|ption)/i,
    /speech/i,
    /tts/i,
    /image/i,
    /embedding/i,
    /moderation/i,
    /search/i,
    /computer/i,
    /codex/i,
  ],

  gemini: [
    /audio/i,
    /live/i,
    /tts/i,
    /speech/i,
    /image/i,
    /imagen/i,
    /embedding/i,
    /robotics/i,
    /computer[-_ ]?use/i,
    /deep[-_ ]?research/i,
    /veo/i,
    /lyria/i,
    /banana/i,
    /omni/i,
    /translate/i,
  ],
});

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

function readBooleanEnvironment(
  name,
  fallbackValue = false
) {
  const rawValue = process.env[name];

  if (
    rawValue === undefined ||
    rawValue === null ||
    String(rawValue).trim() === ''
  ) {
    return fallbackValue;
  }

  return (
    String(rawValue)
      .trim()
      .toLowerCase() === 'true'
  );
}

function readCsvEnvironment(name) {
  const rawValue = String(
    process.env[name] || ''
  ).trim();

  if (!rawValue) {
    return [];
  }

  return Array.from(
    new Set(
      rawValue
        .split(',')
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)
    )
  );
}

function normalizeProviderId(provider) {
  return String(provider || '')
    .trim()
    .toLowerCase();
}

function normalizeModelId(modelId) {
  return String(modelId || '')
    .trim();
}

function getEnvironmentAllowlist(
  provider
) {
  if (provider === 'openai') {
    return readCsvEnvironment(
      'AI_OPENAI_ALLOWED_MODELS'
    );
  }

  if (provider === 'gemini') {
    return readCsvEnvironment(
      'AI_GEMINI_ALLOWED_MODELS'
    );
  }

  return [];
}

function isBlockedSpecializedModel(
  provider,
  modelId
) {
  const patterns =
    BLOCKED_MODEL_PATTERNS[provider] ||
    [];

  return patterns.some((pattern) =>
    pattern.test(modelId)
  );
}

function getModelStability(modelId) {
  const normalizedId =
    modelId.toLowerCase();

  if (
    normalizedId.includes(
      'experimental'
    ) ||
    /(^|[-_.])exp($|[-_.])/i.test(
      normalizedId
    )
  ) {
    return MODEL_STABILITIES.EXPERIMENTAL;
  }

  if (
    normalizedId.includes('preview')
  ) {
    return MODEL_STABILITIES.PREVIEW;
  }

  if (
    normalizedId.includes('latest')
  ) {
    return MODEL_STABILITIES.LATEST;
  }

  return MODEL_STABILITIES.STABLE;
}

function isStabilityAllowed(stability) {
  if (
    stability ===
    MODEL_STABILITIES.STABLE
  ) {
    return true;
  }

  if (
    stability ===
    MODEL_STABILITIES.PREVIEW
  ) {
    return readBooleanEnvironment(
      'AI_ALLOW_PREVIEW_MODELS',
      false
    );
  }

  if (
    stability ===
    MODEL_STABILITIES.LATEST
  ) {
    return readBooleanEnvironment(
      'AI_ALLOW_LATEST_MODELS',
      false
    );
  }

  if (
    stability ===
    MODEL_STABILITIES.EXPERIMENTAL
  ) {
    return readBooleanEnvironment(
      'AI_ALLOW_EXPERIMENTAL_MODELS',
      false
    );
  }

  return false;
}

function isGeneralTextModel(
  provider,
  modelId
) {
  if (provider === 'openai') {
    return /^gpt-/i.test(modelId);
  }

  if (provider === 'gemini') {
    return /^gemini-/i.test(modelId);
  }

  return false;
}

function isAllowedByEnvironment(
  provider,
  modelId
) {
  const allowlist =
    getEnvironmentAllowlist(provider);

  // Không cấu hình allowlist:
  // sử dụng chính sách mặc định.
  if (allowlist.length === 0) {
    return true;
  }

  return allowlist.includes(modelId);
}

function getModelTier(
  provider,
  modelId
) {
  const normalizedId =
    modelId.toLowerCase();

  if (provider === 'openai') {
    if (
      normalizedId.includes('luna') ||
      normalizedId.includes('nano') ||
      normalizedId.includes('mini')
    ) {
      return MODEL_TIERS.ECONOMY;
    }

    if (
      normalizedId.includes('sol') ||
      normalizedId.includes('pro')
    ) {
      return MODEL_TIERS.QUALITY;
    }

    if (
      normalizedId.includes('terra')
    ) {
      return MODEL_TIERS.BALANCED;
    }

    return MODEL_TIERS.BALANCED;
  }

  if (provider === 'gemini') {
    if (
      normalizedId.includes(
        'flash-lite'
      )
    ) {
      return MODEL_TIERS.ECONOMY;
    }

    if (
      normalizedId.includes('pro')
    ) {
      return MODEL_TIERS.QUALITY;
    }

    if (
      normalizedId.includes('flash')
    ) {
      return MODEL_TIERS.BALANCED;
    }

    return MODEL_TIERS.BALANCED;
  }

  return MODEL_TIERS.BALANCED;
}

function getTierLabel(tier) {
  switch (tier) {
    case MODEL_TIERS.ECONOMY:
      return 'Tiết kiệm';

    case MODEL_TIERS.QUALITY:
      return 'Chất lượng cao';

    case MODEL_TIERS.BALANCED:
    default:
      return 'Cân bằng';
  }
}

function normalizeModelRecord(model) {
  if (
    !model ||
    typeof model !== 'object'
  ) {
    return null;
  }

  const id = normalizeModelId(
    model.id
  );

  if (!id) {
    return null;
  }

  const displayName =
    typeof model.displayName ===
      'string' &&
    model.displayName.trim()
      ? model.displayName.trim()
      : id;

  return {
    ...model,
    id,
    displayName,
  };
}

function calculateModelScore({
  provider,
  modelId,
  tier,
  stability,
}) {
  let score = 0;

  if (
    stability ===
    MODEL_STABILITIES.STABLE
  ) {
    score += 1000;
  }

  if (
    tier ===
    MODEL_TIERS.BALANCED
  ) {
    score += 300;
  } else if (
    tier === MODEL_TIERS.QUALITY
  ) {
    score += 250;
  } else if (
    tier === MODEL_TIERS.ECONOMY
  ) {
    score += 200;
  }

  const versionNumbers =
    modelId.match(/\d+/g);

  if (versionNumbers) {
    const versionScore = versionNumbers
      .slice(0, 3)
      .reduce(
        (total, value, index) =>
          total +
          Number(value) /
            Math.pow(100, index),
        0
      );

    score += Math.min(
      versionScore,
      100
    );
  }

  if (
    provider === 'openai' &&
    modelId.includes('terra')
  ) {
    score += 40;
  }

  if (
    provider === 'gemini' &&
    modelId.includes('flash') &&
    !modelId.includes('flash-lite')
  ) {
    score += 40;
  }

  return score;
}

function isModelAllowed({
  provider,
  modelId,
}) {
  const normalizedProvider =
    normalizeProviderId(provider);

  const normalizedModelId =
    normalizeModelId(modelId);

  if (
    !SUPPORTED_PROVIDERS.has(
      normalizedProvider
    ) ||
    !normalizedModelId
  ) {
    return false;
  }

  if (
    !isGeneralTextModel(
      normalizedProvider,
      normalizedModelId
    )
  ) {
    return false;
  }

  if (
    isBlockedSpecializedModel(
      normalizedProvider,
      normalizedModelId
    )
  ) {
    return false;
  }

  const stability =
    getModelStability(
      normalizedModelId
    );

  if (
    !isStabilityAllowed(stability)
  ) {
    return false;
  }

  return isAllowedByEnvironment(
    normalizedProvider,
    normalizedModelId
  );
}

function filterModels({
  provider,
  models,
}) {
  const normalizedProvider =
    normalizeProviderId(provider);

  if (
    !SUPPORTED_PROVIDERS.has(
      normalizedProvider
    ) ||
    !Array.isArray(models)
  ) {
    return [];
  }

  const uniqueModels = new Map();

  for (const rawModel of models) {
    const model =
      normalizeModelRecord(rawModel);

    if (!model) {
      continue;
    }

    if (
      !isModelAllowed({
        provider:
          normalizedProvider,
        modelId: model.id,
      })
    ) {
      continue;
    }

    if (!uniqueModels.has(model.id)) {
      uniqueModels.set(
        model.id,
        model
      );
    }
  }

  const policyModels =
    Array.from(
      uniqueModels.values()
    ).map((model) => {
      const stability =
        getModelStability(model.id);

      const tier = getModelTier(
        normalizedProvider,
        model.id
      );

      return {
        ...model,
        tier,
        tierLabel:
          getTierLabel(tier),
        stability,
        recommended: false,
        policyScore:
          calculateModelScore({
            provider:
              normalizedProvider,
            modelId: model.id,
            tier,
            stability,
          }),
      };
    });

  policyModels.sort(
    (left, right) => {
      if (
        right.policyScore !==
        left.policyScore
      ) {
        return (
          right.policyScore -
          left.policyScore
        );
      }

      return left.id.localeCompare(
        right.id
      );
    }
  );

  const maxVisibleModels =
    toPositiveInteger(
      process.env
        .AI_MAX_VISIBLE_MODELS,
      DEFAULT_MAX_VISIBLE_MODELS
    );

  const visibleModels =
    policyModels.slice(
      0,
      maxVisibleModels
    );

  if (visibleModels.length > 0) {
    visibleModels[0] = {
      ...visibleModels[0],
      recommended: true,
    };
  }

  return visibleModels.map(
    ({
      policyScore,
      ...model
    }) => model
  );
}

function getDefaultModel({
  provider,
  models,
}) {
  const filteredModels =
    filterModels({
      provider,
      models,
    });

  return (
    filteredModels.find(
      (model) =>
        model.recommended === true
    ) ||
    filteredModels[0] ||
    null
  );
}

module.exports = {
  MODEL_TIERS,
  MODEL_STABILITIES,
  isModelAllowed,
  filterModels,
  getDefaultModel,
};