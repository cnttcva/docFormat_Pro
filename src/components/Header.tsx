// File: src/components/Header.tsx
import React from 'react';
import { OrgInfo } from '../types';
import { ShieldCheck, BookOpen, Bot, LockKeyhole, Clock, Settings } from 'lucide-react';

interface HeaderProps {
  orgInfo?: OrgInfo;
  authStatus: 'REGISTERED' | 'PENDING' | 'UNREGISTERED';
  setShowOrgSettings: (show: boolean) => void;
  setShowGuide: (show: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  orgInfo, 
  authStatus, 
  setShowOrgSettings, 
  setShowGuide 
}) => {
  return (
    <>
      {/* Top Banner: Trạng thái Bản quyền */}
      <div className="relative z-20 bg-slate-900 text-white py-2 shadow-md px-4 border-b border-indigo-500/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block w-24"></div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase flex-1">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.8)]"></span>
              {orgInfo?.orgName || "CHƯA ĐĂNG KÝ BẢN QUYỀN"}
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            </div>
            
            <button 
                onClick={() => setShowOrgSettings(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] transition-all font-bold border whitespace-nowrap tracking-wide
                  ${authStatus === 'REGISTERED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 
                    authStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 
                    'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'}`}
            >
                {authStatus === 'REGISTERED' && <><LockKeyhole className="w-3.5 h-3.5" /> <span>License Active</span></>}
                {authStatus === 'PENDING' && <><Clock className="w-3.5 h-3.5 animate-pulse" /> <span>Đang chờ cấp quyền...</span></>}
                {authStatus === 'UNREGISTERED' && <><Settings className="w-3.5 h-3.5" /> <span>Đăng ký bản quyền</span></>}
            </button>
        </div>
      </div>

      {/* Main Header: Logo và Công cụ */}
      <header className="relative z-30 bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-2.5 rounded-xl text-white shadow-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-cyan-300" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                DocFormat <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500">Pro</span>
              </h1>
              <p className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-widest mt-1">AI Document Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/80 px-4 py-2.5 rounded-full border border-slate-200 shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Client-Side Processing
            </div>
            <button 
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 px-5 py-2.5 rounded-full border border-indigo-100 shadow-sm hover:shadow-md hover:bg-indigo-100 hover:scale-105 transition-all duration-300 backdrop-blur-md"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Hướng dẫn & Mẹo</span>
              <span className="sm:hidden">HDSD</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};