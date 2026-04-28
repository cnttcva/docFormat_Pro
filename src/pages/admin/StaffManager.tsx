// File: src/pages/admin/StaffManager.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Staff } from '../../types';
import { Users, Plus, Edit, Trash2, Search, Loader2, Fingerprint, RefreshCw, AlertTriangle } from 'lucide-react';

export default function StaffManager() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [idWarning, setIdWarning] = useState(""); // Cảnh báo đỏ rực

  const [newStaff, setNewStaff] = useState({
    fullName: "", position: "", partyPosition: "", unitName: "", email: "", schoolId: "", status: "Đang công tác"
  });

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

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdWarning("");

    if (!newStaff.fullName || !newStaff.schoolId) {
        setIdWarning("Vui lòng nhập Họ tên và Mã trường!");
        return;
    }
    
    // KIỂM TRA TRÙNG LẶP: Nếu School ID đã tồn tại cho một đơn vị (unitName) khác
    const isDuplicate = staffList.some(s => 
        s.schoolId === newStaff.schoolId.toUpperCase() && 
        s.unitName !== newStaff.unitName && 
        newStaff.unitName !== ""
    );

    if (isDuplicate) {
        setIdWarning("Mã định danh này đã được cấp cho trường khác, vui lòng kiểm tra lại!");
        return; 
    }

    try {
      setIsAdding(true);
      await addDoc(collection(db, 'staffs'), {
          ...newStaff,
          schoolId: newStaff.schoolId.toUpperCase()
      });
      setNewStaff({ fullName: "", position: "", partyPosition: "", unitName: "", email: "", schoolId: "", status: "Đang công tác" });
      await fetchStaff();
      alert("Đã thêm nhân sự thành công!");
    } catch (error) {
      alert("Thêm thất bại!");
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

  const filteredStaff = staffList.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = s.fullName?.toLowerCase().includes(searchLower) || false;
    const schoolMatch = s.schoolId?.toLowerCase().includes(searchLower) || false;
    return nameMatch || schoolMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Quản lý Cơ sở dữ liệu Nhân sự
          </h3>
          <p className="text-sm text-slate-500 mt-1">Tổng số: {staffList.length} cán bộ/giáo viên trên toàn hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc School ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <button onClick={fetchStaff} className="p-2.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors">
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
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mã Trường (School ID) *</label>
              <input required type="text" value={newStaff.schoolId} onChange={e => setNewStaff({...newStaff, schoolId: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase" placeholder="VD: THCS_CVA" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Họ và tên *</label>
              <input required type="text" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="VD: Nguyễn Văn A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Chức vụ HC</label>
                  <input type="text" value={newStaff.position} onChange={e => setNewStaff({...newStaff, position: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Hiệu trưởng..." />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Chức vụ Đảng</label>
                  <input type="text" value={newStaff.partyPosition} onChange={e => setNewStaff({...newStaff, partyPosition: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Bí thư..." />
                </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tổ chuyên môn / Phòng ban</label>
              <input type="text" value={newStaff.unitName} onChange={e => setNewStaff({...newStaff, unitName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="VD: Tổ Toán - Tin" />
            </div>

            {/* THÔNG BÁO CẢNH BÁO ĐỎ RỰC */}
            {idWarning && (
              <div className="p-4 bg-rose-600 text-white text-[13px] font-black rounded-2xl animate-bounce flex items-center gap-3 shadow-lg shadow-rose-500/40 border-2 border-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{idWarning}</span>
              </div>
            )}

            <button type="submit" disabled={isAdding} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200">
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
                        {staff.partyPosition && <p className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded inline-block mt-1 font-bold">{staff.partyPosition}</p>}
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 w-fit">
                          <Fingerprint className="w-3 h-3" /> {staff.schoolId || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(staff.id, staff.fullName)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"><Trash2 className="w-4 h-4" /></button>
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
    </div>
  );
}