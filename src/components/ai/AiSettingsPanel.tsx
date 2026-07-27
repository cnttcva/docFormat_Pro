// File: src/components/ai/AiSettingsPanel.tsx
//
// Bảng cài đặt và quản lý phiên Trợ lý Văn phòng AI.
// Không liên quan đến pipeline chuẩn hóa DOCX.

import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  Server,
  ShieldCheck,
  Unplug,
} from 'lucide-react';

import {
  AiAssistantApiError,
  AiModelRecord,
  AiModuleStatusResponse,
  AiProvider,
  AiSessionStatusResponse,
  connectAiSession,
  disconnectAiSession,
  getAiModuleStatus,
  getAiSessionStatus,
} from '../../services/aiAssistantService';

import {
  AiOrganizationContext,
} from '../../services/aiOrganizationContext';

interface AiSettingsPanelProps {
  organization: AiOrganizationContext | null;
}

type NoticeType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

interface NoticeState {
  type: NoticeType;
  message: string;
}

const getAiErrorMessage = (
  error: unknown
): string => {
  if (error instanceof AiAssistantApiError) {
    const messages: Record<string, string> = {
      AI_ASSISTANT_DISABLED:
        'Module Trợ lý AI đang bị tắt trên máy chủ.',

      AI_PROVIDER_UNSUPPORTED:
        'Nhà cung cấp AI đã chọn chưa được hỗ trợ.',

      AI_KEY_REQUIRED:
        'Vui lòng nhập API Key.',

      AI_KEY_TOO_LONG:
        'API Key vượt quá độ dài cho phép.',

      AI_UNIT_ID_REQUIRED:
        'Không xác định được mã đơn vị sử dụng.',

      AI_UNIT_ID_TOO_LONG:
        'Mã đơn vị không hợp lệ.',

      AI_KEY_INVALID:
        'API Key không hợp lệ hoặc đã bị thu hồi.',

      AI_KEY_RESTRICTED:
        'API Key đang bị giới hạn quyền truy cập.',

      AI_RATE_LIMITED:
        'Nhà cung cấp AI đang giới hạn số lượng yêu cầu. Vui lòng thử lại sau.',

      AI_PROVIDER_TIMEOUT:
        'Nhà cung cấp AI phản hồi quá thời gian cho phép.',

      AI_PROVIDER_NETWORK_ERROR:
        'Máy chủ không thể kết nối đến nhà cung cấp AI.',

      AI_PROVIDER_UNAVAILABLE:
        'Dịch vụ AI hiện chưa sẵn sàng.',

      AI_SESSION_CONFIGURATION_ERROR:
        'Cấu hình phiên AI trên máy chủ chưa hợp lệ.',

      AI_SESSION_INTERNAL_ERROR:
        'Không thể tạo phiên AI do lỗi máy chủ.',

      AI_SESSION_INVALIDATED:
        'Phiên AI không còn hợp lệ. Vui lòng kết nối lại.',
    };

    return (
      messages[error.code] ||
      error.message ||
      'Không thể thực hiện yêu cầu AI.'
    );
  }

  if (error instanceof Error) {
    if (
      error.name === 'TypeError' ||
      error.message.toLowerCase().includes('fetch')
    ) {
      return 'Không kết nối được với máy chủ DocFormatPro AI.';
    }

    return error.message;
  }

  return 'Đã xảy ra lỗi không xác định.';
};

