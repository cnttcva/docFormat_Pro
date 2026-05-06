const TRIAL_STORAGE_KEY = 'docformat_pro_trial_state_v1';

export const TRIAL_LIMIT = 15;

export type TrialState = {
  used: number;
  limit: number;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
};

const defaultTrialState: TrialState = {
  used: 0,
  limit: TRIAL_LIMIT,
  firstUsedAt: null,
  lastUsedAt: null,
};

export const getTrialState = (): TrialState => {
  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!raw) return defaultTrialState;

    const parsed = JSON.parse(raw);

    return {
      used: Number.isFinite(parsed.used) ? parsed.used : 0,
      limit: Number.isFinite(parsed.limit) ? parsed.limit : TRIAL_LIMIT,
      firstUsedAt: parsed.firstUsedAt || null,
      lastUsedAt: parsed.lastUsedAt || null,
    };
  } catch {
    return defaultTrialState;
  }
};

export const saveTrialState = (state: TrialState) => {
  localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(state));
};

export const getRemainingTrialUses = () => {
  const state = getTrialState();
  return Math.max(0, state.limit - state.used);
};

export const isTrialAvailable = () => {
  return getRemainingTrialUses() > 0;
};

export const consumeTrialUse = () => {
  const state = getTrialState();

  if (state.used >= state.limit) {
    return {
      ok: false,
      state,
      remaining: 0,
    };
  }

  const now = new Date().toISOString();

  const nextState: TrialState = {
    ...state,
    used: state.used + 1,
    limit: state.limit || TRIAL_LIMIT,
    firstUsedAt: state.firstUsedAt || now,
    lastUsedAt: now,
  };

  saveTrialState(nextState);

  return {
    ok: true,
    state: nextState,
    remaining: Math.max(0, nextState.limit - nextState.used),
  };
};

export const resetTrialForDebug = () => {
  localStorage.removeItem(TRIAL_STORAGE_KEY);
};