// File: src/pages/admin/StaffManager.tsx
// CẬP NHẬT: Chọn từng trường để đồng bộ tổ chuyên môn
// CẬP NHẬT: Vẫn giữ nút đồng bộ tất cả khi cần
// Ngày sửa: 29/04/2026

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { Staff } from '../../types';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Fingerprint,
  RefreshCw,
  AlertTriangle,
  Upload,
  Download,
} from 'lucide-react';
import { EditStaffModal } from '../../components/admin/EditStaffModal';
import { ImportStaffModal } from '../../components/admin/ImportStaffModal';
import { exportStaffToExcel } from '../../utils/excelHelper';
import { syncDepartmentsToLicense } from '../../services/syncDepartments';

interface License {
  id: string;
  schoolId: string;
  schoolName?: string;
  orgName?: string;
  status: string;
}

const normalizeSchoolId = (value?: string) => {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

export default function StaffManager() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [licenseList, setLicenseList] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncingDepartments, setIsSyncingDepartments] = useState(false);
  const [selectedSyncSchoolId, setSelectedSyncSchoolId] = useState('');
  const [idWarning, setIdWarning] = useState('');
  const [warningType, setWarningType] = useState<'error' | 'success' | 'info'>('error');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [newStaff, setNewStaff] = useState({
    fullName: '',
    position: '',
    partyPosition: '',
    unitName: '',
    email: '',
    schoolId: '',
    status: 'Đang công tác',
  });

  const showMessage = (
    message: string,
    type: 'error' | 'success' | 'info' = 'info',
    autoClear = true
  ) => {
    setIdWarning(message);
    setWarningType(type);

    if (autoClear) {
      setTimeout(() => {
        setIdWarning('');
      }, 3500);
    }
  };

  const fetchStaff = async (): Promise<Staff[]> => {
    setIsLoading(true);

    try {
      const q = query(collection(db, 'staffs'));
      const snapshot = await getDocs(q);
      const data: Staff[] = [];

      snapshot.forEach((staffDoc) => {
        data.push({ id: staffDoc.id, ...staffDoc.data() } as Staff);
      });

      setStaffList(data);
      return data;
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu nhân sự:', error);
      alert('Không thể kết nối đến Cơ sở dữ liệu.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLicenses = async (): Promise<License[]> => {
  try {
    const currentUser =
  auth.currentUser ||
  (await new Promise<typeof auth.currentUser>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });

    setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 3000);
  }));

if (!currentUser) {
  throw new Error('Phiên đăng nhập Admin không còn hiệu lực. Vui lòng đăng nhập lại.');
}

