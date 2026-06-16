import {
  getRemainingTrialUses,
  getTrialState,
  isTrialAvailable,
} from './trialService';

export type AccessMode = 'licensed' | 'trial' | 'locked';

export type AccessStatus = {
  canUse: boolean;
  mode: AccessMode;
  trialRemaining: number;
  message?: string;
};

export const getAccessStatus = (isLicensed: boolean): AccessStatus => {
  if (isLicensed) {
    return {
      canUse: true,
      mode: 'licensed',
      trialRemaining: 0,
    };
  }

  const trialState = getTrialState();

  if (trialState.status === 'ACTIVE' && isTrialAvailable()) {
    return {
      canUse: true,
      mode: 'trial',
      trialRemaining: getRemainingTrialUses(),
    };
  }

  if (trialState.status === 'UNREGISTERED') {
    return {
      canUse: false,
      mode: 'locked',
      trialRemaining: 0,
      message:
        'Bạn hãy đăng ký dùng thử / bản quyền. Sau khi đăng ký thông tin lần đầu, bạn sẽ được cấp 5 lượt chuẩn hóa tài liệu miễn phí.',
    };
  }

  if (trialState.status === 'BLOCKED') {
    return {
      canUse: false,
      mode: 'locked',
      trialRemaining: 0,
      message:
        'Tài khoản hoặc thiết bị dùng thử này đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
    };
  }

  return {
    canUse: false,
    mode: 'locked',
    trialRemaining: 0,
    message:
      'Bạn đã dùng hết 5 lượt dùng thử. Vui lòng đăng ký bản quyền chính thức để tiếp tục sử dụng docFormat Pro.',
  };
};