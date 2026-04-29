// File: src/components/admin/EditStaffModal.tsx
// Modal sửa thông tin nhân sự

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { doc, updateDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Staff } from '../../types';

interface EditStaffModalProps {
  staff: Staff | null;        // null = đóng modal
  onClose: () => void;
  onSuccess: () => void;
  isSchoolAdmin?: boolean;     // Admin trường không được đổi schoolId
  currentSchoolId?: string;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({ 
  staff, onClose, onSuccess, isSchoolAdmin = false, currentSchoolId 
}) => {
  const [formData, setFormData] = useState<Partial<Staff>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Khi staff thay đổi, cập nhật form
  useEffect(() => {
    if (staff) {
      setFormData({
        fullName: staff.fullName || '',
        schoolId: staff.schoolId || '',
        position: staff.position || '',
        partyPosition: staff.partyPosition || '',
        unitName: staff.unitName || '',
        email: staff.email || '',
        status: staff.status || 'Đang công tác'
      });
      setError('');
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.fullName?.trim()) {
      setError('Vui lòng nhập họ và tên!');
      return;
    }
    if (!formData.schoolId?.trim()) {
      setError('Vui lòng nhập mã trường!');
      return;
    }

    // Nếu là admin trường, không cho đổi sang trường khác
    if (isSchoolAdmin && formData.schoolId.toUpperCase() !== currentSchoolId?.toUpperCase()) {
      setError('Bạn không có quyền chuyển nhân sự sang trường khác!');
      return;
    }

    setIsSaving(true);

    try {
      // Kiểm tra mã trường có hợp lệ (đã đăng ký bản quyền)
      const upperSchoolId = formData.schoolId.toUpperCase().trim();
      const licQuery = query(collection(db, 'licenses'));
      const licSnap = await getDocs(licQuery);
      const isValid = licSnap.docs.some(d => d.data().schoolId === upperSchoolId);
      
      if (!isValid) {
        setError(`Mã trường "${upperSchoolId}" chưa đăng ký bản quyền!`);
        setIsSaving(false);
        return;
      }

      // Cập nhật vào Firestore
      const dataToUpdate: any = {
        ...formData,
        schoolId: upperSchoolId,
        fullName: formData.fullName.trim(),
        updatedAt: new Date().toISOString()
      };
      
      // Loại bỏ field 'id' không cần lưu vào doc
      delete dataToUpdate.id;
      
      const staffRef = doc(db, 'staffs', staff.id);
      await updateDoc(staffRef, dataToUpdate);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(`Cập nhật thất bại: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-3xl">
          <div>
            <h3 className="text-xl font-black text-white">Chỉnh sửa Nhân sự</h3>
            <p className="text-sm text-indigo-100 mt-0.5">Cập nhật thông tin: {staff.fullName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Mã Trường (School ID) *
              </label>
              <input 
                required 
                disabled={isSchoolAdmin}
                type="text" 
                value={formData.schoolId || ''} 
                onChange={e => setFormData({...formData, schoolId: e.target.value.toUpperCase()})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase disabled:bg-slate-100 disabled:text-slate-500" 
              />
              {isSchoolAdmin && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Admin trường không thể đổi mã trường
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Họ và tên *
              </label>
              <input 
                required 
                type="text" 
                value={formData.fullName || ''} 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Chức vụ Hành chính
              </label>
              <input 
                type="text" 
                value={formData.position || ''} 
                onChange={e => setFormData({...formData, position: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="VD: Hiệu trưởng" 
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Chức vụ Đảng
              </label>
              <input 
                type="text" 
                value={formData.partyPosition || ''} 
                onChange={e => setFormData({...formData, partyPosition: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="VD: Bí thư" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Tổ chuyên môn / Phòng ban
            </label>
            <input 
              type="text" 
              value={formData.unitName || ''} 
              onChange={e => setFormData({...formData, unitName: e.target.value})} 
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
              placeholder="VD: Tổ Toán - Tin" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Email
              </label>
              <input 
                type="email" 
                value={formData.email || ''} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="email@school.edu.vn" 
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Trạng thái
              </label>
              <select 
                value={formData.status || 'Đang công tác'} 
                onChange={e => setFormData({...formData, status: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value="Đang công tác">Đang công tác</option>
                <option value="Nghỉ hưu">Nghỉ hưu</option>
                <option value="Chuyển công tác">Chuyển công tác</option>
                <option value="Tạm nghỉ">Tạm nghỉ</option>
              </select>
            </div>
          </div>

          {/* Thông báo lỗi */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};