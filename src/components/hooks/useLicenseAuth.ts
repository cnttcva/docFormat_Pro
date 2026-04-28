// File: src/components/hooks/useLicenseAuth.ts
import { useEffect, useState } from 'react';
import { OrgInfo } from '../../types';
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

type AuthStatus = 'REGISTERED' | 'PENDING' | 'UNREGISTERED';

type RegisterRequestPayload = {
  requestType?: 'NEW_SCHOOL' | 'EXISTING_SCHOOL';
  schoolId?: string;
  requestedSchoolId?: string;
  userName?: string;
  userRole?: string;
  deviceName?: string;
  phone?: string;
};

type LicenseNotice = {
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  status?: string;
};

const DEVICE_STORAGE_KEY = 'docFormat_deviceId';
const ORG_STORAGE_KEY = 'docFormat_OrgInfo';
const PENDING_STORAGE_KEY = 'docFormat_PendingAuth';

const normalizeSchoolId = (value: string) => {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

const normalizeDepartments = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).map(v => v.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }

  return [];
};

const getNowIso = () => new Date().toISOString();

const getTimeValue = (value: any): number => {
  try {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'string') return new Date(value).getTime();
    return 0;
  } catch {
    return 0;
  }
};

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);

  if (!deviceId) {
    const randomPart =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as any).randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
        : Math.random().toString(36).substring(2, 14).toUpperCase();

    deviceId = `DOCDEVICE_${randomPart}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }

  return deviceId;
};

export const useLicenseAuth = () => {
  const [orgInfo, setOrgInfo] = useState<OrgInfo | undefined>(() => {
    const saved = localStorage.getItem(ORG_STORAGE_KEY);
    return saved ? JSON.parse(saved) : undefined;
  });

  const [pendingAuth, setPendingAuth] = useState<any>(() => {
    const saved = localStorage.getItem(PENDING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : undefined;
  });

  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    if (localStorage.getItem(ORG_STORAGE_KEY)) return 'REGISTERED';
    if (localStorage.getItem(PENDING_STORAGE_KEY)) return 'PENDING';
    return 'UNREGISTERED';
  });

  const [unlockCode, setUnlockCode] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [licenseNotice, setLicenseNotice] = useState<LicenseNotice | null>(null);

  const [orgFormValues, setOrgFormValues] = useState<{
    governingBody: string;
    orgName: string;
    partyUpper: string;
    partyCell: string;
    location: string;
    departments: string;
    schoolId: string;
  }>({
    governingBody: orgInfo?.governingBody || pendingAuth?.governingBody || '',
    orgName: orgInfo?.orgName || pendingAuth?.orgName || '',
    partyUpper: orgInfo?.partyUpper || pendingAuth?.partyUpper || '',
    partyCell: orgInfo?.partyCell || pendingAuth?.partyCell || '',
    location: orgInfo?.location || pendingAuth?.location || '',
    departments: orgInfo?.departments
      ? orgInfo.departments.join(', ')
      : pendingAuth?.departments || '',
    schoolId: orgInfo?.schoolId || pendingAuth?.schoolId || '',
  });

  const clearLocalLicense = () => {
    localStorage.removeItem(ORG_STORAGE_KEY);
    localStorage.removeItem(PENDING_STORAGE_KEY);

    setOrgInfo(undefined);
    setPendingAuth(undefined);
    setAuthStatus('UNREGISTERED');
    setUnlockCode('');
  };

  const findLicenseBySchoolId = async (schoolId: string) => {
    const normalizedSchoolId = normalizeSchoolId(schoolId);

    const q = query(
      collection(db, 'licenses'),
      where('schoolId', '==', normalizedSchoolId),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) return null;

    const licenseDoc = snap.docs[0];

    return {
      id: licenseDoc.id,
      data: licenseDoc.data(),
    };
  };

  const buildOrgInfo = (licenseData: any, fallbackSchoolId?: string): OrgInfo => {
    return {
      governingBody: licenseData?.governingBody || '',
      orgName: licenseData?.orgName || licenseData?.schoolName || '',
      partyUpper: licenseData?.partyUpper || '',
      partyCell: licenseData?.partyCell || '',
      location: licenseData?.location || '',
      departments: normalizeDepartments(licenseData?.departments),
      schoolId: licenseData?.schoolId || fallbackSchoolId || '',
      receivers: Array.isArray(licenseData?.receivers) ? licenseData.receivers : undefined,
    };
  };

  const saveRegisteredOrg = (
    newOrgInfo: OrgInfo,
    setOptions?: any,
    currentOptions?: any
  ) => {
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(newOrgInfo));
    localStorage.removeItem(PENDING_STORAGE_KEY);

    setOrgInfo(newOrgInfo);
    setPendingAuth(undefined);
    setAuthStatus('REGISTERED');
    setUnlockCode('');

    if (
      setOptions &&
      currentOptions &&
      newOrgInfo.departments &&
      newOrgInfo.departments.length > 0
    ) {
      if (
        !currentOptions.departmentName ||
        !newOrgInfo.departments.includes(currentOptions.departmentName)
      ) {
        setOptions({
          ...currentOptions,
          departmentName: newOrgInfo.departments[0],
        });
      }
    }
  };

  const findLatestRequestByDeviceId = async (deviceId: string) => {
    const q = query(
      collection(db, 'licenseRequests'),
      where('deviceId', '==', deviceId),
      limit(20)
    );

    const snap = await getDocs(q);

    if (snap.empty) return null;

    const requests = snap.docs
      .map(requestDoc => ({
        id: requestDoc.id,
        data: requestDoc.data(),
      }))
      .sort((a, b) => {
        const bTime = getTimeValue(b.data.updatedAt || b.data.createdAt);
        const aTime = getTimeValue(a.data.updatedAt || a.data.createdAt);
        return bTime - aTime;
      });

    return requests[0] || null;
  };

  const findPendingRequestByDeviceId = async (deviceId: string) => {
    const latestRequest = await findLatestRequestByDeviceId(deviceId);

    if (!latestRequest) return null;

    if (latestRequest.data?.status === 'PENDING') {
      return latestRequest;
    }

    return null;
  };

  const loadLicenseDataFromDevice = async (deviceData: any) => {
    let licenseData: any = null;

    if (deviceData.licenseDocId) {
      const licenseRef = doc(db, 'licenses', deviceData.licenseDocId);
      const licenseSnap = await getDoc(licenseRef);

      if (licenseSnap.exists()) {
        licenseData = {
          id: licenseSnap.id,
          ...licenseSnap.data(),
        };
      }
    }

    if (!licenseData && deviceData.schoolId) {
      const license = await findLicenseBySchoolId(deviceData.schoolId);

      if (license) {
        licenseData = {
          id: license.id,
          ...license.data,
        };
      }
    }

    return licenseData;
  };

  const tryUpdateLastSeenAt = async (deviceId: string) => {
    try {
      const deviceRef = doc(db, 'licenseDevices', deviceId);

      await updateDoc(deviceRef, {
        lastSeenAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn(
        'Không thể cập nhật lastSeenAt do Firestore Rules. Bỏ qua và tiếp tục mở khóa bản quyền:',
        error
      );
    }
  };

  const verifyCurrentDeviceLicense = async (
    setOptions?: any,
    currentOptions?: any,
    options?: { silent?: boolean }
  ) => {
    const silent = options?.silent === true;
    setIsCheckingLicense(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const deviceRef = doc(db, 'licenseDevices', deviceId);
      const deviceSnap = await getDoc(deviceRef);

      if (!deviceSnap.exists()) {
        const latestRequest = await findLatestRequestByDeviceId(deviceId);

        if (latestRequest?.data?.status === 'PENDING') {
          const localPending = {
            id: latestRequest.id,
            ...latestRequest.data,
          };

          localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(localPending));
          localStorage.removeItem(ORG_STORAGE_KEY);

          setOrgInfo(undefined);
          setPendingAuth(localPending);
          setAuthStatus('PENDING');

          setLicenseNotice({
            type: 'INFO',
            status: 'PENDING',
            message: 'Yêu cầu cấp phép của thiết bị này đang chờ Admin duyệt.',
          });

          if (!silent) {
            alert('Yêu cầu của thiết bị này vẫn đang chờ Admin duyệt.');
          }

          return false;
        }

        if (latestRequest?.data?.status === 'REJECTED') {
          clearLocalLicense();

          setLicenseNotice({
            type: 'ERROR',
            status: 'REJECTED',
            message: 'Yêu cầu cấp phép của thiết bị này đã bị từ chối.',
          });

          if (!silent) {
            alert('Yêu cầu cấp phép của thiết bị này đã bị từ chối. Vui lòng liên hệ Admin.');
          }

          return false;
        }

        if (latestRequest?.data?.status === 'APPROVED') {
          clearLocalLicense();

          setLicenseNotice({
            type: 'WARNING',
            status: 'APPROVED_BUT_DEVICE_MISSING',
            message:
              'Yêu cầu đã được duyệt nhưng chưa tìm thấy thiết bị ACTIVE. Vui lòng bấm Cập nhật làm mới trong Admin hoặc kiểm tra dữ liệu Firebase.',
          });

          if (!silent) {
            alert(
              'Yêu cầu đã được duyệt nhưng chưa tìm thấy thiết bị ACTIVE. Vui lòng kiểm tra lại dữ liệu cấp phép trong Admin.'
            );
          }

          return false;
        }

        clearLocalLicense();

        setLicenseNotice({
          type: 'INFO',
          status: 'UNREGISTERED',
          message: 'Thiết bị này chưa được cấp phép.',
        });

        if (!silent) {
          alert('Thiết bị này chưa được cấp phép. Vui lòng gửi yêu cầu đăng ký bản quyền.');
        }

        return false;
      }

      const deviceData = deviceSnap.data();
      const deviceStatus = deviceData?.status || 'UNKNOWN';

      if (deviceStatus !== 'ACTIVE') {
        clearLocalLicense();

        let message = 'Thiết bị này chưa ở trạng thái ACTIVE.';

        if (deviceStatus === 'PENDING') {
          message = 'Thiết bị này đang chờ Admin duyệt.';
        }

        if (deviceStatus === 'REVOKED') {
          message = 'Thiết bị này đã bị thu hồi bản quyền.';
        }

        if (deviceStatus === 'BLOCKED') {
          message = 'Thiết bị này đã bị khóa.';
        }

        setLicenseNotice({
          type: deviceStatus === 'PENDING' ? 'INFO' : 'ERROR',
          status: deviceStatus,
          message,
        });

        if (!silent) {
          alert(message);
        }

        return false;
      }

      const licenseData = await loadLicenseDataFromDevice(deviceData);

      if (!licenseData) {
        clearLocalLicense();

        setLicenseNotice({
          type: 'ERROR',
          status: 'LICENSE_NOT_FOUND',
          message: 'Không tìm thấy hồ sơ bản quyền của đơn vị.',
        });

        if (!silent) {
          alert('Không tìm thấy hồ sơ bản quyền của đơn vị.');
        }

        return false;
      }

      if (licenseData.status !== 'ACTIVE') {
        clearLocalLicense();

        const message =
          licenseData.status === 'BLOCKED'
            ? 'Bản quyền của đơn vị này đã bị khóa.'
            : 'Bản quyền của đơn vị chưa hoạt động hoặc đã bị khóa.';

        setLicenseNotice({
          type: 'ERROR',
          status: licenseData.status || 'LICENSE_NOT_ACTIVE',
          message,
        });

        if (!silent) {
          alert(message);
        }

        return false;
      }

      const newOrgInfo = buildOrgInfo(licenseData, deviceData.schoolId);
      saveRegisteredOrg(newOrgInfo, setOptions, currentOptions);

      setLicenseNotice({
        type: 'SUCCESS',
        status: 'ACTIVE',
        message: 'Thiết bị này đã được cấp phép và đang hoạt động.',
      });

      await tryUpdateLastSeenAt(deviceId);

      if (!silent) {
        alert('Kích hoạt thành công. Thiết bị này đã được cấp phép.');
      }

      return true;
    } catch (error: any) {
      console.error('Lỗi kiểm tra bản quyền:', error);

      setLicenseNotice({
        type: 'ERROR',
        status: 'CHECK_ERROR',
        message: 'Đã xảy ra lỗi khi kiểm tra bản quyền.',
      });

      if (!silent) {
        alert('Đã xảy ra lỗi khi kiểm tra bản quyền: ' + (error?.message || String(error)));
      }

      return false;
    } finally {
      setIsCheckingLicense(false);
    }
  };

  useEffect(() => {
    verifyCurrentDeviceLicense(undefined, undefined, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegisterRequest = async (payload?: RegisterRequestPayload) => {
    const requestType = payload?.requestType || 'NEW_SCHOOL';
    const deviceId = getOrCreateDeviceId();

    try {
      const existingDeviceRef = doc(db, 'licenseDevices', deviceId);
      const existingDeviceSnap = await getDoc(existingDeviceRef);

      if (existingDeviceSnap.exists()) {
        const existingDevice = existingDeviceSnap.data();

        if (existingDevice.status === 'ACTIVE') {
          const licenseData = await loadLicenseDataFromDevice(existingDevice);

          if (licenseData?.status === 'ACTIVE') {
            const newOrgInfo = buildOrgInfo(licenseData, existingDevice.schoolId);
            saveRegisteredOrg(newOrgInfo);

            await tryUpdateLastSeenAt(deviceId);

            alert('Thiết bị này đã được cấp phép trước đó. Hệ thống đã mở khóa.');
            return true;
          }
        }

        if (existingDevice.status === 'REVOKED') {
          alert('Thiết bị này đã bị thu hồi bản quyền. Vui lòng liên hệ Admin để được cấp lại.');
          return false;
        }

        if (existingDevice.status === 'BLOCKED') {
          alert('Thiết bị này đã bị khóa. Vui lòng liên hệ Admin.');
          return false;
        }
      }

      const pendingRequest = await findPendingRequestByDeviceId(deviceId);

      if (pendingRequest) {
        const localPending = {
          id: pendingRequest.id,
          ...pendingRequest.data,
        };

        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(localPending));
        localStorage.removeItem(ORG_STORAGE_KEY);

        setOrgInfo(undefined);
        setPendingAuth(localPending);
        setAuthStatus('PENDING');

        alert('Thiết bị này đã có yêu cầu đang chờ duyệt.');
        return true;
      }

      if (requestType === 'EXISTING_SCHOOL') {
        const schoolId = normalizeSchoolId(payload?.schoolId || '');

        if (!schoolId) {
          alert('Vui lòng nhập Mã định danh trường.');
          return false;
        }

        if (!payload?.userName?.trim()) {
          alert('Vui lòng nhập Họ tên người sử dụng.');
          return false;
        }

        if (!payload?.deviceName?.trim()) {
          alert('Vui lòng nhập Tên máy / ghi chú thiết bị.');
          return false;
        }

        const license = await findLicenseBySchoolId(schoolId);

        if (!license) {
          alert('Không tìm thấy trường có Mã định danh này trong hệ thống.');
          return false;
        }

        if (license.data.status !== 'ACTIVE') {
          alert('Bản quyền của đơn vị này chưa hoạt động hoặc đã bị khóa.');
          return false;
        }

        const maxDevices = Number(license.data.maxDevices || 15);
        const activeDeviceCount = Number(license.data.activeDeviceCount || 0);

        if (activeDeviceCount >= maxDevices) {
          alert(
            `Đơn vị ${schoolId} đã đạt giới hạn ${activeDeviceCount}/${maxDevices} thiết bị. Vui lòng liên hệ Admin để thu hồi một thiết bị cũ trước.`
          );
          return false;
        }

        const requestPayload = {
          requestType: 'EXISTING_SCHOOL',
          schoolId,
          licenseDocId: license.id,
          orgName: license.data.orgName || '',
          deviceId,
          deviceName: payload.deviceName.trim(),
          userName: payload.userName.trim(),
          userRole: payload.userRole?.trim() || '',
          phone: payload.phone?.trim() || '',
          status: 'PENDING',
        };

        const docRef = await addDoc(collection(db, 'licenseRequests'), {
          ...requestPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const localPending = {
          ...requestPayload,
          id: docRef.id,
          createdAt: getNowIso(),
          updatedAt: getNowIso(),
        };

        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(localPending));
        localStorage.removeItem(ORG_STORAGE_KEY);

        setOrgInfo(undefined);
        setPendingAuth(localPending);
        setAuthStatus('PENDING');

        alert('Đã gửi yêu cầu cấp phép thiết bị. Vui lòng chờ Admin duyệt.');
        return true;
      }

      const requestedSchoolId = normalizeSchoolId(
        payload?.requestedSchoolId || payload?.schoolId || orgFormValues.schoolId
      );

      if (!orgFormValues.orgName.trim()) {
        alert('Vui lòng nhập Tên Đơn vị / Trường học.');
        return false;
      }

      if (!requestedSchoolId) {
        alert('Vui lòng nhập Mã định danh mong muốn, ví dụ: THCS_CVA.');
        return false;
      }

      if (!payload?.userName?.trim()) {
        alert('Vui lòng nhập Họ tên người sử dụng.');
        return false;
      }

      if (!payload?.deviceName?.trim()) {
        alert('Vui lòng nhập Tên máy / ghi chú thiết bị.');
        return false;
      }

      const existedLicense = await findLicenseBySchoolId(requestedSchoolId);

      if (existedLicense) {
        alert(
          `Mã định danh ${requestedSchoolId} đã tồn tại. Nếu trường đã có mã, hãy chọn "Trường đã có mã định danh".`
        );
        return false;
      }

      const requestPayload = {
        requestType: 'NEW_SCHOOL',
        requestedSchoolId,
        schoolId: requestedSchoolId,
        orgName: orgFormValues.orgName.trim(),
        governingBody: orgFormValues.governingBody.trim(),
        location: orgFormValues.location.trim(),
        partyUpper: orgFormValues.partyUpper.trim(),
        partyCell: orgFormValues.partyCell.trim(),
        departments: orgFormValues.departments.trim(),
        deviceId,
        deviceName: payload.deviceName.trim(),
        userName: payload.userName.trim(),
        userRole: payload.userRole?.trim() || '',
        phone: payload.phone?.trim() || '',
        status: 'PENDING',
      };

      const docRef = await addDoc(collection(db, 'licenseRequests'), {
        ...requestPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const localPending = {
        ...requestPayload,
        id: docRef.id,
        createdAt: getNowIso(),
        updatedAt: getNowIso(),
      };

      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(localPending));
      localStorage.removeItem(ORG_STORAGE_KEY);

      setOrgInfo(undefined);
      setPendingAuth(localPending);
      setAuthStatus('PENDING');

      alert('Đã gửi yêu cầu đăng ký đơn vị mới. Vui lòng chờ Admin duyệt.');
      return true;
    } catch (error: any) {
      console.error('Lỗi gửi yêu cầu bản quyền:', error);
      alert('Đã xảy ra lỗi khi gửi yêu cầu: ' + (error?.message || String(error)));
      return false;
    }
  };

  const handleActivate = async (setOptions?: any, currentOptions?: any) => {
    return verifyCurrentDeviceLicense(setOptions, currentOptions, { silent: false });
  };

  const handleCancelRegistration = async () => {
    try {
      const requestId = pendingAuth?.id;

      if (requestId) {
        await updateDoc(doc(db, 'licenseRequests', requestId), {
          status: 'CANCELLED',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn('Không thể cập nhật trạng thái hủy yêu cầu:', error);
    } finally {
      localStorage.removeItem(PENDING_STORAGE_KEY);
      localStorage.removeItem(ORG_STORAGE_KEY);

      setOrgInfo(undefined);
      setPendingAuth(undefined);
      setAuthStatus('UNREGISTERED');
      setUnlockCode('');

      setLicenseNotice({
        type: 'INFO',
        status: 'CANCELLED',
        message: 'Bạn đã hủy yêu cầu đăng ký bản quyền.',
      });
    }
  };

  const handleRemoveLicense = async () => {
    try {
      const deviceId = getOrCreateDeviceId();
      const deviceRef = doc(db, 'licenseDevices', deviceId);
      const deviceSnap = await getDoc(deviceRef);

      if (deviceSnap.exists() && deviceSnap.data()?.status === 'ACTIVE') {
        const deviceData = deviceSnap.data();

        try {
          await updateDoc(deviceRef, {
            status: 'REVOKED',
            revokedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          if (deviceData.licenseDocId) {
            await updateDoc(doc(db, 'licenses', deviceData.licenseDocId), {
              activeDeviceCount: increment(-1),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (firebaseError) {
          console.warn(
            'Người dùng hiện không có quyền tự thu hồi thiết bị trên Firebase. Chỉ xóa dữ liệu cục bộ:',
            firebaseError
          );
        }
      }
    } catch (error) {
      console.warn('Không thể kiểm tra thiết bị trước khi xóa bản quyền cục bộ:', error);
    } finally {
      localStorage.removeItem(ORG_STORAGE_KEY);
      localStorage.removeItem(PENDING_STORAGE_KEY);

      setOrgInfo(undefined);
      setPendingAuth(undefined);
      setAuthStatus('UNREGISTERED');

      setLicenseNotice({
        type: 'WARNING',
        status: 'LOCAL_REMOVED',
        message:
          'Thông tin bản quyền cục bộ đã được xóa. Nếu thiết bị vẫn còn ACTIVE trên máy chủ, app có thể tự mở khóa lại khi kiểm tra bản quyền.',
      });

      window.location.reload();
    }
  };

  return {
    orgInfo,
    pendingAuth,
    authStatus,
    unlockCode,
    setUnlockCode,
    confirmRemove,
    setConfirmRemove,
    orgFormValues,
    setOrgFormValues,
    isCheckingLicense,
    licenseNotice,
    handleRegisterRequest,
    handleActivate,
    handleCancelRegistration,
    handleRemoveLicense,
  };
};