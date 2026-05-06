// File: src/components/HelperStatusBadge.tsx
// Badge hiển thị trạng thái PDF Helper ở header
// - Tự động kiểm tra Helper mỗi 30 giây
// - Click vào badge OFF sẽ chuyển sang trang download

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, FileDown } from 'lucide-react';

const HELPER_HEALTH_URL = 'http://localhost:8787/health';
const CHECK_INTERVAL_MS = 30000; // 30 giây

type HelperStatus = 'checking' | 'online' | 'offline';

interface HelperStatusBadgeProps {
  onClickWhenOffline?: () => void;
}

export const HelperStatusBadge: React.FC<HelperStatusBadgeProps> = ({ 
  onClickWhenOffline 
}) => {
  const [status, setStatus] = useState<HelperStatus>('checking');
  const [version, setVersion] = useState<string>('');

  const checkHelperStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(HELPER_HEALTH_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.libreOfficeDetected || data.libreOfficeFound) {
          setStatus('online');
          setVersion(data.version || '');
        } else {
          // Helper chạy nhưng LibreOffice chưa cài
          setStatus('offline');
        }
      } else {
        setStatus('offline');
      }
    } catch (error) {
      setStatus('offline');
    }
  };

  useEffect(() => {
    // Kiểm tra ngay khi mount
    checkHelperStatus();
    
    // Kiểm tra định kỳ mỗi 30 giây
    const interval = setInterval(checkHelperStatus, CHECK_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (status === 'offline' && onClickWhenOffline) {
      onClickWhenOffline();
    } else if (status === 'online') {
      // Mở trang Helper status
      window.open('http://localhost:8787', '_blank');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

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
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
        title={version ? `PDF Helper v${version} đang hoạt động - Click để xem chi tiết` : 'PDF Helper đang hoạt động'}
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>PDF Helper: ON</span>
      </button>
    );
  }

  // status === 'offline'
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer animate-pulse"
      title="PDF Helper chưa chạy - Click để xem hướng dẫn cài đặt"
    >
      <XCircle className="w-3 h-3" />
      <span>PDF Helper: OFF</span>
      <FileDown className="w-3 h-3 ml-1" />
    </button>
  );
};
