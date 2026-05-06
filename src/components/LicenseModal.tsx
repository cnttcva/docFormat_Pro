// File: src/components/LicenseModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MonitorSmartphone,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Info,
  UserRound,
  Phone,
  Laptop,
  Sparkles,
} from 'lucide-react';

type ViewMode = 'SELECT' | 'NEW' | 'EXISTING';

type LicenseNotice = {
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message?: string;
  status?: string;
};

const getDeviceId = () => {
  return localStorage.getItem('docFormat_deviceId') || 'Thiết bị chưa tạo mã';
};

const normalizeSchoolIdInput = (value: string) => {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

const NoticeBox = ({ notice }: { notice?: LicenseNotice | null }) => {
  if (!notice?.message) return null;

  const type = notice.type || 'INFO';

  const styleMap: Record<string, string> = {
    SUCCESS: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    INFO: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
    ERROR: 'bg-rose-50 border-rose-200 text-rose-800',
  };

  const iconMap: Record<string, React.ReactNode> = {
    SUCCESS: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    INFO: <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />,
    WARNING: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
    ERROR: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`border rounded-2xl p-4 flex items-start gap-3 ${styleMap[type] || styleMap.INFO}`}>
      {iconMap[type] || iconMap.INFO}
      <div>
        <p className="font-bold text-sm">Thông báo bản quyền</p>
        <p className="text-sm mt-1 leading-6">{notice.message}</p>
        {notice.status && (
          <p className="mt-2 text-[11px] font-black uppercase tracking-wider opacity-70">
            Trạng thái: {notice.status}
          </p>
        )}
      </div>
    </div>
  );
};

