// File: src/pages/admin/SystemSettings.tsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Settings, Save, Bell, Cpu, Loader2, Info, Plus, Trash2 } from 'lucide-react';

// Định nghĩa cấu trúc cho 1 trường học
interface TenantIdentity {
  id: string; 
  tenantCode: string; 
  schoolSuffix: string; 
  partySuffix: string; 
}

export default function SystemSettings() {
  const [isSaving, setIsSaving] = useState(false);

  // 🔥 THỰC THI MỆNH LỆNH THÉP: CẬP NHẬT TRẠNG THÁI CHUẨN HÓA
  const [config, setConfig] = useState({
    notificationMessage: "Chào mừng bạn đến với DocFormat Pro V10.0 Ultimate!", 
    maintenanceMode: false,
    
    // 🔥 ĐÃ CHUẨN HÓA LẠI THEO GÓP Ý CỦA CHỈ HUY
    tenantIdentities: [
      { 
        id: '1', 
        tenantCode: 'THCS_CVA', // Mã chuẩn trong CSDL (Có gạch dưới)
        schoolSuffix: 'THCSCVA', // Chữ in ra giấy Hành chính (Viết liền)
        partySuffix: 'CBCVA'     // Chữ in ra giấy Đảng
      },
      { 
        id: '2', 
        tenantCode: 'THPT_LHP', // Mã chuẩn trong CSDL
        schoolSuffix: 'THPT_LHP', // Chữ in ra giấy (Trường này thích có gạch dưới)
        partySuffix: 'CB_LHP'
      }
    ] as TenantIdentity[]
  });

  // Tải cấu hình từ Firebase (Giữ nguyên logic)
  useEffect(() => {
    const fetchConfig = async () => {
      const docRef = doc(db, 'system_settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(prev => ({
          ...prev,
          ...data,
          tenantIdentities: data.tenantIdentities || prev.tenantIdentities
        }));
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'general'), config, { merge: true });
      alert("Đã cập nhật hệ thống Đa trường thành công!");
    } catch (error) {
      alert("Lỗi khi lưu cấu hình!");
    } finally {
      setIsSaving(false);
    }
  };

  const addTenant = () => {
    const newTenant: TenantIdentity = {
      id: Date.now().toString(),
      tenantCode: '', schoolSuffix: '', partySuffix: ''
    };
    setConfig({ ...config, tenantIdentities: [...config.tenantIdentities, newTenant] });
  };

  const removeTenant = (id: string) => {
    setConfig({
      ...config,
      tenantIdentities: config.tenantIdentities.filter(t => t.id !== id)
    });
  };

  const updateTenant = (id: string, field: keyof TenantIdentity, value: string) => {
    setConfig({
      ...config,
      tenantIdentities: config.tenantIdentities.map(t => 
        t.id === id ? { ...t, [field]: value } : t
      )
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" /> Cấu hình Hệ thống Vĩ mô
          </h3>
          <p className="text-sm text-slate-500 mt-1">Điều hành toàn bộ nền tảng Multi-tenant DocFormat Pro</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu thay đổi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Khối 1: Thông báo & Sự kiện */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6 flex flex-col">
          <div className="flex items-center gap-3 text-indigo-600">
            <Bell className="w-6 h-6" />
            <h4 className="font-black text-lg">Thông báo & Sự kiện</h4>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Nội dung thông báo toàn app</label>
            <textarea 
              rows={4}
              value={config.notificationMessage}
              onChange={(e) => setConfig({...config, notificationMessage: e.target.value})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
              placeholder="Nhập thông báo gửi tới tất cả người dùng..."
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100 mt-auto">
             <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-bold text-rose-700">Chế độ bảo trì hệ thống</span>
             </div>
             <input 
               type="checkbox" 
               checked={config.maintenanceMode}
               onChange={(e) => setConfig({...config, maintenanceMode: e.target.checked})}
               className="w-6 h-6 accent-rose-600 cursor-pointer"
             />
          </div>
        </div>

        {/* Khối 2: Từ Điển Định Danh Đa Trường */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6 flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-emerald-600">
               <Cpu className="w-6 h-6" />
               <h4 className="font-black text-lg">Từ Điển Định Danh Đa Trường</h4>
             </div>
             <button 
               onClick={addTenant}
               className="flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
             >
               <Plus className="w-4 h-4" /> Thêm trường
             </button>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
             <p className="text-[11px] text-blue-700 font-medium">
               * AI sẽ tự động map đúng Hậu tố theo Mã trường của người dùng. Mỗi Mã định danh là DUY NHẤT.
             </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {config.tenantIdentities.map((tenant, index) => (
              <div key={tenant.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group transition-all hover:border-indigo-300">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Đơn vị #{index + 1}</span>
                  <button onClick={() => removeTenant(tenant.id)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 mb-1">MÃ TRƯỜNG</label>
                     <input type="text" value={tenant.tenantCode} onChange={(e) => updateTenant(tenant.id, 'tenantCode', e.target.value)} placeholder="VD: THCS_CVA" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 mb-1">HẬU TỐ HC</label>
                     <input type="text" value={tenant.schoolSuffix} onChange={(e) => updateTenant(tenant.id, 'schoolSuffix', e.target.value)} placeholder="VD: THCSCVA" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 mb-1">HẬU TỐ ĐẢNG</label>
                     <input type="text" value={tenant.partySuffix} onChange={(e) => updateTenant(tenant.id, 'partySuffix', e.target.value)} placeholder="VD: CBCVA" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}