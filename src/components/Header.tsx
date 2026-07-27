// File: src/components/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { OrgInfo } from '../types';
import {
  ShieldCheck,
  BookOpen,
  FileText,
  LockKeyhole,
  Clock,
  Settings,
  Building2,
  Monitor,
  ChevronDown,
    Bot,
} from 'lucide-react';

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
  setShowGuide,
}) => {
  return (
    <>
      <div className="relative z-30 border-b border-blue-950/60 bg-[#062b5c] text-white">
        <div className="mx-auto flex min-h-11 max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Building2 className="h-4 w-4 shrink-0 text-blue-200" />

            <span className="truncate text-xs font-extrabold uppercase tracking-[0.08em] sm:text-sm">
              {orgInfo?.orgName || 'CHƯA ĐĂNG KÝ BẢN QUYỀN'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowOrgSettings(true)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              authStatus === 'REGISTERED'
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : authStatus === 'PENDING'
                  ? 'border-amber-400/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : 'border-rose-400/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
            }`}
          >
            {authStatus === 'REGISTERED' && (
              <>
                <LockKeyhole className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Bản quyền đang hoạt động
                </span>
                <span className="sm:hidden">Đã kích hoạt</span>
              </>
            )}

            {authStatus === 'PENDING' && (
              <>
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                <span className="hidden sm:inline">
                  Đang chờ cấp quyền
                </span>
                <span className="sm:hidden">Đang chờ</span>
              </>
            )}

            {authStatus === 'UNREGISTERED' && (
              <>
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Đăng ký bản quyền
                </span>
                <span className="sm:hidden">Đăng ký</span>
              </>
            )}
          </button>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/20">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <h1 className="flex items-center gap-1 text-xl font-black leading-none tracking-tight text-slate-900 sm:text-2xl">
                DocFormat
                <span className="text-blue-700">Pro</span>
              </h1>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[10px]">
                AI Document Engine
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 lg:flex">
            <span className="relative py-6 text-sm font-extrabold text-blue-700">
              Trang chủ
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-700" />
            </span>

            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-2 py-6 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700"
            >
              <Bot className="h-4 w-4" />
              Trợ lý AI
            </Link>

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="py-6 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700"
            >
              Hướng dẫn sử dụng
            </button>

            <span className="py-6 text-sm font-semibold text-slate-500">
              Lịch sử xử lý
            </span>

            <span className="py-6 text-sm font-semibold text-slate-500">
              Trợ giúp
            </span>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm md:flex">
              <Monitor className="h-4 w-4 text-blue-700" />
              Xử lý trên thiết bị
            </div>

            <button
              type="button"
              onClick={() => setShowOrgSettings(true)}
              className="flex max-w-[190px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 sm:px-4"
            >
              <Building2 className="h-4 w-4 shrink-0 text-blue-800" />

              <span className="hidden truncate sm:block">
                {orgInfo?.orgName || 'Đơn vị sử dụng'}
              </span>

              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            <Link
              to="/ai-assistant"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 lg:hidden"
              aria-label="Mở Trợ lý Văn phòng AI"
              title="Trợ lý Văn phòng AI"
            >
              <Bot className="h-4.5 w-4.5" />
            </Link>

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 lg:hidden"
              aria-label="Mở hướng dẫn sử dụng"
            >
              <BookOpen className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};