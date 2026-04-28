// File: src/pages/admin/AdminDashboard.tsx
import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Key, Users, Settings, LogOut, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

// --- NHÚNG CÁC TUYẾN ĐƯỜNG HUYẾT MẠCH ---
import SystemSettings from './SystemSettings';
import StaffManager from './StaffManager'; 
import LicenseManager from './LicenseManager';
// 🔥 MỤC TIÊU 2: NHÚNG TỪ ĐIỂN AI
import DictionaryManager from './DictionaryManager';

const DashboardOverview = () => (
  <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fadeIn">
    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
      👋 Chào mừng trở lại trạm chỉ huy!
    </h3>
    <p className="text-slate-500 mt-2 font-medium">Hệ thống Đa trường (Multi-tenant) đang hoạt động ổn định với 100% công suất.</p>
  </div>
);

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminAuth'); 
    navigate('/'); 
  };

  const navItems = [
    { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
    { path: '/admin/licenses', label: 'Quản lý Bản quyền', icon: Key, exact: false },
    { path: '/admin/hr', label: 'CSDL Nhân sự', icon: Users, exact: false },
    // 🔥 MỤC TIÊU 2: THÊM MENU TỪ ĐIỂN AI
    { path: '/admin/dictionary', label: 'Từ điển AI', icon: BookOpen, exact: false },
    { path: '/admin/settings', label: 'Cài đặt Hệ thống', icon: Settings, exact: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden font-sans">
      {/* Background AI mượt mà */}
      <div className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-300/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-blue-300/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar Kính mờ cao cấp */}
      <div className="w-72 m-4 bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] flex flex-col relative z-10">
        <div className="p-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-50 to-white rounded-2xl border border-indigo-100 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">DOCADMIN</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400">AI Control Center</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-white hover:text-indigo-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-rose-500 bg-rose-50/50 hover:bg-rose-100 transition-all">
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Khu vực nội dung chính */}
      <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
        <div className="h-20 px-8 flex items-center justify-end">
           <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white shadow-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">AD</div>
              <div className="flex flex-col text-left">
                 <span className="text-sm font-black text-slate-800 leading-none">Người chỉ huy</span>
                 <span className="text-[10px] font-bold text-indigo-500 uppercase">Admin Tối Cao</span>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/hr" element={<StaffManager />} /> 
            <Route path="/licenses" element={<LicenseManager />} />
            
            {/* 🔥 MỤC TIÊU 2: TUYẾN ĐƯỜNG ĐẾN TỪ ĐIỂN AI */}
            <Route path="/dictionary" element={<DictionaryManager />} />

            {/* Các tuyến đường dự phòng khác */}
            <Route path="*" element={<div className="p-8 text-center text-slate-400 font-medium">Đang tải dữ liệu...</div>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}