const getNoticeClasses = (
  type: NoticeType
): string => {
  if (type === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (type === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (type === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }

  return 'border-blue-200 bg-blue-50 text-blue-800';
};

const getProviderLabel = (
  provider: AiProvider
): string => {
  return provider === 'openai'
    ? 'OpenAI'
    : 'Google Gemini';
};

export const AiSettingsPanel:
  React.FC<AiSettingsPanelProps> = ({
    organization,
  }) => {
    const [provider, setProvider] =
      useState<AiProvider>('gemini');

    const [apiKey, setApiKey] =
      useState('');

    const [showApiKey, setShowApiKey] =
      useState(false);

    const [moduleStatus, setModuleStatus] =
      useState<AiModuleStatusResponse | null>(
        null
      );

    const [sessionStatus, setSessionStatus] =
      useState<AiSessionStatusResponse | null>(
        null
      );

    const [models, setModels] =
      useState<AiModelRecord[]>([]);

    const [
      selectedModelId,
      setSelectedModelId,
    ] = useState('');

    const [isLoadingStatus, setIsLoadingStatus] =
      useState(true);

    const [isConnecting, setIsConnecting] =
      useState(false);

    const [
      isDisconnecting,
      setIsDisconnecting,
    ] = useState(false);

    const [notice, setNotice] =
      useState<NoticeState | null>(null);

    const isConnected =
      sessionStatus?.connected === true;

    const moduleEnabled =
      moduleStatus?.enabled === true;

    const providerSupported =
      moduleStatus?.supportedProviders?.includes(
        provider
      ) !== false;

    const recommendedModel =
      useMemo(
        () =>
          models.find(
            model => model.recommended
          ) || models[0],
        [models]
      );

    useEffect(() => {
      let cancelled = false;

      const loadInitialStatus =
        async (): Promise<void> => {
          setIsLoadingStatus(true);

          try {
            const [
              nextModuleStatus,
              nextSessionStatus,
            ] = await Promise.all([
              getAiModuleStatus(),
              getAiSessionStatus(),
            ]);

            if (cancelled) return;

            setModuleStatus(nextModuleStatus);
            setSessionStatus(nextSessionStatus);

            if (
              nextSessionStatus.connected &&
              nextSessionStatus.provider
            ) {
              setProvider(
                nextSessionStatus.provider
              );
            }

            if (!nextModuleStatus.enabled) {
              setNotice({
                type: 'warning',
                message:
                  'Module Trợ lý AI hiện đang bị tắt trên máy chủ.',
              });
            }
          } catch (error) {
            if (cancelled) return;

            setNotice({
              type: 'error',
              message:
                getAiErrorMessage(error),
            });
          } finally {
            if (!cancelled) {
              setIsLoadingStatus(false);
            }
          }
        };

      loadInitialStatus();

      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      if (
        recommendedModel &&
        !selectedModelId
      ) {
        setSelectedModelId(
          recommendedModel.id
        );
      }
    }, [
      recommendedModel,
      selectedModelId,
    ]);

    const handleConnect = async (
      event: FormEvent<HTMLFormElement>
    ): Promise<void> => {
      event.preventDefault();

      setNotice(null);

      if (!organization?.unitId) {
        setNotice({
          type: 'error',
          message:
            'Không xác định được mã đơn vị. Vui lòng kiểm tra trạng thái bản quyền.',
        });

        return;
      }

      if (!moduleEnabled) {
        setNotice({
          type: 'warning',
          message:
            'Module Trợ lý AI chưa được bật trên máy chủ.',
        });

        return;
      }

      if (!providerSupported) {
        setNotice({
          type: 'error',
          message:
            'Nhà cung cấp AI này chưa được máy chủ hỗ trợ.',
        });

        return;
      }

      const normalizedApiKey =
        apiKey.trim();

      if (!normalizedApiKey) {
        setNotice({
          type: 'error',
          message:
            'Vui lòng nhập API Key.',
        });

        return;
      }

      setIsConnecting(true);

      try {
        const result =
          await connectAiSession({
            provider,
            apiKey: normalizedApiKey,
            unitId: organization.unitId,
          });

        const nextModels =
          Array.isArray(result.models)
            ? result.models
            : [];

        const nextRecommendedModel =
          nextModels.find(
            model => model.recommended
          ) || nextModels[0];

        setSessionStatus({
          ok: result.ok,
          connected: result.connected,
          provider: result.provider,
          unitId: result.unitId,
          expiresAt: result.expiresAt,
          absoluteExpiresAt:
            result.absoluteExpiresAt,
        });

        setModels(nextModels);

        setSelectedModelId(
          nextRecommendedModel?.id || ''
        );

        setNotice({
          type: 'success',
          message:
            result.message ||
            `Đã kết nối ${getProviderLabel(
              result.provider
            )} thành công.`,
        });
      } catch (error) {
        setSessionStatus(previousStatus => ({
          ok:
            previousStatus?.ok === true,
          connected: false,
          provider: null,
        }));

        setModels([]);
        setSelectedModelId('');

        setNotice({
          type: 'error',
          message:
            getAiErrorMessage(error),
        });
      } finally {
        /*
         * API Key chỉ tồn tại tạm thời trong state
         * trong lúc gửi yêu cầu kết nối.
         */
        setApiKey('');
        setShowApiKey(false);
        setIsConnecting(false);
      }
    };

    const handleDisconnect =
      async (): Promise<void> => {
        setNotice(null);
        setIsDisconnecting(true);

        try {
          const result =
            await disconnectAiSession();

          setSessionStatus({
            ok: result.ok,
            connected: false,
            provider: null,
            message: result.message,
          });

          setModels([]);
          setSelectedModelId('');
          setApiKey('');
          setShowApiKey(false);

          setNotice({
            type: 'success',
            message:
              result.message ||
              'Đã ngắt kết nối và xóa API Key khỏi phiên máy chủ.',
          });
        } catch (error) {
          setNotice({
            type: 'error',
            message:
              getAiErrorMessage(error),
          });
        } finally {
          setIsDisconnecting(false);
        }
      };

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 px-5 py-5 text-white sm:px-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <Bot className="h-6 w-6 text-blue-200" />
              </div>

              <div>
                <h2 className="text-xl font-black">
                  Cài đặt Trợ lý AI
                </h2>

                <p className="mt-1 text-sm font-medium text-blue-100/80">
                  Kết nối API Key riêng của đơn vị
                </p>
              </div>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                isConnected
                  ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200'
                  : 'border-white/20 bg-white/10 text-blue-100'
              }`}
            >
              {isLoadingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Server className="h-4 w-4" />
              )}

              {isLoadingStatus
                ? 'Đang kiểm tra'
                : isConnected
                  ? 'Đã kết nối'
                  : 'Chưa kết nối'}
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Đơn vị sử dụng
              </p>

              <p className="mt-2 text-base font-black text-slate-900">
                {organization?.orgName ||
                  'Chưa xác định'}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Mã đơn vị:{' '}
                <span className="font-mono text-slate-700">
                  {organization?.unitId ||
                    'Không có'}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

                <div>
                  <p className="text-sm font-extrabold text-blue-950">
                    Bảo vệ API Key
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-blue-800">
                    API Key không được lưu trong trình duyệt hoặc CSDL.
                    Khóa chỉ được gửi đến máy chủ để tạo phiên bảo mật.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {notice && (
            <div
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${getNoticeClasses(
                notice.type
              )}`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              )}

              <p className="leading-6">
                {notice.message}
              </p>
            </div>
          )}

          {!isConnected ? (
            <form
              onSubmit={handleConnect}
              className="space-y-5"
            >
              <div>
                <label className="text-sm font-extrabold text-slate-800">
                  Nhà cung cấp AI
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      'gemini',
                      'openai',
                    ] as AiProvider[]
                  ).map(providerOption => {
                    const isSelected =
                      provider ===
                      providerOption;

                    const isSupported =
                      moduleStatus
                        ?.supportedProviders
                        ?.includes(
                          providerOption
                        ) !== false;

                    return (
                      <button
                        key={providerOption}
                        type="button"
                        disabled={
                          isConnecting ||
                          !isSupported
                        }
                        onClick={() =>
                          setProvider(
                            providerOption
                          )
                        }
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-100'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                        } ${
                          !isSupported
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">
                              {getProviderLabel(
                                providerOption
                              )}
                            </p>

                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {providerOption ===
                              'gemini'
                                ? 'Google AI Studio'
                                : 'OpenAI Platform'}
                            </p>
                          </div>

                          <div
                            className={`h-4 w-4 rounded-full border-4 ${
                              isSelected
                                ? 'border-blue-600 bg-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ai-api-key"
                  className="text-sm font-extrabold text-slate-800"
                >
                  API Key
                </label>

                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="ai-api-key"
                    type={
                      showApiKey
                        ? 'text'
                        : 'password'
                    }
                    value={apiKey}
                    disabled={
                      isConnecting ||
                      !moduleEnabled
                    }
                    onChange={event =>
                      setApiKey(
                        event.target.value
                      )
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={`Nhập API Key ${getProviderLabel(
                      provider
                    )}`}
                    className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowApiKey(
                        previous => !previous
                      )
                    }
                    disabled={!apiKey}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                    aria-label={
                      showApiKey
                        ? 'Ẩn API Key'
                        : 'Hiện API Key'
                    }
                  >
                    {showApiKey ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                  Không chia sẻ API Key với người khác.
                  Sau khi kết nối, ô nhập khóa sẽ được tự động xóa.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  isConnecting ||
                  isLoadingStatus ||
                  !moduleEnabled ||
                  !organization?.unitId ||
                  !apiKey.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang kiểm tra API Key...
                  </>
                ) : (
                  <>
                    <PlugZap className="h-5 w-5" />
                    Kết nối Trợ lý AI
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-extrabold text-emerald-900">
                  Phiên AI đang hoạt động
                </p>

                <div className="mt-3 grid gap-2 text-xs font-semibold text-emerald-800 sm:grid-cols-2">
                  <p>
                    Nhà cung cấp:{' '}
                    <span className="font-black">
                      {sessionStatus?.provider
                        ? getProviderLabel(
                            sessionStatus.provider
                          )
                        : 'Không xác định'}
                    </span>
                  </p>

                  <p>
                    Mã đơn vị:{' '}
                    <span className="font-mono font-black">
                      {sessionStatus?.unitId ||
                        organization?.unitId}
                    </span>
                  </p>
                </div>
              </div>

              {models.length > 0 ? (
                <div>
                  <label
                    htmlFor="ai-model"
                    className="text-sm font-extrabold text-slate-800"
                  >
                    Model sử dụng
                  </label>

                  <select
                    id="ai-model"
                    value={selectedModelId}
                    onChange={event =>
                      setSelectedModelId(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {models.map(model => (
                      <option
                        key={model.id}
                        value={model.id}
                      >
                        {model.displayName}
                        {model.recommended
                          ? ' — Khuyến nghị'
                          : ''}
                        {' — '}
                        {model.tierLabel}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Có {models.length} model văn bản phù hợp được máy chủ cho phép.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
                  Phiên đang hoạt động. Danh sách model sẽ được tải khi thực hiện kết nối mới trên trang này.
                </div>
              )}

              <button
                type="button"
                disabled={isDisconnecting}
                onClick={handleDisconnect}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-black text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang ngắt phiên...
                  </>
                ) : (
                  <>
                    <Unplug className="h-5 w-5" />
                    Ngắt kết nối và xóa API Key
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    );
  };