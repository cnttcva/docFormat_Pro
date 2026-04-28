// File: src/components/DocumentPreview.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Sparkles, AlertCircle, Columns } from 'lucide-react';
import * as docx from 'docx-preview';

export interface DocumentPreviewProps {
  originalFile: File | null;
  processedBlob: Blob | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  originalFile,
  processedBlob,
}) => {
  const [viewMode, setViewMode] = useState<'before' | 'after' | 'diff'>('diff');

  const singleContainerRef = useRef<HTMLDivElement>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  const handleScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'diff') return;

    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }

    if (rightScrollRef.current) {
      isSyncingRight.current = true;
      rightScrollRef.current.scrollTop = e.currentTarget.scrollTop;
      rightScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'diff') return;

    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }

    if (leftScrollRef.current) {
      isSyncingLeft.current = true;
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
      leftScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  useEffect(() => {
    const renderDoc = async (data: Blob | File, container: HTMLElement) => {
      container.innerHTML = '';

      const arrayBuffer = await data.arrayBuffer();

      await docx.renderAsync(arrayBuffer, container, undefined, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: true,
        className: 'doc-preview-a4-page',
      });
    };

    const renderAll = async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        if (viewMode === 'before' && originalFile && singleContainerRef.current) {
          await renderDoc(originalFile, singleContainerRef.current);
        } else if (viewMode === 'after' && processedBlob && singleContainerRef.current) {
          await renderDoc(processedBlob, singleContainerRef.current);
        } else if (
          viewMode === 'diff' &&
          originalFile &&
          processedBlob &&
          leftContainerRef.current &&
          rightContainerRef.current
        ) {
          await Promise.all([
            renderDoc(originalFile, leftContainerRef.current),
            renderDoc(processedBlob, rightContainerRef.current),
          ]);
        }
      } catch (error) {
        console.error("Lỗi khi render tài liệu DOCX:", error);
        setRenderError("Không thể hiển thị bản xem trước cho file này. Vui lòng tải về máy để xem.");
      } finally {
        setIsRendering(false);
      }
    };

    renderAll();
  }, [viewMode, originalFile, processedBlob]);

  if (!originalFile || !processedBlob) return null;

  return (
    <div className="mt-8 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-fadeIn text-left">
      <style>{`
        .custom-preview-wrapper .docx-wrapper {
          background-color: transparent !important;
          padding: 20px 0 !important;
        }

        .custom-preview-wrapper .docx-wrapper > section.docx {
          box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
          border: 1px solid #ccc !important;
          margin: 0 auto 20px auto !important;
          text-align: left !important;
          background-color: white !important;
        }

        .preview-scale-diff {
          zoom: 0.55;
        }

        .preview-scale-single {
          zoom: 0.85;
        }

        @media print {
          .preview-scale-diff,
          .preview-scale-single {
            zoom: 1 !important;
          }

          .custom-preview-wrapper .docx-wrapper {
            padding: 0 !important;
          }

          .custom-preview-wrapper .docx-wrapper > section.docx {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-white border-b border-slate-200 p-4 flex flex-wrap justify-center items-center gap-3 relative z-20 shadow-sm">
        <button
          onClick={() => setViewMode('before')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
            viewMode === 'before'
              ? 'bg-rose-100 text-rose-700 shadow-inner border border-rose-200'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Bản gốc
        </button>

        <button
          onClick={() => setViewMode('diff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all duration-300 ${
            viewMode === 'diff'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
              : 'bg-slate-50 text-indigo-500 hover:bg-indigo-50 border border-indigo-100'
          }`}
        >
          <Columns className="w-4 h-4" /> Soi chiếu Song song
        </button>

        <button
          onClick={() => setViewMode('after')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
            viewMode === 'after'
              ? 'bg-emerald-100 text-emerald-700 shadow-inner border border-emerald-200'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Bản Chuẩn hóa
        </button>
      </div>

      <div className="relative bg-[#525659] w-full min-h-[600px] custom-preview-wrapper">
        {isRendering && (
          <div className="absolute inset-0 z-30 bg-[#525659]/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-indigo-200/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <FileText className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <p className="mt-4 text-sm font-black text-indigo-100 tracking-widest uppercase">
              Đang đồng bộ dữ liệu...
            </p>
          </div>
        )}

        {renderError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-rose-500 bg-[#525659] p-6 text-center">
            <AlertCircle className="w-16 h-16 mb-4 opacity-50" />
            <h4 className="text-lg font-bold">Không thể hiển thị Preview</h4>
            <p className="font-medium text-rose-200">{renderError}</p>
          </div>
        )}

        {viewMode === 'diff' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 h-[750px] divide-y lg:divide-y-0 lg:divide-x-4 divide-slate-800">
            <div
              ref={leftScrollRef}
              onScroll={handleScrollLeft}
              className="overflow-auto custom-scrollbar bg-transparent relative flex flex-col items-center pt-6"
            >
              <div className="sticky top-2 z-10 bg-rose-600 text-white text-[11px] font-black px-6 py-2 rounded-full uppercase tracking-widest mb-4 shadow-xl border-2 border-rose-400/50">
                Bản Gốc (Sai sót)
              </div>

              <div
                ref={leftContainerRef}
                className="w-full flex justify-center pb-10 preview-scale-diff"
              />
            </div>

            <div
              ref={rightScrollRef}
              onScroll={handleScrollRight}
              className="overflow-auto custom-scrollbar bg-transparent relative flex flex-col items-center pt-6"
            >
              <div className="sticky top-2 z-10 bg-emerald-600 text-white text-[11px] font-black px-6 py-2 rounded-full uppercase tracking-widest mb-4 shadow-xl border-2 border-emerald-400/50">
                Bản AI Chuẩn Hóa
              </div>

              <div
                ref={rightContainerRef}
                id="ai-processed-doc"
                className="w-full flex justify-center pb-10 preview-scale-diff"
              />
            </div>
          </div>
        )}

        {viewMode !== 'diff' && (
          <div className="h-[750px] overflow-auto custom-scrollbar flex justify-center p-4 sm:p-8">
            <div
              ref={singleContainerRef}
              id={viewMode === 'after' ? 'ai-processed-doc' : 'original-doc'}
              className="w-full flex justify-center pb-10 preview-scale-single"
            />
          </div>
        )}
      </div>

      <div className="bg-slate-900 py-3 text-center shadow-inner">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <Columns className="w-3.5 h-3.5" /> DocFormat Pro Multi-Diff Engine
        </p>
      </div>
    </div>
  );
};