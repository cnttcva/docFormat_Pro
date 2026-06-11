import {
  getRemainingTrialUses,
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

  if (isTrialAvailable()) {
    return {
      canUse: true,
      mode: 'trial',
      trialRemaining: getRemainingTrialUses(),
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