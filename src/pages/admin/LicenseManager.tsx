// File: src/pages/admin/LicenseManager.tsx
import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import {
  Activity,
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  Filter,
  HardDrive,
  Key,
  Loader2,
  MapPin,
  MonitorSmartphone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';

type LicenseRecord = {
  id: string;
  orgName?: string;
  schoolId?: string;
  governingBody?: string;
  location?: string;
  activationCode?: string;
  status?: string;
  licenseType?: string;
  maxDevices?: number;
  activeDeviceCount?: number;
  createdAt?: any;
  updatedAt?: any;
};

type LicenseRequestRecord = {
  id: string;
  requestType?: 'NEW_SCHOOL' | 'EXISTING_SCHOOL';
  orgName?: string;
  schoolId?: string;
  requestedSchoolId?: string;
  licenseDocId?: string;
  governingBody?: string;
  location?: string;
  partyUpper?: string;
  partyCell?: string;
  departments?: string;
  deviceId?: string;
  deviceName?: string;
  userName?: string;
  userRole?: string;
  phone?: string;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
};

type DeviceRecord = {
  id: string;
  deviceId?: string;
  schoolId?: string;
  licenseDocId?: string;
  orgName?: string;
  deviceName?: string;
  userName?: string;
  userRole?: string;
  phone?: string;
  status?: string;
  createdAt?: any;
  activatedAt?: any;
  revokedAt?: any;
  blockedAt?: any;
  restoredAt?: any;
  lastSeenAt?: any;
  updatedAt?: any;
};

type DeviceStatusFilter = 'ALL' | 'ACTIVE' | 'REVOKED' | 'BLOCKED' | 'PENDING';
type SchoolStatusFilter = 'ALL' | 'ACTIVE' | 'BLOCKED' | 'FULL';

const normalizeSchoolId = (value: string) => {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

const normalizeSearch = (value: any) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

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

const formatDate = (value: any) => {
  if (!value) return '—';

  try {
    if (typeof value?.toDate === 'function') {
      return value.toDate().toLocaleString('vi-VN');
    }

    if (typeof value === 'string') {
      return new Date(value).toLocaleString('vi-VN');
    }

    return '—';
  } catch {
    return '—';
  }
};

const getDeviceUsage = (lic: LicenseRecord) => {
  const active = Number(lic.activeDeviceCount || 0);
  const max = Number(lic.maxDevices || 15);
  const percent = max > 0 ? Math.min(100, Math.round((active / max) * 100)) : 0;
  const isFull = active >= max;

  return { active, max, percent, isFull };
};

const StatusBadge = ({ status }: { status?: string }) => {
  const current = status || 'UNKNOWN';

  if (current === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" /> ACTIVE
      </span>
    );
  }

  if (current === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200">
        <Clock className="w-3.5 h-3.5" /> PENDING
      </span>
    );
  }

  if (current === 'REVOKED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">
        <RotateCcw className="w-3.5 h-3.5" /> REVOKED
      </span>
    );
  }

  if (current === 'BLOCKED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full border border-rose-200">
        <Ban className="w-3.5 h-3.5" /> BLOCKED
      </span>
    );
  }

  if (current === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full border border-rose-200">
        <XCircle className="w-3.5 h-3.5" /> REJECTED
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full border border-slate-200">
      <AlertTriangle className="w-3.5 h-3.5" /> {current}
    </span>
  );
};