const token = await currentUser.getIdToken(true);
    const response = await fetch('/VB/api/admin/mysql/licensing-dashboard', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || result?.ok !== true) {
      throw new Error(result?.error || `API MySQL trả lỗi HTTP ${response.status}.`);
    }

    const data: License[] = (Array.isArray(result.licenses) ? result.licenses : [])
      .map((license: any) => ({
        id: String(license.id || ''),
        schoolId: String(license.schoolId || license.school_id || ''),
        schoolName: String(license.schoolName || license.school_name || ''),
        orgName: String(
          license.orgName ||
          license.org_name ||
          license.schoolName ||
          license.school_name ||
          ''
        ),
        status: String(license.status || ''),
      }))
      .filter(
        (license: License) =>
          normalizeSchoolId(license.schoolId) &&
          String(license.status || '').toUpperCase() === 'ACTIVE'
      );

    setLicenseList(data);
    return data;
  } catch (error: any) {
    console.error('Lỗi khi tải dữ liệu bản quyền từ MySQL:', error);
    alert(error?.message || 'Không thể tải dữ liệu bản quyền từ MySQL.');
    return [];
  }
};

  useEffect(() => {
    fetchStaff();
    fetchLicenses();
  }, []);

  useEffect(() => {
    if (!selectedSyncSchoolId && licenseList.length > 0) {
      setSelectedSyncSchoolId(normalizeSchoolId(licenseList[0].schoolId));
    }
  }, [licenseList, selectedSyncSchoolId]);

  const syncDepartmentsForSchools = async (schoolIds: Array<string | undefined | null>) => {
    const uniqueSchoolIds = Array.from(
      new Set(
        schoolIds
          .map((schoolId) => normalizeSchoolId(schoolId || ''))
          .filter(Boolean)
      )
    );

    if (uniqueSchoolIds.length === 0) {
      showMessage('Không có trường nào để đồng bộ.', 'error');
      return;
    }

    setIsSyncingDepartments(true);

    try {
      const results = await Promise.allSettled(
        uniqueSchoolIds.map((schoolId) => syncDepartmentsToLicense(schoolId))
      );

      const failedResults = results.filter((result) => result.status === 'rejected');

      if (failedResults.length > 0) {
        console.warn('Một số trường đồng bộ tổ chuyên môn thất bại:', failedResults);
        showMessage(
          `Đã đồng bộ một phần. ${failedResults.length}/${uniqueSchoolIds.length} trường bị lỗi.`,
          'error'
        );
      } else if (uniqueSchoolIds.length === 1) {
        showMessage(`Đã đồng bộ tổ chuyên môn cho trường ${uniqueSchoolIds[0]}.`, 'success');
      } else {
        showMessage(`Đã đồng bộ tổ chuyên môn cho ${uniqueSchoolIds.length} trường.`, 'success');
      }

      await fetchLicenses();
    } catch (error: any) {
      console.error('Lỗi đồng bộ tổ chuyên môn:', error);
      showMessage(error?.message || 'Lỗi đồng bộ tổ chuyên môn.', 'error');
    } finally {
      setIsSyncingDepartments(false);
    }
  };

  const handleSyncSelectedSchoolDepartments = async () => {
    const normalizedSchoolId = normalizeSchoolId(selectedSyncSchoolId);

    if (!normalizedSchoolId) {
      showMessage('Vui lòng chọn trường cần đồng bộ.', 'error');
      return;
    }

    await syncDepartmentsForSchools([normalizedSchoolId]);
  };

  const handleSyncAllDepartments = async () => {
    await syncDepartmentsForSchools(staffList.map((staff) => staff.schoolId));
  };

  const validateSchoolIdForStaff = (schoolId: string): { valid: boolean; message?: string } => {
    const upperSchoolId = normalizeSchoolId(schoolId);

    if (!upperSchoolId) {
      return { valid: false, message: 'Vui lòng nhập Mã trường (School ID)!' };
    }

    const isRegistered = licenseList.some(
      (license) => normalizeSchoolId(license.schoolId) === upperSchoolId
    );

    if (!isRegistered) {
      return {
        valid: false,
        message: `Mã trường "${upperSchoolId}" CHƯA đăng ký bản quyền. Vui lòng đăng ký bản quyền cho trường này trước khi thêm nhân sự!`,
      };
    }

    return { valid: true };
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdWarning('');
    setWarningType('error');

    if (!newStaff.fullName.trim()) {
      showMessage('Vui lòng nhập Họ và tên!', 'error');
      return;
    }

    const validation = validateSchoolIdForStaff(newStaff.schoolId);

    if (!validation.valid) {
      showMessage(validation.message || 'Mã trường không hợp lệ!', 'error');
      return;
    }

    const upperSchoolId = normalizeSchoolId(newStaff.schoolId);

    const duplicateName = staffList.find(
      (staff) =>
        normalizeSchoolId(staff.schoolId) === upperSchoolId &&
        staff.fullName?.toLowerCase().trim() === newStaff.fullName.toLowerCase().trim()
    );

    if (duplicateName) {
      const confirmAdd = window.confirm(
        `Trong trường "${upperSchoolId}" đã có nhân sự tên "${newStaff.fullName}". Bạn vẫn muốn thêm?`
      );

      if (!confirmAdd) return;
    }

    try {
      setIsAdding(true);

      await addDoc(collection(db, 'staffs'), {
        ...newStaff,
        schoolId: upperSchoolId,
        fullName: newStaff.fullName.trim(),
        position: newStaff.position.trim(),
        partyPosition: newStaff.partyPosition.trim(),
        unitName: newStaff.unitName.trim(),
        email: newStaff.email.trim(),
        createdAt: new Date().toISOString(),
      });

      await syncDepartmentsToLicense(upperSchoolId);
      await fetchStaff();
      await fetchLicenses();

      setSelectedSyncSchoolId(upperSchoolId);

      showMessage(
        `Đã thêm nhân sự "${newStaff.fullName}" vào trường ${upperSchoolId} và đồng bộ tổ chuyên môn.`,
        'success'
      );

      setNewStaff({
        fullName: '',
        position: '',
        partyPosition: '',
        unitName: '',
        email: '',
        schoolId: '',
        status: 'Đang công tác',
      });
    } catch (error: any) {
      console.error('Lỗi khi thêm nhân sự:', error);
      showMessage(`Thêm thất bại: ${error.message}`, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string | undefined, name: string, schoolId?: string) => {
    if (!id) {
      showMessage('Không tìm thấy ID nhân sự để xóa.', 'error');
      return;
    }

    const normalizedSchoolId = normalizeSchoolId(schoolId || '');

    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự: ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'staffs', id));

        setStaffList((prev) => prev.filter((staff) => staff.id !== id));

        if (normalizedSchoolId) {
          await syncDepartmentsToLicense(normalizedSchoolId);
          await fetchLicenses();
          setSelectedSyncSchoolId(normalizedSchoolId);
        }

        showMessage(`Đã xóa nhân sự "${name}" và đồng bộ lại tổ chuyên môn.`, 'success');
      } catch (error: any) {
        console.error('Lỗi khi xóa nhân sự:', error);
        showMessage(error?.message || 'Xóa thất bại!', 'error');
      }
    }
  };

  const handleEditSuccess = async () => {
    const oldSchoolId = normalizeSchoolId(editingStaff?.schoolId || '');
    const updatedStaffList = await fetchStaff();

    const syncSchoolIds = oldSchoolId
      ? [oldSchoolId]
      : updatedStaffList.map((staff) => staff.schoolId);

    await syncDepartmentsForSchools(syncSchoolIds);

    if (oldSchoolId) {
      setSelectedSyncSchoolId(oldSchoolId);
    }

    setEditingStaff(null);
  };

  const handleImportSuccess = async () => {
    const updatedStaffList = await fetchStaff();

    if (selectedSyncSchoolId) {
      await syncDepartmentsForSchools([selectedSyncSchoolId]);
    } else {
      await syncDepartmentsForSchools(updatedStaffList.map((staff) => staff.schoolId));
    }

    setShowImportModal(false);
  };

  const handleExport = () => {
    if (filteredStaff.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    exportStaffToExcel(filteredStaff, 'NhanSu_DocFormatPro');
  };

  const filteredStaff = staffList.filter((staff) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = staff.fullName?.toLowerCase().includes(searchLower) || false;
    const schoolMatch = staff.schoolId?.toLowerCase().includes(searchLower) || false;
    const unitMatch = staff.unitName?.toLowerCase().includes(searchLower) || false;

    return nameMatch || schoolMatch || unitMatch;
  });

  const getSchoolIdSuggestions = () => {
    const input = normalizeSchoolId(newStaff.schoolId);

    if (!input) return [];

    return licenseList
      .filter((license) => normalizeSchoolId(license.schoolId).includes(input))
      .slice(0, 5);
  };

  const getLicenseDisplayName = (license: License) => {
    const schoolId = normalizeSchoolId(license.schoolId);
    const schoolName = license.schoolName || license.orgName || '';

    return schoolName ? `${schoolId} - ${schoolName}` : schoolId;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Quản lý Cơ sở dữ liệu Nhân sự
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Tổng số: {staffList.length} cán bộ/giáo viên • {licenseList.length} trường đã đăng ký
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên, tổ hoặc School ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors"
            title="Import từ Excel"
          >
            <Upload className="w-4 h-4" /> Import
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors"
            title="Xuất Excel"
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <select
            value={selectedSyncSchoolId}
            onChange={(e) => setSelectedSyncSchoolId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 max-w-[260px]"
            title="Chọn trường cần đồng bộ tổ chuyên môn"
          >
            <option value="">Chọn trường</option>
            {licenseList.map((license) => (
              <option key={license.id} value={normalizeSchoolId(license.schoolId)}>
                {getLicenseDisplayName(license)}
              </option>
            ))}
          </select>

          <button
            onClick={handleSyncSelectedSchoolDepartments}
            disabled={isSyncingDepartments || !selectedSyncSchoolId}
            className="px-3 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Đồng bộ tổ chuyên môn cho trường đã chọn"
          >
            {isSyncingDepartments ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Đồng bộ trường này
          </button>

          <button
            onClick={handleSyncAllDepartments}
            disabled={isSyncingDepartments || staffList.length === 0}
            className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Đồng bộ tổ chuyên môn cho tất cả trường"
          >
            Đồng bộ tất cả
          </button>

          <button
            onClick={() => {
              fetchStaff();
              fetchLicenses();
            }}
            className="p-2.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 h-fit">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" /> Thêm Nhân sự Mới
          </h4>

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Mã Trường (School ID) *
              </label>
              <input
                required
                type="text"
                value={newStaff.schoolId}
                onChange={(e) =>
                  setNewStaff({
                    ...newStaff,
                    schoolId: normalizeSchoolId(e.target.value),
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase"
                placeholder="VD: THCS_CVA"
              />
              {newStaff.schoolId && getSchoolIdSuggestions().length > 0 && (
                <div className="mt-1 text-[10px] text-slate-500">
                  Gợi ý: {getSchoolIdSuggestions().map((license) => license.schoolId).join(', ')}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Họ và tên *
              </label>
              <input
                required
                type="text"
                value={newStaff.fullName}
                onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="VD: Nguyễn Văn A"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Chức vụ HC
                </label>
                <input
                  type="text"
                  value={newStaff.position}
                  onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder="Hiệu trưởng..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Chức vụ Đảng
                </label>
                <input
                  type="text"
                  value={newStaff.partyPosition}
                  onChange={(e) => setNewStaff({ ...newStaff, partyPosition: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder="Bí thư..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Tổ chuyên môn / Phòng ban
              </label>
              <input
                type="text"
                value={newStaff.unitName}
                onChange={(e) => setNewStaff({ ...newStaff, unitName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="VD: Tổ Toán - Tin học"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Một trường có thể có nhiều tổ/phòng ban khác nhau
              </p>
            </div>

            {idWarning && (
              <div
                className={`p-4 text-[13px] font-black rounded-2xl flex items-center gap-3 shadow-lg border-2 ${
                  warningType === 'error'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-rose-500/40 animate-bounce'
                    : warningType === 'success'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40'
                    : 'bg-blue-600 text-white border-blue-400 shadow-blue-500/40'
                }`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{idWarning}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAdding || isSyncingDepartments}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAdding ? 'Đang lưu...' : 'Lưu Nhân sự'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Họ và tên</th>
                  <th className="p-4 font-bold">Chức vụ</th>
                  <th className="p-4 font-bold">Đơn vị (School ID)</th>
                  <th className="p-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Không tìm thấy nhân sự nào.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{staff.fullName}</p>
                        <p className="text-[11px] text-slate-500">{staff.unitName}</p>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-700">{staff.position || 'Giáo viên'}</p>
                        {staff.partyPosition && (
                          <p className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded inline-block mt-1 font-bold">
                            {staff.partyPosition}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 w-fit">
                          <Fingerprint className="w-3 h-3" /> {staff.schoolId || 'N/A'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingStaff(staff)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(staff.id, staff.fullName || '', staff.schoolId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                            title="Xóa"
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
      </div>

      <EditStaffModal
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onSuccess={handleEditSuccess}
      />

      <ImportStaffModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        existingStaff={staffList}
      />
    </div>
  );
}