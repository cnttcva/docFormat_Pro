import React, { useState, useEffect, useRef } from 'react';
import { FileText, ArrowRightLeft, Sparkles, AlertCircle } from 'lucide-react';
import * as docx from 'docx-preview'; 

export interface DocumentPreviewProps {
  originalFile: File | null;
  processedBlob: Blob | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ originalFile, processedBlob }) => {
  const [viewMode, setViewMode] = useState<'before' | 'after'>('after');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const renderDocument = async () => {
      if (!containerRef.current) return;
      
      // Bật trạng thái loading và xóa lỗi cũ
      setIsRendering(true);
      setRenderError(null);
      
      // Xóa nội dung DOM cũ trước khi render bản mới để tránh rác
      containerRef.current.innerHTML = '';

      try {
        let docData: Blob | File | null = null;
        
        if (viewMode === 'before' && originalFile) {
          docData = originalFile;
        } else if (viewMode === 'after' && processedBlob) {
          docData = processedBlob;
        }

        if (docData) {
          // BẢN VÁ AN TOÀN: Chuyển đổi file sang dạng mảng byte (ArrayBuffer) 
          // để thư viện docx-preview đọc ổn định 100% trên mọi trình duyệt
          const arrayBuffer = await docData.arrayBuffer();

          await docx.renderAsync(arrayBuffer, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: true,
            className: 'docx-preview-container',
          });
        }
      } catch (error) {
        console.error("Lỗi khi render tài liệu DOCX:", error);
        setRenderError("Không thể hiển thị bản xem trước cho file này. Tuy nhiên, bạn vẫn có thể tải file về để xem bình thường trên Word.");
      } finally {
        setIsRendering(false);
      }
    };

    renderDocument();
  }, [viewMode, originalFile, processedBlob]);

  if (!originalFile || !processedBlob) return null;

  return (
    <div className="mt-8 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-inner flex flex-col animate-fadeIn">
      {/* --- THANH ĐIỀU HƯỚNG TABS (BEFORE / AFTER) --- */}
      <div className="bg-slate-100 border-b border-slate-200 p-3 flex flex-wrap justify-center items-center gap-2 sm:gap-4 relative z-20 shadow-sm">
        <button
          onClick={() => setViewMode('before')}
          className={`px-5 sm:px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
            viewMode === 'before' 
              ? 'bg-rose-100 text-rose-700 shadow-md border border-rose-200 transform scale-105' 
              : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          <FileText className={`w-4 h-4 ${viewMode === 'before' ? 'animate-pulse' : ''}`} />
          Bản gốc (Chưa xử lý)
        </button>
        
        <div className="flex items-center text-slate-400 px-1 hidden sm:flex">
          <ArrowRightLeft className="w-5 h-5" />
        </div>

        <button
          onClick={() => setViewMode('after')}
          className={`px-5 sm:px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
            viewMode === 'after' 
              ? 'bg-emerald-100 text-emerald-700 shadow-md border border-emerald-200 transform scale-105' 
              : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${viewMode === 'after' ? 'text-amber-500 animate-pulse' : ''}`} />
          Bản chuẩn hóa (DocFormat Pro)
        </button>
      </div>

      {/* --- KHU VỰC HIỂN THỊ TÀI LIỆU --- */}
      <div className="relative min-h-[500px] max-h-[800px] overflow-y-auto bg-[#e8eaed] p-4 sm:p-8 flex justify-center custom-scrollbar">
        
        {/* Lớp phủ Loading khi đang chuyển đổi file */}
        {isRendering && (
          <div className="absolute inset-0 z-30 bg-slate-100/70 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
            <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
            <p className="mt-4 text-sm font-bold text-blue-800 tracking-wide uppercase">Đang dựng bản xem trước...</p>
          </div>
        )}

        {/* Cảnh báo nếu thư viện gặp lỗi đọc file */}
        {renderError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-rose-500 bg-rose-50/90 p-6 text-center">
            <AlertCircle className="w-16 h-16 mb-4 opacity-50 text-rose-400" />
            <h4 className="text-lg font-bold text-rose-700 mb-2">Không thể hiển thị Preview</h4>
            <p className="font-medium text-rose-600 max-w-md">{renderError}</p>
          </div>
        )}

        {/* KHUNG CHỨA TRANG GIẤY A4 (Thư viện docx-preview sẽ nhét HTML vào đây) */}
        <div 
          ref={containerRef} 
          className="w-full max-w-[850px] bg-white shadow-2xl origin-top transition-all duration-500 min-h-[1000px]"
          style={{ 
              transform: 'scale(0.9)', 
              transformOrigin: 'top center',
              marginBottom: '-10%' // Bù trừ khoảng trống do scale
          }} 
        />
      </div>
      
      {/* Ghi chú bản quyền hiển thị nhỏ ở góc dưới */}
      <div className="bg-[#e8eaed] py-2 text-center border-t border-slate-300">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              DocFormat Pro Preview Engine
          </p>
      </div>
    </div>
  );
};