export default function LicenseManager() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [requests, setRequests] = useState<LicenseRequestRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<DeviceStatusFilter>('ALL');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState<SchoolStatusFilter>('ALL');

  const fetchAll = async () => {
    setIsLoading(true);

    try {
      const [licenseSnap, requestSnap, deviceSnap] = await Promise.all([
        getDocs(collection(db, 'licenses')),
        getDocs(collection(db, 'licenseRequests')),
        getDocs(collection(db, 'licenseDevices')),
      ]);

      const licenseData: LicenseRecord[] = licenseSnap.docs
        .map(d => ({
          id: d.id,
          ...(d.data() as Omit<LicenseRecord, 'id'>),
        }))
        .sort((a, b) => normalizeSearch(a.orgName).localeCompare(normalizeSearch(b.orgName)));

      const requestData: LicenseRequestRecord[] = requestSnap.docs
        .map(d => ({
          id: d.id,
          ...(d.data() as Omit<LicenseRequestRecord, 'id'>),
        }))
        .sort(
          (a, b) =>
            getTimeValue(b.createdAt || b.updatedAt) -
            getTimeValue(a.createdAt || a.updatedAt)
        );

      const deviceData: DeviceRecord[] = deviceSnap.docs
        .map(d => ({
          id: d.id,
          ...(d.data() as Omit<DeviceRecord, 'id'>),
        }))
        .sort(
          (a, b) =>
            getTimeValue(b.lastSeenAt || b.activatedAt || b.createdAt) -
            getTimeValue(a.lastSeenAt || a.activatedAt || a.createdAt)
        );

      setLicenses(licenseData);
      setRequests(requestData);
      setDevices(deviceData);
    } catch (error) {
      console.error('Lỗi tải dữ liệu bản quyền:', error);
      alert('Không thể tải dữ liệu bản quyền.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
      data: licenseDoc.data() as Omit<LicenseRecord, 'id'>,
    };
  };

  const handleApproveRequest = async (req: LicenseRequestRecord) => {
    if (req.status !== 'PENDING') {
      alert('Yêu cầu này không còn ở trạng thái chờ duyệt.');
      return;
    }

    if (!req.deviceId) {
      alert('Yêu cầu thiếu deviceId.');
      return;
    }

    const requestDeviceId = req.deviceId;
    setActionLoadingId(req.id);

    try {
      if (req.requestType === 'NEW_SCHOOL') {
        const schoolId = normalizeSchoolId(req.requestedSchoolId || req.schoolId || '');

        if (!schoolId) {
          alert('Yêu cầu trường mới thiếu schoolId.');
          return;
        }

        const existed = await findLicenseBySchoolId(schoolId);

        if (existed) {
          alert(`Mã định danh ${schoolId} đã tồn tại. Không thể tạo trường mới trùng mã.`);
          return;
        }

        const licenseRef = doc(collection(db, 'licenses'));
        const requestRef = doc(db, 'licenseRequests', req.id);
        const deviceRef = doc(db, 'licenseDevices', requestDeviceId);

        await runTransaction(db, async tx => {
          const requestSnap = await tx.get(requestRef);

          if (!requestSnap.exists()) {
            throw new Error('Yêu cầu không tồn tại.');
          }

          const requestData = requestSnap.data() as Partial<LicenseRequestRecord>;

          if (requestData.status !== 'PENDING') {
            throw new Error('Yêu cầu này đã được xử lý trước đó.');
          }

          tx.set(licenseRef, {
            orgName: req.orgName || '',
            schoolId,
            governingBody: req.governingBody || '',
            location: req.location || '',
            partyUpper: req.partyUpper || '',
            partyCell: req.partyCell || '',
            departments: req.departments || '',
            status: 'ACTIVE',
            licenseType: 'SCHOOL',
            maxDevices: 15,
            activeDeviceCount: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          tx.set(deviceRef, {
            deviceId: requestDeviceId,
            schoolId,
            licenseDocId: licenseRef.id,
            orgName: req.orgName || '',
            deviceName: req.deviceName || '',
            userName: req.userName || '',
            userRole: req.userRole || '',
            phone: req.phone || '',
            status: 'ACTIVE',
            createdAt: serverTimestamp(),
            activatedAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          tx.update(requestRef, {
            status: 'APPROVED',
            licenseDocId: licenseRef.id,
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        alert('Đã tạo trường mới và cấp phép thiết bị đầu tiên.');
        await fetchAll();
        return;
      }

      const schoolId = normalizeSchoolId(req.schoolId || '');
      let licenseId = req.licenseDocId;

      if (!licenseId && schoolId) {
        const found = await findLicenseBySchoolId(schoolId);
        licenseId = found?.id;
      }

      if (!licenseId) {
        alert('Không tìm thấy hồ sơ bản quyền của trường.');
        return;
      }

      const requestRef = doc(db, 'licenseRequests', req.id);
      const licenseRef = doc(db, 'licenses', licenseId);
      const deviceRef = doc(db, 'licenseDevices', requestDeviceId);

      await runTransaction(db, async tx => {
        const requestSnap = await tx.get(requestRef);
        const licenseSnap = await tx.get(licenseRef);
        const deviceSnap = await tx.get(deviceRef);

        if (!requestSnap.exists()) {
          throw new Error('Yêu cầu không tồn tại.');
        }

        const requestData = requestSnap.data() as Partial<LicenseRequestRecord>;

        if (requestData.status !== 'PENDING') {
          throw new Error('Yêu cầu này đã được xử lý trước đó.');
        }

        if (!licenseSnap.exists()) {
          throw new Error('Hồ sơ bản quyền của trường không tồn tại.');
        }

        const licenseData = licenseSnap.data() as Partial<LicenseRecord>;
        const maxDevices = Number(licenseData.maxDevices || 15);
        const activeDeviceCount = Number(licenseData.activeDeviceCount || 0);

        if (licenseData.status !== 'ACTIVE') {
          throw new Error('Bản quyền của trường chưa hoạt động hoặc đã bị khóa.');
        }

        if (deviceSnap.exists()) {
          const existingDeviceData = deviceSnap.data() as Partial<DeviceRecord>;
          const existingStatus = existingDeviceData.status;

          if (existingStatus === 'ACTIVE') {
            throw new Error('Thiết bị này đã được cấp phép trước đó.');
          }

          if (existingStatus === 'BLOCKED') {
            throw new Error('Thiết bị này đang bị khóa. Vui lòng mở khóa hoặc kiểm tra lại trước khi cấp phép.');
          }
        }

        if (activeDeviceCount >= maxDevices) {
          throw new Error(
            `Đơn vị đã đạt giới hạn ${activeDeviceCount}/${maxDevices} thiết bị. Vui lòng thu hồi thiết bị cũ trước.`
          );
        }

        tx.set(
          deviceRef,
          {
            deviceId: requestDeviceId,
            schoolId: licenseData.schoolId || schoolId,
            licenseDocId: licenseId,
            orgName: licenseData.orgName || req.orgName || '',
            deviceName: req.deviceName || '',
            userName: req.userName || '',
            userRole: req.userRole || '',
            phone: req.phone || '',
            status: 'ACTIVE',
            createdAt: serverTimestamp(),
            activatedAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        tx.update(licenseRef, {
          activeDeviceCount: activeDeviceCount + 1,
          updatedAt: serverTimestamp(),
        });

        tx.update(requestRef, {
          status: 'APPROVED',
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      alert('Đã cấp phép thiết bị thành công.');
      await fetchAll();
    } catch (error: any) {
      console.error('Lỗi cấp phép:', error);
      alert(error?.message || 'Không thể cấp phép yêu cầu này.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (req: LicenseRequestRecord) => {
    if (!window.confirm('Từ chối yêu cầu này?')) return;

    setActionLoadingId(req.id);

    try {
      await updateDoc(doc(db, 'licenseRequests', req.id), {
        status: 'REJECTED',
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await fetchAll();
    } catch (error) {
      console.error('Lỗi từ chối yêu cầu:', error);
      alert('Không thể từ chối yêu cầu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRequest = async (req: LicenseRequestRecord) => {
    if (!window.confirm('Xóa vĩnh viễn yêu cầu này?')) return;

    try {
      await deleteDoc(doc(db, 'licenseRequests', req.id));
      await fetchAll();
    } catch (error) {
      console.error('Lỗi xóa yêu cầu:', error);
      alert('Không thể xóa yêu cầu.');
    }
  };

  const handleToggleSchoolStatus = async (lic: LicenseRecord) => {
    const nextStatus = lic.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

    if (!window.confirm(`${nextStatus === 'BLOCKED' ? 'Khóa' : 'Mở khóa'} đơn vị ${lic.orgName}?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'licenses', lic.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      await fetchAll();
    } catch (error) {
      console.error('Lỗi cập nhật trường:', error);
      alert('Không thể cập nhật trạng thái trường.');
    }
  };

  const handleDeleteSchool = async (lic: LicenseRecord) => {
    if (lic.status !== 'BLOCKED') {
      alert('Chỉ có thể xóa trường sau khi đã Khóa trường.');
      return;
    }

    const schoolName = lic.orgName || lic.schoolId || 'đơn vị này';

    const confirmMessage =
      `XÓA TRƯỜNG KHỎI DANH SÁCH BẢN QUYỀN?\n\n` +
      `Đơn vị: ${schoolName}\n` +
      `School ID: ${lic.schoolId || '—'}\n\n` +
      `Hệ thống sẽ xóa:\n` +
      `- Hồ sơ trường trong collection licenses\n` +
      `- Toàn bộ thiết bị thuộc trường trong collection licenseDevices\n\n` +
      `Hệ thống KHÔNG xóa licenseRequests để giữ lịch sử truy vết.\n\n` +
      `Sau khi xóa, nếu đơn vị muốn dùng lại thì phải đăng ký như TRƯỜNG MỚI.\n\n` +
      `Bạn chắc chắn muốn xóa?`;

    if (!window.confirm(confirmMessage)) return;

    setActionLoadingId(`delete-school-${lic.id}`);

    try {
      const deviceRefs = new Map<string, any>();

      const byLicenseSnap = await getDocs(
        query(collection(db, 'licenseDevices'), where('licenseDocId', '==', lic.id))
      );

      byLicenseSnap.docs.forEach(deviceDoc => {
        deviceRefs.set(deviceDoc.id, deviceDoc.ref);
      });

      if (lic.schoolId) {
        const bySchoolSnap = await getDocs(
          query(collection(db, 'licenseDevices'), where('schoolId', '==', lic.schoolId))
        );

        bySchoolSnap.docs.forEach(deviceDoc => {
          deviceRefs.set(deviceDoc.id, deviceDoc.ref);
        });
      }

      const batch = writeBatch(db);

      deviceRefs.forEach(deviceRef => {
        batch.delete(deviceRef);
      });

      batch.delete(doc(db, 'licenses', lic.id));

      await batch.commit();

      alert(
        `Đã xóa ${schoolName} khỏi danh sách bản quyền.\n` +
          `Đã xóa kèm ${deviceRefs.size} thiết bị thuộc đơn vị này.`
      );

      await fetchAll();
    } catch (error: any) {
      console.error('Lỗi xóa trường:', error);
      alert(error?.message || 'Không thể xóa trường.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeDevice = async (deviceItem: DeviceRecord) => {
    if (deviceItem.status !== 'ACTIVE') {
      alert('Thiết bị này không ở trạng thái ACTIVE.');
      return;
    }

    if (!window.confirm(`Thu hồi thiết bị: ${deviceItem.deviceName || deviceItem.deviceId}?`)) {
      return;
    }

    setActionLoadingId(`revoke-${deviceItem.id}`);

    try {
      const deviceRef = doc(db, 'licenseDevices', deviceItem.id);

      await runTransaction(db, async tx => {
        const deviceSnap = await tx.get(deviceRef);

        if (!deviceSnap.exists()) {
          throw new Error('Thiết bị không tồn tại.');
        }

        const currentDevice = deviceSnap.data() as Partial<DeviceRecord>;

        if (currentDevice.status !== 'ACTIVE') {
          throw new Error('Thiết bị này đã bị thu hồi hoặc không còn hoạt động.');
        }

        let nextActiveDeviceCount: number | null = null;
        let licenseRef: any = null;

        if (currentDevice.licenseDocId) {
          licenseRef = doc(db, 'licenses', currentDevice.licenseDocId);
          const licenseSnap = await tx.get(licenseRef);

          if (licenseSnap.exists()) {
            const licenseData = licenseSnap.data() as Partial<LicenseRecord>;
            const activeCount = Number(licenseData.activeDeviceCount || 0);
            nextActiveDeviceCount = Math.max(0, activeCount - 1);
          }
        }

        tx.update(deviceRef, {
          status: 'REVOKED',
          revokedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (licenseRef && nextActiveDeviceCount !== null) {
          tx.update(licenseRef, {
            activeDeviceCount: nextActiveDeviceCount,
            updatedAt: serverTimestamp(),
          });
        }
      });

      await fetchAll();
    } catch (error: any) {
      console.error('Lỗi thu hồi thiết bị:', error);
      alert(error?.message || 'Không thể thu hồi thiết bị.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockDevice = async (deviceItem: DeviceRecord) => {
    if (deviceItem.status === 'BLOCKED') {
      alert('Thiết bị này đã ở trạng thái BLOCKED.');
      return;
    }

    if (!window.confirm(`Khóa thiết bị: ${deviceItem.deviceName || deviceItem.deviceId}?`)) {
      return;
    }

    setActionLoadingId(`block-${deviceItem.id}`);

    try {
      await runTransaction(db, async tx => {
        const deviceRef = doc(db, 'licenseDevices', deviceItem.id);
        const deviceSnap = await tx.get(deviceRef);

        if (!deviceSnap.exists()) {
          throw new Error('Thiết bị không tồn tại.');
        }

        const currentDevice = deviceSnap.data() as Partial<DeviceRecord>;
        let nextActiveDeviceCount: number | null = null;
        let licenseRef: any = null;

        if (currentDevice.status === 'ACTIVE' && currentDevice.licenseDocId) {
          licenseRef = doc(db, 'licenses', currentDevice.licenseDocId);
          const licenseSnap = await tx.get(licenseRef);

          if (licenseSnap.exists()) {
            const licenseData = licenseSnap.data() as Partial<LicenseRecord>;
            const activeCount = Number(licenseData.activeDeviceCount || 0);
            nextActiveDeviceCount = Math.max(0, activeCount - 1);
          }
        }

        tx.update(deviceRef, {
          status: 'BLOCKED',
          blockedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (licenseRef && nextActiveDeviceCount !== null) {
          tx.update(licenseRef, {
            activeDeviceCount: nextActiveDeviceCount,
            updatedAt: serverTimestamp(),
          });
        }
      });

      await fetchAll();
    } catch (error: any) {
      console.error('Lỗi khóa thiết bị:', error);
      alert(error?.message || 'Không thể khóa thiết bị.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreDevice = async (deviceItem: DeviceRecord) => {
    if (deviceItem.status === 'ACTIVE') {
      alert('Thiết bị này hiện đã ACTIVE.');
      return;
    }

    if (deviceItem.status !== 'REVOKED' && deviceItem.status !== 'BLOCKED') {
      alert('Chỉ có thể phục hồi thiết bị REVOKED hoặc BLOCKED.');
      return;
    }

    if (!window.confirm(`Phục hồi thiết bị: ${deviceItem.deviceName || deviceItem.deviceId}?`)) {
      return;
    }

    setActionLoadingId(`restore-${deviceItem.id}`);

    try {
      let resolvedLicenseId = deviceItem.licenseDocId;

      if (!resolvedLicenseId && deviceItem.schoolId) {
        const foundLicense = await findLicenseBySchoolId(deviceItem.schoolId);
        resolvedLicenseId = foundLicense?.id;
      }

      if (!resolvedLicenseId) {
        alert('Không tìm thấy hồ sơ bản quyền của đơn vị để phục hồi thiết bị.');
        return;
      }

      const deviceRef = doc(db, 'licenseDevices', deviceItem.id);
      const licenseRef = doc(db, 'licenses', resolvedLicenseId);

      await runTransaction(db, async tx => {
        const deviceSnap = await tx.get(deviceRef);
        const licenseSnap = await tx.get(licenseRef);

        if (!deviceSnap.exists()) {
          throw new Error('Thiết bị không tồn tại.');
        }

        if (!licenseSnap.exists()) {
          throw new Error('Hồ sơ bản quyền của đơn vị không tồn tại.');
        }

        const currentDevice = deviceSnap.data() as Partial<DeviceRecord>;
        const licenseData = licenseSnap.data() as Partial<LicenseRecord>;

        if (currentDevice.status === 'ACTIVE') {
          throw new Error('Thiết bị này đã được phục hồi trước đó.');
        }

        if (currentDevice.status !== 'REVOKED' && currentDevice.status !== 'BLOCKED') {
          throw new Error('Chỉ có thể phục hồi thiết bị REVOKED hoặc BLOCKED.');
        }

        if (licenseData.status !== 'ACTIVE') {
          throw new Error('Bản quyền của đơn vị đang bị khóa hoặc chưa hoạt động.');
        }

        const activeDeviceCount = Number(licenseData.activeDeviceCount || 0);
        const maxDevices = Number(licenseData.maxDevices || 15);

        if (activeDeviceCount >= maxDevices) {
          throw new Error(
            `Đơn vị đã đạt giới hạn ${activeDeviceCount}/${maxDevices} thiết bị. Vui lòng thu hồi thiết bị khác trước khi phục hồi.`
          );
        }

        tx.update(deviceRef, {
          status: 'ACTIVE',
          licenseDocId: resolvedLicenseId,
          restoredAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.update(licenseRef, {
          activeDeviceCount: activeDeviceCount + 1,
          updatedAt: serverTimestamp(),
        });
      });

      await fetchAll();
    } catch (error: any) {
      console.error('Lỗi phục hồi thiết bị:', error);
      alert(error?.message || 'Không thể phục hồi thiết bị.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteDevice = async (deviceItem: DeviceRecord) => {
    if (deviceItem.status === 'ACTIVE') {
      alert('Không thể xóa trực tiếp thiết bị ACTIVE. Vui lòng Thu hồi hoặc Khóa thiết bị trước.');
      return;
    }

    if (
      !window.confirm(
        `Xóa vĩnh viễn thiết bị khỏi danh sách?\n\nThiết bị: ${
          deviceItem.deviceName || deviceItem.deviceId
        }\nTrạng thái: ${deviceItem.status || 'UNKNOWN'}`
      )
    ) {
      return;
    }

    setActionLoadingId(`delete-${deviceItem.id}`);

    try {
      const deviceRef = doc(db, 'licenseDevices', deviceItem.id);

      await runTransaction(db, async tx => {
        const deviceSnap = await tx.get(deviceRef);

        if (!deviceSnap.exists()) {
          throw new Error('Thiết bị không tồn tại hoặc đã bị xóa.');
        }

        const currentDevice = deviceSnap.data() as Partial<DeviceRecord>;

        if (currentDevice.status === 'ACTIVE') {
          throw new Error('Không thể xóa thiết bị ACTIVE. Vui lòng Thu hồi hoặc Khóa thiết bị trước.');
        }

        tx.delete(deviceRef);
      });

      await fetchAll();
    } catch (error: any) {
      console.error('Lỗi xóa thiết bị:', error);
      alert(error?.message || 'Không thể xóa thiết bị.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSyncDeviceCount = async (lic: LicenseRecord) => {
    if (!lic.id) return;

    const activeCount = devices.filter(d => {
      const sameLicense = d.licenseDocId === lic.id || d.schoolId === lic.schoolId;
      return sameLicense && d.status === 'ACTIVE';
    }).length;

    if (
      !window.confirm(
        `Đồng bộ số thiết bị ACTIVE của ${lic.orgName || lic.schoolId} thành ${
          activeCount
        }/${lic.maxDevices || 15}?`
      )
    ) {
      return;
    }

    try {
      await updateDoc(doc(db, 'licenses', lic.id), {
        activeDeviceCount: activeCount,
        updatedAt: serverTimestamp(),
      });

      await fetchAll();
    } catch (error) {
      console.error('Lỗi đồng bộ số thiết bị:', error);
      alert('Không thể đồng bộ số thiết bị.');
    }
  };

  const handleCopy = async (text?: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      alert(`Đã copy: ${text}`);
    } catch {
      alert('Không thể copy dữ liệu.');
    }
  };

  const search = normalizeSearch(searchTerm);

  const pendingRequests = requests.filter(req => req.status === 'PENDING');
  const processedRequests = requests.filter(req => req.status !== 'PENDING');

  const filteredPendingRequests = pendingRequests.filter(req => {
    const text = normalizeSearch(
      [
        req.requestType,
        req.orgName,
        req.schoolId,
        req.requestedSchoolId,
        req.deviceId,
        req.deviceName,
        req.userName,
        req.userRole,
        req.phone,
        req.status,
      ].join(' ')
    );

    return !search || text.includes(search);
  });

  const filteredLicenses = licenses.filter(lic => {
    const { isFull } = getDeviceUsage(lic);

    const matchStatus =
      schoolStatusFilter === 'ALL' ||
      (schoolStatusFilter === 'FULL' && isFull) ||
      lic.status === schoolStatusFilter;

    const text = normalizeSearch(
      [
        lic.orgName,
        lic.schoolId,
        lic.governingBody,
        lic.location,
        lic.status,
        lic.activeDeviceCount,
        lic.maxDevices,
      ].join(' ')
    );

    const matchSearch = !search || text.includes(search);

    return matchStatus && matchSearch;
  });

  const filteredDevices = devices.filter(deviceItem => {
    const matchStatus =
      deviceStatusFilter === 'ALL' || deviceItem.status === deviceStatusFilter;

    const text = normalizeSearch(
      [
        deviceItem.deviceId,
        deviceItem.deviceName,
        deviceItem.orgName,
        deviceItem.schoolId,
        deviceItem.userName,
        deviceItem.userRole,
        deviceItem.phone,
        deviceItem.status,
      ].join(' ')
    );

    const matchSearch = !search || text.includes(search);

    return matchStatus && matchSearch;
  });

  const fullSchools = licenses.filter(lic => getDeviceUsage(lic).isFull);
  const activeDeviceCount = devices.filter(d => d.status === 'ACTIVE').length;
  const revokedDeviceCount = devices.filter(d => d.status === 'REVOKED').length;
  const blockedDeviceCount = devices.filter(d => d.status === 'BLOCKED').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Key className="w-6 h-6 text-amber-500" /> Trung Tâm Cấp Phép Bản Quyền
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý trường, thiết bị và yêu cầu cấp phép theo giới hạn 15 máy/đơn vị.
          </p>
        </div>

        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 rounded-xl font-bold transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Cập nhật làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-400 font-black">Đơn vị</p>
          <p className="text-3xl font-black text-slate-800 mt-2">{licenses.length}</p>
          <p className="text-xs text-slate-400 mt-1">Tổng hồ sơ bản quyền</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-400 font-black">Thiết bị ACTIVE</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{activeDeviceCount}</p>
          <p className="text-xs text-slate-400 mt-1">
            REVOKED: {revokedDeviceCount} • BLOCKED: {blockedDeviceCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-400 font-black">Yêu cầu chờ duyệt</p>
          <p className="text-3xl font-black text-amber-600 mt-2">{pendingRequests.length}</p>
          <p className="text-xs text-slate-400 mt-1">Cần Admin xử lý</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-400 font-black">Đơn vị đạt giới hạn</p>
          <p className="text-3xl font-black text-rose-600 mt-2">{fullSchools.length}</p>
          <p className="text-xs text-slate-400 mt-1">Đã dùng hết số thiết bị</p>
        </div>
      </div>

      {fullSchools.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-rose-800">Cảnh báo giới hạn thiết bị</h4>
              <p className="text-sm text-rose-700 mt-1 leading-6">
                Có {fullSchools.length} đơn vị đã đạt giới hạn thiết bị. Cần thu hồi thiết bị cũ trước khi cấp thêm.
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                {fullSchools.map(lic => {
                  const usage = getDeviceUsage(lic);

                  return (
                    <span
                      key={lic.id}
                      className="inline-flex items-center gap-1.5 text-xs font-black bg-white text-rose-700 px-3 py-1.5 rounded-full border border-rose-200"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {lic.schoolId}: {usage.active}/{usage.max}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase font-black text-slate-400 mb-2">
              Tìm kiếm nhanh
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm trường, mã, thiết bị, người dùng..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-black text-slate-400 mb-2">
              Lọc đơn vị
            </label>

            <div className="relative">
              <Filter className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <select
                value={schoolStatusFilter}
                onChange={e => setSchoolStatusFilter(e.target.value as SchoolStatusFilter)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-sm font-bold"
              >
                <option value="ALL">Tất cả đơn vị</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="BLOCKED">Đã khóa</option>
                <option value="FULL">Đạt giới hạn thiết bị</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-black text-slate-400 mb-2">
              Lọc thiết bị
            </label>

            <div className="relative">
              <HardDrive className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <select
                value={deviceStatusFilter}
                onChange={e => setDeviceStatusFilter(e.target.value as DeviceStatusFilter)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-sm font-bold"
              >
                <option value="ALL">Tất cả thiết bị</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="REVOKED">REVOKED</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Kết quả: {filteredLicenses.length} đơn vị • {filteredDevices.length} thiết bị • {filteredPendingRequests.length} yêu cầu chờ
          </span>

          {(searchTerm || deviceStatusFilter !== 'ALL' || schoolStatusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDeviceStatusFilter('ALL');
                setSchoolStatusFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-full px-3 py-1.5 font-bold text-slate-600"
            >
              <XCircle className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <h4 className="font-black text-slate-800">Yêu cầu đang chờ duyệt</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="p-4 font-bold">Loại yêu cầu</th>
                <th className="p-4 font-bold">Đơn vị</th>
                <th className="p-4 font-bold">Thiết bị</th>
                <th className="p-4 font-bold">Người dùng</th>
                <th className="p-4 font-bold">Thời gian</th>
                <th className="p-4 font-bold text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredPendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Không có yêu cầu nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                filteredPendingRequests.map(req => (
                  <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4">
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        {req.requestType === 'NEW_SCHOOL' ? 'Trường mới' : 'Thêm thiết bị'}
                      </span>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-800">{req.orgName || req.schoolId}</p>
                      <p className="font-mono text-xs text-indigo-600 mt-1">
                        {req.requestedSchoolId || req.schoolId}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-700">{req.deviceName}</p>
                      <p className="font-mono text-[11px] text-slate-400">{req.deviceId}</p>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-700">{req.userName}</p>
                      <p className="text-xs text-slate-500">{req.userRole || '—'}</p>
                    </td>

                    <td className="p-4 text-xs text-slate-500">{formatDate(req.createdAt)}</td>

                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          disabled={actionLoadingId === req.id}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-sm disabled:opacity-60"
                        >
                          {actionLoadingId === req.id ? 'Đang xử lý...' : 'Cấp phép'}
                        </button>

                        <button
                          onClick={() => handleRejectRequest(req)}
                          disabled={actionLoadingId === req.id}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold border border-rose-100 disabled:opacity-60"
                        >
                          Từ chối
                        </button>

                        <button
                          onClick={() => handleDeleteRequest(req)}
                          className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl"
                          title="Xóa yêu cầu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <h4 className="font-black text-slate-800">Danh sách đơn vị bản quyền</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="p-4 font-bold">Thông tin đơn vị</th>
                <th className="p-4 font-bold">School ID</th>
                <th className="p-4 font-bold">Thiết bị</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    Không tìm thấy đơn vị phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map(lic => {
                  const usage = getDeviceUsage(lic);
                  const isDeletingSchool = actionLoadingId === `delete-school-${lic.id}`;

                  return (
                    <tr key={lic.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-base">{lic.orgName}</p>
                        <p className="text-[12px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {lic.governingBody || '—'} ({lic.location || '—'})
                        </p>

                        {usage.isFull && (
                          <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Đạt giới hạn thiết bị
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleCopy(lic.schoolId)}
                          className="inline-flex items-center gap-1.5 text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> {lic.schoolId}
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>

                      <td className="p-4 min-w-[190px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-black ${usage.isFull ? 'text-rose-600' : 'text-slate-800'}`}>
                            {usage.active}/{usage.max}
                          </span>
                          <span className="text-xs font-bold text-slate-400">{usage.percent}%</span>
                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usage.isFull
                                ? 'bg-rose-500'
                                : usage.percent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${usage.percent}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="p-4">
                        <StatusBadge status={lic.status} />
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col sm:flex-row justify-center gap-2">
                          <button
                            onClick={() => handleToggleSchoolStatus(lic)}
                            disabled={isDeletingSchool}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border disabled:opacity-50 disabled:cursor-wait ${
                              lic.status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            }`}
                          >
                            {lic.status === 'ACTIVE' ? 'Khóa trường' : 'Mở khóa'}
                          </button>

                          {lic.status === 'BLOCKED' && (
                            <button
                              onClick={() => handleDeleteSchool(lic)}
                              disabled={isDeletingSchool}
                              className="px-4 py-2 rounded-xl text-sm font-bold border bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-wait"
                              title="Xóa trường đã bị khóa khỏi danh sách bản quyền"
                            >
                              {isDeletingSchool ? 'Đang xóa...' : 'Xóa trường'}
                            </button>
                          )}

                          <button
                            onClick={() => handleSyncDeviceCount(lic)}
                            disabled={isDeletingSchool}
                            className="px-4 py-2 rounded-xl text-sm font-bold border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-wait"
                            title="Đồng bộ lại số thiết bị ACTIVE theo licenseDevices"
                          >
                            Đồng bộ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-emerald-500" />
          <h4 className="font-black text-slate-800">Danh sách thiết bị</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="p-4 font-bold">Thiết bị</th>
                <th className="p-4 font-bold">Đơn vị</th>
                <th className="p-4 font-bold">Người dùng</th>
                <th className="p-4 font-bold">Lần cuối</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Không tìm thấy thiết bị phù hợp.
                  </td>
                </tr>
              ) : (
                filteredDevices.map(deviceItem => {
                  const isDeviceActionLoading =
                    actionLoadingId === `revoke-${deviceItem.id}` ||
                    actionLoadingId === `block-${deviceItem.id}` ||
                    actionLoadingId === `restore-${deviceItem.id}` ||
                    actionLoadingId === `delete-${deviceItem.id}`;

                  return (
                    <tr key={deviceItem.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{deviceItem.deviceName || '—'}</p>
                        <button
                          onClick={() => handleCopy(deviceItem.deviceId)}
                          className="font-mono text-[11px] text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"
                          title="Copy mã thiết bị"
                        >
                          {deviceItem.deviceId || '—'}
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-700">{deviceItem.orgName || '—'}</p>
                        <p className="font-mono text-xs text-indigo-600">{deviceItem.schoolId || '—'}</p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-700 flex items-center gap-1">
                          <UserRound className="w-3.5 h-3.5" /> {deviceItem.userName || '—'}
                        </p>
                        <p className="text-xs text-slate-500">{deviceItem.userRole || '—'}</p>
                      </td>

                      <td className="p-4 text-xs text-slate-500">
                        {formatDate(deviceItem.lastSeenAt || deviceItem.activatedAt || deviceItem.createdAt)}
                      </td>

                      <td className="p-4">
                        <StatusBadge status={deviceItem.status} />
                      </td>

                      <td className="p-4">
                        {deviceItem.status === 'ACTIVE' ? (
                          <div className="flex flex-col sm:flex-row justify-center gap-2">
                            <button
                              onClick={() => handleRevokeDevice(deviceItem)}
                              disabled={isDeviceActionLoading}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold border border-rose-100 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {actionLoadingId === `revoke-${deviceItem.id}` ? 'Đang thu hồi...' : 'Thu hồi'}
                            </button>

                            <button
                              onClick={() => handleBlockDevice(deviceItem)}
                              disabled={isDeviceActionLoading}
                              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold border border-slate-200 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {actionLoadingId === `block-${deviceItem.id}` ? 'Đang khóa...' : 'Khóa'}
                            </button>
                          </div>
                        ) : deviceItem.status === 'REVOKED' || deviceItem.status === 'BLOCKED' ? (
                          <div className="flex flex-col sm:flex-row justify-center gap-2">
                            <button
                              onClick={() => handleRestoreDevice(deviceItem)}
                              disabled={isDeviceActionLoading}
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold border border-emerald-100 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {actionLoadingId === `restore-${deviceItem.id}` ? 'Đang phục hồi...' : 'Phục hồi'}
                            </button>

                            <button
                              onClick={() => handleDeleteDevice(deviceItem)}
                              disabled={isDeviceActionLoading}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold border border-rose-100 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {actionLoadingId === `delete-${deviceItem.id}` ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleDeleteDevice(deviceItem)}
                              disabled={isDeviceActionLoading}
                              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold border border-slate-200 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {actionLoadingId === `delete-${deviceItem.id}` ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {processedRequests.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            <Activity className="w-3.5 h-3.5 inline mr-1" />
            Đã xử lý {processedRequests.length} yêu cầu. Các yêu cầu đã duyệt/từ chối vẫn được lưu trong
            collection <span className="font-mono font-bold">licenseRequests</span> để truy vết.
          </div>
        )}
      </div>
    </div>
  );
}