// File: src/pages/AiAssistantPage.tsx
//
// Trang độc lập của Module Trợ lý Văn phòng AI.
// Không liên quan đến pipeline chuẩn hóa DOCX.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  Bot,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  AiSettingsPanel,
} from '../components/ai/AiSettingsPanel';

import {
  readAiOrganizationContext,
} from '../services/aiOrganizationContext';

export default function AiAssistantPage() {
  const organization = useMemo(
    () => readAiOrganizationContext(),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-800">
      <div className="pointer-events-none fixed left-[-12%] top-[-15%] h-[550px] w-[550px] rounded-full bg-blue-200/35 blur-[110px]" />

      <div className="pointer-events-none fixed bottom-[-15%] right-[-10%] h-[650px] w-[650px] rounded-full bg-indigo-200/30 blur-[120px]" />

      <header className="relative z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              Quay lại Trang chủ
            </span>
            <span className="sm:hidden">
              Quay lại
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/20">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-xl font-black leading-none tracking-tight text-slate-900 sm:text-2xl">
                DocFormat
                <span className="text-blue-700">
                  Pro
                </span>
              </h1>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[10px]">
                AI Office Assistant
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-7 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-6 py-7 text-white shadow-[0_20px_50px_rgba(30,64,175,0.18)] sm:px-8 sm:py-9">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/10 px-3.5 py-1.5 text-xs font-extrabold text-blue-100">
                <Sparkles className="h-4 w-4" />
                Module độc lập của DocFormatPro
              </div>

              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                Trợ lý Văn phòng AI
              </h2>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-blue-100/85 sm:text-base">
                Kết nối OpenAI hoặc Google Gemini bằng
                API Key riêng của đơn vị để hỗ trợ soạn
                thảo, rà soát và hoàn thiện văn bản quản
                lý trường học.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-inner backdrop-blur">
              <Bot className="h-12 w-12 text-blue-100" />
            </div>
          </div>
        </section>

        <section className="mb-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Kết nối bảo mật
            </h3>

            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              API Key chỉ được sử dụng để tạo phiên AI
              bảo mật trên máy chủ.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <LockKeyhole className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Không lưu API Key
            </h3>

            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              Không lưu khóa trong trình duyệt, MySQL
              hoặc Firebase.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <FileText className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Tách biệt DOCX
            </h3>

            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              Module AI không can thiệp pipeline chuẩn
              hóa văn bản hiện có.
            </p>
          </div>
        </section>

        <AiSettingsPanel
          organization={organization}
        />

        <footer className="py-8 text-center">
          <p className="text-xs font-semibold text-slate-500">
            DocFormat Pro © 2026 — Trợ lý Văn phòng AI
          </p>
        </footer>
      </main>
    </div>
  );
}