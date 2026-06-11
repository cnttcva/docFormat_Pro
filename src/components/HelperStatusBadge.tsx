// File: src/components/HelperStatusBadge.tsx
// Badge hiển thị trạng thái PDF Helper ở header
// - Khi chạy trên máy tính: kiểm tra Helper local tại http://localhost:8787
// - Khi chạy trên hosting: kiểm tra Helper tại đường dẫn ứng dụng /VB/
// - Tự động kiểm tra lại mỗi 30 giây

import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, FileDown } from 'lucide-react';

const HELPER_BASE_URL = import.meta.env.PROD
  ? import.meta.env.BASE_URL
  : 'http://localhost:8787/';

const HELPER_HEALTH_URL = `${HELPER_BASE_URL}health`;
const CHECK_INTERVAL_MS = 30000;

type HelperStatus = 'checking' | 'online' | 'offline';

interface HelperStatusBadgeProps {
  onClickWhenOffline?: () => void;
}

export const HelperStatusBadge: React.FC<HelperStatusBadgeProps> = ({
  onClickWhenOffline,
}) => {
  const [status, setStatus] = useState<HelperStatus>('checking');
  const [version, setVersion] = useState<string>('');

  const checkHelperStatus = async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(HELPER_HEALTH_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        setStatus('offline');
        setVersion('');
        return;
      }

      const data = await response.json();

      const hasLibreOffice =
        data.libreOfficeDetected === true || data.libreOfficeFound === true;

      if (data.ok === true && hasLibreOffice) {
        setStatus('online');
        setVersion(data.version || '');
      } else {
        setStatus('offline');
        setVersion(data.version || '');
      }
    } catch (error) {
      console.error('Không kiểm tra được PDF Helper:', error);
      setStatus('offline');
      setVersion('');
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    void checkHelperStatus();

    const intervalId = window.setInterval(() => {
      void checkHelperStatus();
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleClick = () => {
    if (status === 'offline') {
      onClickWhenOffline?.();
      return;
    }

    if (status === 'online') {
      window.open(HELPER_HEALTH_URL, '_blank', 'noopener,noreferrer');
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Đang kiểm tra...</span>
      </div>
    );
  }

  if (status === 'online') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
        title={
          version
            ? `PDF Helper v${version} đang hoạt động - Bấm để xem trạng thái`
            : 'PDF Helper đang hoạt động'
        }
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>PDF Helper: ON</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer animate-pulse"
      title="PDF Helper chưa hoạt động hoặc hosting chưa có LibreOffice"
    >
      <XCircle className="w-3 h-3" />
      <span>PDF Helper: OFF</span>
      <FileDown className="w-3 h-3 ml-1" />
    </button>
  );
};