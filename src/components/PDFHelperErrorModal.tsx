// File: src/components/PDFHelperErrorModal.tsx
// Modal đẹp hiển thị khi gặp lỗi PDF
// Có 3 trường hợp lỗi và 3 nút action tương ứng

import React from 'react';
import { 
  X, FileWarning, Download, BookOpen, RefreshCw, 
  AlertTriangle, Wifi, FileX, ShieldAlert 
} from 'lucide-react';

export type PDFErrorType = 
  | 'helper_not_running'    // Helper chưa chạy
  | 'libreoffice_missing'   // Helper chạy nhưng thiếu LibreOffice
  | 'mixed_content_blocked' // Browser chặn HTTPS gọi HTTP
  | 'conversion_failed'     // Convert thất bại
  | 'unknown';              // Lỗi khác

interface PDFHelperErrorModalProps {
  isOpen: boolean;
  errorType: PDFErrorType;
  errorDetail?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const ERROR_CONFIG: Record<PDFErrorType, {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction: string;
  primaryActionUrl?: string;
  showVideoButton: boolean;
  gradientFrom: string;
  gradientTo: string;
}> = {
  helper_not_running: {
    icon: <Wifi className="w-7 h-7 text-white" />,
    title: 'PDF Helper chưa hoạt động',
    description: 'Để tải file PDF, máy tính của bạn cần cài đặt và chạy "docFormat PDF Helper". Đây là phần mềm nhỏ giúp chuyển đổi DOCX sang PDF chất lượng cao ngay trên máy bạn.',
    primaryAction: 'Tải PDF Helper về cài đặt',
    primaryActionUrl: '/download-helper',
    showVideoButton: true,
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-600',
  },
  libreoffice_missing: {
    icon: <FileX className="w-7 h-7 text-white" />,
    title: 'Cần cài thêm LibreOffice',
    description: 'PDF Helper đang chạy nhưng chưa tìm thấy LibreOffice trên máy. Đây là công cụ miễn phí để chuyển đổi văn bản sang PDF với chất lượng tốt nhất.',
    primaryAction: 'Tải LibreOffice (miễn phí)',
    primaryActionUrl: 'https://www.libreoffice.org/download/',
    showVideoButton: true,
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
  },
  mixed_content_blocked: {
    icon: <ShieldAlert className="w-7 h-7 text-white" />,
    title: 'Trình duyệt đang chặn kết nối',
    description: 'Trình duyệt cần được cấp phép để kết nối với PDF Helper trên máy bạn. Đây là cài đặt một lần - chỉ cần làm 1 lần là dùng mãi.',
    primaryAction: 'Xem hướng dẫn cấp phép',
    primaryActionUrl: '/download-helper#cap-phep-trinh-duyet',
    showVideoButton: true,
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-600',
  },
  conversion_failed: {
    icon: <FileWarning className="w-7 h-7 text-white" />,
    title: 'Chuyển đổi PDF thất bại',
    description: 'PDF Helper đã nhận file nhưng có lỗi trong quá trình chuyển đổi. Vui lòng thử lại hoặc kiểm tra file có hợp lệ không.',
    primaryAction: 'Thử lại',
    showVideoButton: false,
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-red-600',
  },
  unknown: {
    icon: <AlertTriangle className="w-7 h-7 text-white" />,
    title: 'Đã xảy ra lỗi không xác định',
    description: 'Có lỗi xảy ra khi tải PDF. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu vấn đề kéo dài.',
    primaryAction: 'Xem hướng dẫn',
    primaryActionUrl: '/download-helper',
    showVideoButton: true,
    gradientFrom: 'from-slate-500',
    gradientTo: 'to-slate-700',
  },
};

const VIDEO_GUIDE_URL = 'https://www.youtube.com/results?search_query=docformat+pro+huong+dan+cai+pdf+helper';

export const PDFHelperErrorModal: React.FC<PDFHelperErrorModalProps> = ({
  isOpen,
  errorType,
  errorDetail,
  onClose,
  onRetry,
}) => {
  if (!isOpen) return null;

  const config = ERROR_CONFIG[errorType];

  const handlePrimaryAction = () => {
    if (errorType === 'conversion_failed' && onRetry) {
      onRetry();
      onClose();
    } else if (config.primaryActionUrl) {
      // Nếu là URL ngoài (LibreOffice), mở tab mới
      // Nếu là trang nội bộ, navigate trong cùng tab
      if (config.primaryActionUrl.startsWith('http')) {
        window.open(config.primaryActionUrl, '_blank');
      } else {
        window.location.href = config.primaryActionUrl;
      }
    }
  };

  const handleVideoGuide = () => {
    window.open(VIDEO_GUIDE_URL, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} p-6 relative`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              {config.icon}
            </div>
            <div className="flex-1 pr-8">
              <h3 className="text-xl font-black text-white">
                {config.title}
              </h3>
              <p className="text-sm text-white/90 mt-0.5">
                docFormat Pro - Hỗ trợ tải PDF
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {config.description}
          </p>

          {/* Detail lỗi (nếu có) */}
          {errorDetail && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                Chi tiết kỹ thuật:
              </p>
              <p className="text-xs text-slate-600 font-mono leading-relaxed">
                {errorDetail}
              </p>
            </div>
          )}

          {/* Tóm tắt 3 bước cài đặt cho trường hợp helper_not_running */}
          {errorType === 'helper_not_running' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-900 mb-2 text-sm">
                💡 Cài đặt rất nhanh - chỉ 3 bước:
              </p>
              <ol className="text-sm text-amber-800 space-y-1.5 list-decimal list-inside">
                <li>Tải file <strong>docFormatPDF_Setup.exe</strong> (~10MB)</li>
                <li>Chạy file vừa tải, bấm Next → Finish</li>
                <li>Quay lại đây, bấm "Tải PDF" lần nữa</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer - Action buttons */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-2">
          {/* Nút phụ (Đóng / Hướng dẫn video) */}
          {config.showVideoButton ? (
            <button 
              onClick={handleVideoGuide}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Xem video hướng dẫn
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-sm transition-colors"
            >
              Đóng
            </button>
          )}

          {/* Nút chính (Tải Helper / Thử lại / ...) */}
          <button 
            onClick={handlePrimaryAction}
            className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
          >
            {errorType === 'conversion_failed' ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {config.primaryAction}
          </button>
        </div>
      </div>
    </div>
  );
};
