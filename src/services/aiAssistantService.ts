// File: src/services/aiAssistantService.ts
//
// Dịch vụ frontend dành riêng cho Module Trợ lý Văn phòng AI.
// Không import hoặc gọi bất kỳ logic xử lý DOCX nào.

export type AiProvider = 'openai' | 'gemini';

export type AiModelTier =
  | 'economy'
  | 'balanced'
  | 'quality';

export type AiModelStability =
  | 'stable'
  | 'preview'
  | 'latest'
  | 'experimental';

export interface AiModelRecord {
  id: string;
  displayName: string;
  tier: AiModelTier;
  tierLabel: string;
  stability: AiModelStability;
  recommended: boolean;

  /**
   * Cho phép giữ lại các field riêng do
   * OpenAI hoặc Gemini trả về.
   */
  [key: string]: unknown;
}

export interface AiModuleStatusResponse {
  ok: boolean;
  module: string;
  stage: string;
  enabled: boolean;
  supportedProviders: AiProvider[];
}

export interface AiConnectSessionRequest {
  provider: AiProvider;
  apiKey: string;
  unitId: string;
}

export interface AiConnectSessionResponse {
  ok: boolean;
  connected: true;
  provider: AiProvider;
  unitId: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  modelCount: number;
  models: AiModelRecord[];
  message: string;
}

export interface AiSessionStatusResponse {
  ok: boolean;
  connected: boolean;
  provider: AiProvider | null;
  unitId?: string;
  createdAt?: string;
  lastAccessAt?: string;
  expiresAt?: string;
  absoluteExpiresAt?: string;
  message?: string;
}

export interface AiDisconnectSessionResponse {
  ok: boolean;
  connected: false;
  message: string;
}

interface AiErrorPayload {
  ok?: boolean;
  code?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export class AiAssistantApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: AiErrorPayload;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: AiErrorPayload
  ) {
    super(message);

    this.name = 'AiAssistantApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const getAiApiBaseUrl = (): string => {
  const baseUrl = (
    import.meta.env.BASE_URL || '/'
  ).replace(/\/$/, '');

  return `${baseUrl}/api/ai`;
};

const readJsonSafely = async (
  response: Response
): Promise<AiErrorPayload> => {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      message:
        'Máy chủ AI trả về dữ liệu không đúng định dạng JSON.',
    };
  }
};

const requestAiApi = async <TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> => {
  const response = await fetch(
    `${getAiApiBaseUrl()}${path}`,
    {
      ...options,

      /**
       * Cookie phiên AI là HttpOnly.
       * Frontend không đọc cookie mà chỉ gửi kèm request.
       */
      credentials: 'include',

      headers: {
        Accept: 'application/json',
        ...(options.body
          ? {
              'Content-Type':
                'application/json',
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  const data =
    await readJsonSafely(response);

  if (
    !response.ok ||
    data.ok === false
  ) {
    const code =
      typeof data.code === 'string'
        ? data.code
        : 'AI_REQUEST_FAILED';

    const message =
      typeof data.message === 'string' &&
      data.message.trim()
        ? data.message
        : typeof data.error === 'string' &&
            data.error.trim()
          ? data.error
          : `API AI trả lỗi HTTP ${response.status}.`;

    throw new AiAssistantApiError(
      message,
      code,
      response.status,
      data
    );
  }

  return data as TResponse;
};

export const getAiModuleStatus =
  async (): Promise<AiModuleStatusResponse> => {
    return requestAiApi<AiModuleStatusResponse>(
      '/status',
      {
        method: 'GET',
        cache: 'no-store',
      }
    );
  };

export const connectAiSession = async (
  payload: AiConnectSessionRequest
): Promise<AiConnectSessionResponse> => {
  return requestAiApi<AiConnectSessionResponse>(
    '/session/connect',
    {
      method: 'POST',

      /**
       * Không ghi log payload vì payload chứa API Key.
       */
      body: JSON.stringify(payload),
    }
  );
};

export const getAiSessionStatus =
  async (): Promise<AiSessionStatusResponse> => {
    return requestAiApi<AiSessionStatusResponse>(
      '/session/status',
      {
        method: 'GET',
        cache: 'no-store',
      }
    );
  };

export const disconnectAiSession =
  async (): Promise<AiDisconnectSessionResponse> => {
    return requestAiApi<AiDisconnectSessionResponse>(
      '/session',
      {
        method: 'DELETE',
      }
    );
  };