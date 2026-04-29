// File: src/pages/admin/StaffManager.tsx
// ĐÃ SỬA LỖI: Logic kiểm tra trùng School ID
// CẬP NHẬT GIAI ĐOẠN 2: Tích hợp chức năng Edit nhân sự
// CẬP NHẬT GIAI ĐOẠN 3: Tích hợp Import Excel + Export Excel
// Ngày sửa: 29/04/2026

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Staff } from '../../types';
import { 
  Users, Plus, Edit, Trash2, Search, Loader2, Fingerprint, 
  RefreshCw, AlertTriangle, Upload, Download 
} from 'lucide-react';
import { EditStaffModal } from '../../components/admin/EditStaffModal';
import { ImportStaffModal } from '../../components/admin/ImportStaffModal';
import { exportStaffToExcel } from '../../utils/excelHelper';

// Định nghĩa kiểu dữ liệu cho License (trường đã đăng ký bản quyền)
interface License {
  id: string;
  schoolId: string;
  schoolName: string;
  status: string;
}

export default function StaffManager() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [licenseList, setLicenseList] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [idWarning, setIdWarning] = useState("");
  const [warningType, setWarningType] = useState<'error' | 'success' | 'info'>('error');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showImportModal, setShowImportModal] = useState(false); // MỚI: Hiển thị modal Import

  const [newStaff, setNewStaff] = useState({
    fullName: "", position: "", partyPosition: "", unitName: "", email: "", schoolId: "", status: "Đang công tác"
  });

  // Tải dữ liệu nhân sự
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'staffs')); 
      const snapshot = await getDocs(q);
      const data: Staff[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Staff);
      });
      setStaffList(data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu nhân sự:", error);
      alert("Không thể kết nối đến Cơ sở dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Tải danh sách trường đã đăng ký bản quyền
  const fetchLicenses = async () => {
    try {
      const q = query(collection(db, 'licenses'));
      const snapshot = await getDocs(q);
      const data: License[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as License);
      });
      setLicenseList(data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu bản quyền:", error);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchLicenses();
  }, []);

  // ============================================================
  // LOGIC KIỂM TRA SCHOOL ID
  // ============================================================
  const validateSchoolIdForStaff = (schoolId: string): { valid: boolean; message?: string } => {
    const upperSchoolId = schoolId.toUpperCase().trim();
    
    if (!upperSchoolId) {
      return { valid: false, message: "Vui lòng nhập Mã trường (School ID)!" };
    }

    const isRegistered = licenseList.some(l => l.schoolId === upperSchoolId);
    
    if (!isRegistered) {
      return { 
        valid: false, 
        message: `Mã trường "${upperSchoolId}" CHƯA đăng ký bản quyền. Vui lòng đăng ký bản quyền cho trường này trước khi thêm nhân sự!` 
      };
    }

    return { valid: true };
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdWarning("");
    setWarningType('error');

    if (!newStaff.fullName.trim()) {
      setIdWarning("Vui lòng nhập Họ và tên!");
      setWarningType('error');
      return;
    }

    const validation = validateSchoolIdForStaff(newStaff.schoolId);
    if (!validation.valid) {
      setIdWarning(validation.message || "Mã trường không hợp lệ!");
      setWarningType('error');
      return;
    }

    const upperSchoolId = newStaff.schoolId.toUpperCase().trim();
    const duplicateName = staffList.find(s => 
      s.schoolId === upperSchoolId && 
      s.fullName?.toLowerCase().trim() === newStaff.fullName.toLowerCase().trim()
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
        createdAt: new Date().toISOString()
      });
      
      setNewStaff({ 
        fullName: "", position: "", partyPosition: "", unitName: "", 
        email: "", schoolId: "", status: "Đang công tác" 
      });
      
      await fetchStaff();
      
      setIdWarning(`Đã thêm nhân sự "${newStaff.fullName}" vào trường ${upperSchoolId} thành công!`);
      setWarningType('success');
      
      setTimeout(() => {
        setIdWarning("");
      }, 3000);
      
    } catch (error: any) {
      console.error("Lỗi khi thêm nhân sự:", error);
      setIdWarning(`Thêm thất bại: ${error.message}`);
      setWarningType('error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự: ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'staffs', id));
        setStaffList(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        alert("Xóa thất bại!");
      }
    }
  };

  // MỚI: Xử lý Export Excel
  const handleExport = () => {
    if (filteredStaff.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }
    exportStaffToExcel(filteredStaff, 'NhanSu_DocFormatPro');
  };

  const filteredStaff = staffList.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = s.fullName?.toLowerCase().includes(searchLower) || false;
    const schoolMatch = s.schoolId?.toLowerCase().includes(searchLower) || false;
    return nameMatch || schoolMatch;
  });

  const getSchoolIdSuggestions = () => {
    const input = newStaff.schoolId.toUpperCase();
    if (!input) return [];
    return licenseList
      .filter(l => l.schoolId.includes(input))
      .slice(0, 5);
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
              placeholder="Tìm tên hoặc School ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>
          
          {/* MỚI: Nút Import Excel */}
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors"
            title="Import từ Excel"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          
          {/* MỚI: Nút Export Excel */}
          <button 
            onClick={handleExport}
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors"
            title="Xuất Excel"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          
          <button 
            onClick={() => { fetchStaff(); fetchLicenses(); }} 
            className="p-2.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm mới */}
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
                onChange={e => setNewStaff({...newStaff, schoolId: e.target.value.toUpperCase()})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase" 
                placeholder="VD: THCS_CVA" 
              />
              {newStaff.schoolId && getSchoolIdSuggestions().length > 0 && (
                <div className="mt-1 text-[10px] text-slate-500">
                  Gợi ý: {getSchoolIdSuggestions().map(l => l.schoolId).join(', ')}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Họ và tên *</label>
              <input 
                required 
                type="text" 
                value={newStaff.fullName} 
                onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="VD: Nguyễn Văn A" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Chức vụ HC</label>
                <input 
                  type="text" 
                  value={newStaff.position} 
                  onChange={e => setNewStaff({...newStaff, position: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                  placeholder="Hiệu trưởng..." 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Chức vụ Đảng</label>
                <input 
                  type="text" 
                  value={newStaff.partyPosition} 
                  onChange={e => setNewStaff({...newStaff, partyPosition: e.target.value})} 
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
                onChange={e => setNewStaff({...newStaff, unitName: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="VD: Tổ Toán - Tin" 
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Một trường có thể có nhiều tổ/phòng ban khác nhau
              </p>
            </div>

            {idWarning && (
              <div className={`p-4 text-[13px] font-black rounded-2xl flex items-center gap-3 shadow-lg border-2 ${
                warningType === 'error' 
                  ? 'bg-rose-600 text-white border-rose-400 shadow-rose-500/40 animate-bounce' 
                  : warningType === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40'
                  : 'bg-blue-600 text-white border-blue-400 shadow-blue-500/40'
              }`}>
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{idWarning}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isAdding} 
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAdding ? "Đang lưu..." : "Lưu Nhân sự"}
            </button>
          </form>
        </div>

        {/* Bảng danh sách */}
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
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Không tìm thấy nhân sự nào.</td></tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{staff.fullName}</p>
                        <p className="text-[11px] text-slate-500">{staff.unitName}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-700">{staff.position || "Giáo viên"}</p>
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
                            onClick={() => handleDelete(staff.id, staff.fullName)} 
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

      {/* Modal Edit nhân sự */}
      <EditStaffModal 
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onSuccess={fetchStaff}
      />

      {/* MỚI: Modal Import Excel */}
      <ImportStaffModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchStaff}
        existingStaff={staffList}
      />
    </div>
  );
}