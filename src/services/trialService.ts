const TRIAL_CACHE_KEY = 'docformat_pro_trial_state_mysql_v1';

export const TRIAL_LIMIT = 5;

export type TrialStatus = 'ACTIVE' | 'EXHAUSTED' | 'BLOCKED';

export type TrialState = {
  used: number;
  limit: number;
  remaining: number;
  status: TrialStatus;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
};

export type TrialConsumeResult = {
  ok: boolean;
  state: TrialState;
  remaining: number;
  error?: string;
};

type TrialApiRecord = {
  deviceId?: string;
  schoolId?: string | null;
  orgName?: string | null;
  trialLimit?: number;
  trialUsed?: number;
  trialRemaining?: number;
  status?: TrialStatus;
  firstUsedAt?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TrialApiResponse = {
  ok: boolean;
  service?: string;
  consumed?: boolean;
  trial?: TrialApiRecord;
  error?: string;
};

const defaultTrialState: TrialState = {
  used: 0,
  limit: TRIAL_LIMIT,
  remaining: TRIAL_LIMIT,
  status: 'ACTIVE',
  firstUsedAt: null,
  lastUsedAt: null,
};

const getTrialApiBaseUrl = () => {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${baseUrl}/api/trial`;
};

const clampNumber = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const readTrialCache = (): TrialState => {
  try {
    const raw = localStorage.getItem(TRIAL_CACHE_KEY);
    if (!raw) return defaultTrialState;

    const parsed = JSON.parse(raw);

    const limit = clampNumber(parsed.limit, TRIAL_LIMIT);
    const used = clampNumber(parsed.used, 0);
    const remaining = clampNumber(parsed.remaining, Math.max(0, limit - used));

    return {
      used,
      limit,
      remaining: Math.max(0, remaining),
      status: parsed.status || 'ACTIVE',
      firstUsedAt: parsed.firstUsedAt || null,
      lastUsedAt: parsed.lastUsedAt || null,
    };
  } catch {
    return defaultTrialState;
  }
};

const saveTrialCache = (state: TrialState) => {
  localStorage.setItem(TRIAL_CACHE_KEY, JSON.stringify(state));
};

const buildStateFromApiRecord = (trial?: TrialApiRecord): TrialState => {
  if (!trial) return defaultTrialState;

  const limit = clampNumber(trial.trialLimit, TRIAL_LIMIT);
  const used = clampNumber(trial.trialUsed, 0);
  const remaining = clampNumber(trial.trialRemaining, Math.max(0, limit - used));

  return {
    used,
    limit,
    remaining: Math.max(0, remaining),
    status: trial.status || 'ACTIVE',
    firstUsedAt: trial.firstUsedAt || null,
    lastUsedAt: trial.lastUsedAt || null,
  };
};

const hashText = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const getBrowserFingerprint = () => {
  const nav = window.navigator;
  const screenInfo = window.screen;

  return [
    nav.userAgent || '',
    nav.language || '',
    Array.isArray(nav.languages) ? nav.languages.join(',') : '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screenInfo.width,
    screenInfo.height,
    screenInfo.colorDepth,
    nav.hardwareConcurrency || '',
    nav.platform || '',
  ].join('|');
};

export const getTrialDeviceId = async () => {
  const fingerprint = getBrowserFingerprint();
  const hash = await hashText(fingerprint);

  return `MYSQL_TRIAL_DEVICE_${hash.slice(0, 32).toUpperCase()}`;
};

const buildTrialPayload = async () => {
  const deviceId = await getTrialDeviceId();

  return {
    deviceId,
    browserFingerprint: deviceId,
  };
};

const callTrialApi = async (path: 'status' | 'consume'): Promise<TrialApiResponse> => {
  const payload = await buildTrialPayload();

  const response = await fetch(`${getTrialApiBaseUrl()}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as TrialApiResponse;

  if (!response.ok || result.ok !== true) {
    return {
      ok: false,
      service: result.service,
      error: result.error || `API trial trả lỗi HTTP ${response.status}.`,
      trial: result.trial,
    };
  }

  return result;
};

export const syncTrialStatusFromMysql = async (): Promise<TrialState> => {
  const result = await callTrialApi('status');

  if (!result.ok) {
    const cachedState = readTrialCache();

    return {
      ...cachedState,
      status: cachedState.remaining <= 0 ? 'EXHAUSTED' : cachedState.status,
    };
  }

  const state = buildStateFromApiRecord(result.trial);
  saveTrialCache(state);

  return state;
};

export const getTrialState = (): TrialState => {
  return readTrialCache();
};

export const saveTrialState = (state: TrialState) => {
  saveTrialCache(state);
};

export const getRemainingTrialUses = () => {
  const state = readTrialCache();
  return Math.max(0, state.remaining);
};

export const isTrialAvailable = () => {
  const state = readTrialCache();
  return state.status === 'ACTIVE' && state.remaining > 0;
};

export const consumeTrialUse = async (): Promise<TrialConsumeResult> => {
  const result = await callTrialApi('consume');

  if (!result.ok) {
    const cachedState = readTrialCache();

    return {
      ok: false,
      state: cachedState,
      remaining: cachedState.remaining,
      error: result.error || 'Không ghi nhận được lượt dùng thử.',
    };
  }

  const state = buildStateFromApiRecord(result.trial);
  saveTrialCache(state);

  return {
    ok: true,
    state,
    remaining: state.remaining,
  };
};

export const resetTrialForDebug = async () => {
  const deviceId = await getTrialDeviceId();

  if (!deviceId.startsWith('MYSQL_TRIAL_TEST_')) {
    localStorage.removeItem(TRIAL_CACHE_KEY);
    return;
  }

  await fetch(`${getTrialApiBaseUrl()}/reset-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId }),
  });

  localStorage.removeItem(TRIAL_CACHE_KEY);
};