const DeviceIdBox = ({ compact = false }: { compact?: boolean }) => {
  const deviceId = getDeviceId();

  const handleCopyDeviceId = async () => {
    if (!deviceId || deviceId === 'Thiết bị chưa tạo mã') return;

    try {
      await navigator.clipboard.writeText(deviceId);
      alert(`Đã copy mã thiết bị: ${deviceId}`);
    } catch {
      alert('Không thể copy mã thiết bị.');
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Mã thiết bị hiện tại
          </p>
          <p className="font-mono text-xs sm:text-sm font-black text-slate-700 mt-1 truncate">
            {deviceId}
          </p>
        </div>

        <button
          onClick={handleCopyDeviceId}
          className="shrink-0 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
          title="Copy mã thiết bị"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const FieldLabel = ({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block text-sm font-bold text-slate-700 mb-1.5">
    {children} {required && <span className="text-rose-500">*</span>}
  </label>
);

const TextInput = ({
  value,
  onChange,
  placeholder,
  className = '',
  mono = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  mono?: boolean;
}) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all ${
      mono ? 'font-mono font-bold tracking-wider' : ''
    } ${className}`}
    placeholder={placeholder}
  />
);

export const LicenseModal = ({
  isOpen,
  onClose,
  authStatus,
  orgInfo,
  pendingAuth,
  orgFormValues,
  setOrgFormValues,
  confirmRemove,
  setConfirmRemove,
  handleRemoveLicense,
  handleCancelRegistration,
  handleActivate,
  handleRegisterRequest,

  // Hai prop này đã có trong useLicenseAuth.ts bản mới.
  // Nếu MainApp chưa truyền vào thì vẫn chạy bình thường.
  isCheckingLicense = false,
  licenseNotice = null,
}: any) => {
  const [viewMode, setViewMode] = useState<ViewMode>('SELECT');

  const [schoolIdInput, setSchoolIdInput] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen && authStatus === 'UNREGISTERED') {
      setViewMode('SELECT');
      setLocalError('');
    }
  }, [isOpen, authStatus]);

  useEffect(() => {
    if (isOpen && pendingAuth) {
      setSchoolIdInput(pendingAuth.schoolId || pendingAuth.requestedSchoolId || '');
      setUserName(pendingAuth.userName || '');
      setUserRole(pendingAuth.userRole || '');
      setDeviceName(pendingAuth.deviceName || '');
      setPhone(pendingAuth.phone || '');
    }
  }, [isOpen, pendingAuth]);

  if (!isOpen) return null;

  const resetLocalError = () => setLocalError('');

  const goSelect = () => {
    resetLocalError();
    setViewMode('SELECT');
  };

  const goExisting = () => {
    resetLocalError();
    setViewMode('EXISTING');
  };

  const goNew = () => {
    resetLocalError();
    setViewMode('NEW');
  };

  const onSubmitExisting = async () => {
    const schoolId = normalizeSchoolIdInput(schoolIdInput);

    if (!schoolId) {
      setLocalError('Vui lòng nhập Mã định danh trường.');
      return;
    }

    if (!userName.trim()) {
      setLocalError('Vui lòng nhập Họ tên người sử dụng.');
      return;
    }

    if (!deviceName.trim()) {
      setLocalError('Vui lòng nhập Tên máy / ghi chú thiết bị.');
      return;
    }

    resetLocalError();

    await handleRegisterRequest({
      requestType: 'EXISTING_SCHOOL',
      schoolId,
      userName: userName.trim(),
      userRole: userRole.trim(),
      deviceName: deviceName.trim(),
      phone: phone.trim(),
    });
  };

  const onSubmitNewSchool = async () => {
    const requestedSchoolId = normalizeSchoolIdInput(orgFormValues.schoolId || '');

    if (!orgFormValues.orgName?.trim()) {
      setLocalError('Vui lòng nhập Tên đơn vị / trường học.');
      return;
    }

    if (!requestedSchoolId) {
      setLocalError('Vui lòng nhập Mã định danh mong muốn, ví dụ: THCS_CVA.');
      return;
    }

    if (!userName.trim()) {
      setLocalError('Vui lòng nhập Họ tên người đại diện hoặc người sử dụng.');
      return;
    }

    if (!deviceName.trim()) {
      setLocalError('Vui lòng nhập Tên máy / ghi chú thiết bị.');
      return;
    }

    resetLocalError();

    await handleRegisterRequest({
      requestType: 'NEW_SCHOOL',
      requestedSchoolId,
      schoolId: requestedSchoolId,
      userName: userName.trim(),
      userRole: userRole.trim(),
      deviceName: deviceName.trim(),
      phone: phone.trim(),
    });
  };

  const requestTitle =
    pendingAuth?.requestType === 'NEW_SCHOOL'
      ? 'Đăng ký đơn vị mới'
      : 'Cấp phép thiết bị mới';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-[0_24px_80px_rgba(15,23,42,0.35)] relative z-10 overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn border border-white/60">
        <div className="relative bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 p-6 flex items-center justify-between shrink-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 right-10 w-44 h-44 bg-cyan-300/20 rounded-full blur-3xl"></div>

          <div className="relative flex items-center gap-3">
            <div className="bg-white/15 border border-white/20 p-3 rounded-2xl shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Quản lý Bản quyền
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100 font-semibold mt-0.5">
                docFormat Pro • License Device Center
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative p-2.5 text-white/75 hover:text-white hover:bg-white/15 rounded-2xl transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
          <div className="mb-5">
            <NoticeBox notice={licenseNotice} />
          </div>

          {authStatus === 'REGISTERED' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex flex-col items-center text-center shadow-sm">
                <div className="w-20 h-20 rounded-3xl bg-white border border-emerald-100 shadow-sm flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-11 h-11 text-emerald-500" />
                </div>

                <h3 className="text-xl font-black text-emerald-800">
                  Thiết bị đã được cấp phép
                </h3>

                <p className="text-emerald-700 text-sm mt-2 max-w-md leading-6">
                  Thiết bị này đang hoạt động hợp lệ trong hệ thống bản quyền của đơn vị.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <DeviceIdBox />

                <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center gap-4 pb-3 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Đơn vị:</span>
                    <span className="font-black text-slate-800 text-right">
                      {orgInfo?.orgName || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4 pb-3 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Mã định danh:</span>
                    <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                      {orgInfo?.schoolId || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <span className="text-slate-500 text-sm font-medium">Trạng thái:</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="w-full py-3.5 flex items-center justify-center gap-2 text-rose-600 font-black bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-2xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" /> Thu hồi bản quyền thiết bị này
                </button>
              ) : (
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 space-y-4 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-rose-800 text-base font-black">
                        Xác nhận thu hồi thiết bị
                      </p>
                      <p className="text-rose-700 text-sm mt-1 leading-6">
                        Sau khi thu hồi, thiết bị này sẽ bị khóa trở lại và cần Admin cấp phép nếu muốn sử dụng lại.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="flex-1 py-2.5 bg-white text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-50"
                    >
                      Hủy
                    </button>

                    <button
                      onClick={handleRemoveLicense}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-md"
                    >
                      Đồng ý Thu hồi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {authStatus === 'PENDING' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl text-center shadow-sm">
                <div className="w-20 h-20 bg-white rounded-3xl border border-amber-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Clock className="w-11 h-11 text-amber-500 animate-pulse" />
                </div>

                <h3 className="text-xl font-black text-slate-800">
                  Yêu cầu đang chờ Admin duyệt
                </h3>

                <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto leading-6">
                  Yêu cầu <span className="font-bold text-amber-700">{requestTitle}</span> đã được gửi lên hệ thống.
                  Sau khi Admin duyệt, bạn hãy bấm kiểm tra trạng thái để mở khóa ứng dụng.
                </p>
              </div>

              <DeviceIdBox />

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center gap-4 pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm font-medium">Đơn vị / Mã trường:</span>
                  <span className="font-black text-slate-800 text-right">
                    {pendingAuth?.orgName || pendingAuth?.schoolId || pendingAuth?.requestedSchoolId || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4 pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm font-medium">Tên thiết bị:</span>
                  <span className="font-bold text-slate-700 text-right">
                    {pendingAuth?.deviceName || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-slate-500 text-sm font-medium">Người dùng:</span>
                  <span className="font-bold text-slate-700 text-right">
                    {pendingAuth?.userName || '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleActivate}
                  disabled={isCheckingLicense}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  {isCheckingLicense ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isCheckingLicense ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái cấp phép'}
                </button>

                <button
                  onClick={handleCancelRegistration}
                  disabled={isCheckingLicense}
                  className="px-5 py-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-2xl font-black disabled:opacity-60"
                >
                  Hủy yêu cầu đăng ký
                </button>
              </div>
            </div>
          )}

          {authStatus === 'UNREGISTERED' && viewMode === 'SELECT' && (
            <div className="space-y-5 py-2 animate-fadeIn">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider mb-4">
                  <Sparkles className="w-4 h-4" /> Chọn hình thức đăng ký
                </div>

                <h3 className="text-xl font-black text-slate-800">
                  Thiết bị này chưa được cấp quyền sử dụng
                </h3>

                <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto leading-6">
                  Vui lòng chọn đúng trường hợp bên dưới để gửi yêu cầu bản quyền cho thiết bị hiện tại.
                </p>
              </div>

              <DeviceIdBox compact />

              <button
                onClick={goExisting}
                className="w-full group text-left bg-white border-2 border-slate-200 hover:border-indigo-500 p-5 rounded-3xl flex items-center gap-5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100"
              >
                <div className="bg-slate-50 group-hover:bg-indigo-50 p-4 rounded-2xl transition-colors">
                  <MonitorSmartphone className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                </div>

                <div className="flex-1">
                  <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-700">
                    Trường đã đăng ký và đã có mã định danh
                  </h4>
                  <p className="text-sm text-slate-500 mt-1 leading-6">
                    Dành cho máy tính mới thuộc trường đã có mã, ví dụ: THCS_CVA.
                  </p>
                </div>
              </button>

              <button
                onClick={goNew}
                className="w-full group text-left bg-white border-2 border-slate-200 hover:border-violet-500 p-5 rounded-3xl flex items-center gap-5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-100"
              >
                <div className="bg-slate-50 group-hover:bg-violet-50 p-4 rounded-2xl transition-colors">
                  <Building2 className="w-8 h-8 text-slate-400 group-hover:text-violet-600" />
                </div>

                <div className="flex-1">
                  <h4 className="text-lg font-black text-slate-800 group-hover:text-violet-700">
                    Trường đăng ký bản quyền lần đầu
                  </h4>
                  <p className="text-sm text-slate-500 mt-1 leading-6">
                    Dành cho đơn vị chưa từng được cấp mã định danh trên hệ thống.
                  </p>
                </div>
              </button>
            </div>
          )}

          {authStatus === 'UNREGISTERED' && viewMode !== 'SELECT' && localError && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-2 border border-rose-100">
              <AlertCircle className="w-4 h-4" /> {localError}
            </div>
          )}

          {authStatus === 'UNREGISTERED' && viewMode === 'EXISTING' && (
            <div className="space-y-5 animate-fadeIn">
              <button
                onClick={goSelect}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại lựa chọn
              </button>

              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-indigo-800 text-sm">
                <KeyRound className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5" />
                <p className="leading-6">
                  Nhập mã định danh trường đã được cấp. Admin sẽ duyệt thiết bị này trong giới hạn tối đa{' '}
                  <strong>15 máy/đơn vị</strong>.
                </p>
              </div>

              <DeviceIdBox compact />

              <div className="space-y-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div>
                  <FieldLabel required>Mã định danh trường</FieldLabel>
                  <TextInput
                    value={schoolIdInput}
                    onChange={value => setSchoolIdInput(normalizeSchoolIdInput(value))}
                    placeholder="VD: THCS_CVA"
                    mono
                    className="text-lg"
                  />
                </div>

                <div>
                  <FieldLabel required>Họ tên người sử dụng</FieldLabel>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <TextInput
                      value={userName}
                      onChange={setUserName}
                      placeholder="VD: Nguyễn Văn A"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Chức vụ / bộ phận</FieldLabel>
                    <TextInput
                      value={userRole}
                      onChange={setUserRole}
                      placeholder="VD: Giáo viên, Văn phòng"
                    />
                  </div>

                  <div>
                    <FieldLabel>Số điện thoại</FieldLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <TextInput
                        value={phone}
                        onChange={setPhone}
                        placeholder="Không bắt buộc"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <FieldLabel required>Tên máy / ghi chú thiết bị</FieldLabel>
                  <div className="relative">
                    <Laptop className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <TextInput
                      value={deviceName}
                      onChange={setDeviceName}
                      placeholder="VD: Máy văn phòng, máy hiệu trưởng, laptop cá nhân..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <button
                  onClick={onSubmitExisting}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg transition-all mt-2"
                >
                  Gửi yêu cầu cấp phép thiết bị
                </button>
              </div>
            </div>
          )}

          {authStatus === 'UNREGISTERED' && viewMode === 'NEW' && (
            <div className="space-y-5 animate-fadeIn">
              <button
                onClick={goSelect}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại lựa chọn
              </button>

              <DeviceIdBox compact />

              <div className="space-y-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div>
                  <FieldLabel required>Tên đơn vị / Trường học</FieldLabel>
                  <TextInput
                    value={orgFormValues.orgName || ''}
                    onChange={value => setOrgFormValues({ ...orgFormValues, orgName: value })}
                    placeholder="VD: Trường THCS Chu Văn An"
                  />
                </div>

                <div>
                  <FieldLabel required>Mã định danh mong muốn</FieldLabel>
                  <TextInput
                    value={orgFormValues.schoolId || ''}
                    onChange={value =>
                      setOrgFormValues({
                        ...orgFormValues,
                        schoolId: normalizeSchoolIdInput(value),
                      })
                    }
                    placeholder="VD: THCS_CVA"
                    mono
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Cơ quan chủ quản</FieldLabel>
                    <TextInput
                      value={orgFormValues.governingBody || ''}
                      onChange={value =>
                        setOrgFormValues({
                          ...orgFormValues,
                          governingBody: value,
                        })
                      }
                      placeholder="VD: UBND xã Ea Kar"
                    />
                  </div>

                  <div>
                    <FieldLabel>Địa phương</FieldLabel>
                    <TextInput
                      value={orgFormValues.location || ''}
                      onChange={value => setOrgFormValues({ ...orgFormValues, location: value })}
                      placeholder="VD: Ea Kar"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Danh sách tổ/bộ phận</FieldLabel>
                  <TextInput
                    value={orgFormValues.departments || ''}
                    onChange={value =>
                      setOrgFormValues({
                        ...orgFormValues,
                        departments: value,
                      })
                    }
                    placeholder="VD: Tổ Toán - Tin học, Tổ Văn phòng"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Đảng bộ cấp trên</FieldLabel>
                    <TextInput
                      value={orgFormValues.partyUpper || ''}
                      onChange={value =>
                        setOrgFormValues({
                          ...orgFormValues,
                          partyUpper: value,
                        })
                      }
                      placeholder="VD: Đảng bộ xã Ea Kar"
                    />
                  </div>

                  <div>
                    <FieldLabel>Chi bộ</FieldLabel>
                    <TextInput
                      value={orgFormValues.partyCell || ''}
                      onChange={value =>
                        setOrgFormValues({
                          ...orgFormValues,
                          partyCell: value,
                        })
                      }
                      placeholder="VD: Chi bộ trường THCS Chu Văn An"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm font-black text-slate-700 mb-3">
                    Thông tin thiết bị đầu tiên
                  </p>

                  <div className="space-y-4">
                    <div>
                      <FieldLabel required>Họ tên người đại diện / người sử dụng</FieldLabel>
                      <TextInput
                        value={userName}
                        onChange={setUserName}
                        placeholder="VD: Lại Cao Đằng"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Chức vụ / bộ phận</FieldLabel>
                        <TextInput
                          value={userRole}
                          onChange={setUserRole}
                          placeholder="VD: Quản trị, Văn phòng"
                        />
                      </div>

                      <div>
                        <FieldLabel>Số điện thoại</FieldLabel>
                        <TextInput
                          value={phone}
                          onChange={setPhone}
                          placeholder="Không bắt buộc"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel required>Tên máy / ghi chú thiết bị</FieldLabel>
                      <TextInput
                        value={deviceName}
                        onChange={setDeviceName}
                        placeholder="VD: Máy quản trị đầu tiên"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={onSubmitNewSchool}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all mt-4"
                >
                  Gửi yêu cầu đăng ký đơn vị
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};