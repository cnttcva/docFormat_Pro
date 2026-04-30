// File: src/pages/DownloadHelperPage.tsx
// Trang hướng dẫn user tải và cài đặt docFormat PDF Helper
// URL: /download-helper

import React, { useState, useEffect } from 'react';
import { 
  Download, FileDown, ShieldCheck, Zap, FileText, ArrowLeft,
  CheckCircle2, PlayCircle, ChevronDown, ChevronUp, 
  Sparkles, Settings, Video, AlertCircle, Lock, Globe
} from 'lucide-react';

// URL tải installer - SẼ CẬP NHẬT khi xong PDF-3
const INSTALLER_DOWNLOAD_URL = 'https://github.com/danglaicao/docformat-pro/releases/latest';
const VIDEO_TUTORIAL_URL = 'https://www.youtube.com/results?search_query=docformat+pro+huong+dan+cai+pdf+helper';

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <span className="font-bold text-slate-800 text-sm sm:text-base">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
          {answer}
        </div>
      )}
    </div>
  );
};

export default function DownloadHelperPage() {
  // Kiểm tra Helper có chạy không (để hiện banner thành công)
  const [helperOnline, setHelperOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHelper = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('http://localhost:8787/health', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        setHelperOnline(response.ok);
      } catch {
        setHelperOnline(false);
      }
    };
    
    checkHelper();
    const interval = setInterval(checkHelper, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cuộn đến section khi có hash trong URL (vd: /download-helper#cap-phep-trinh-duyet)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const handleDownload = () => {
    window.open(INSTALLER_DOWNLOAD_URL, '_blank');
  };

  const handleVideoTutorial = () => {
    window.open(VIDEO_TUTORIAL_URL, '_blank');
  };

  const handleBackToApp = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      {/* Background decorations */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-200/30 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-100/30 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBackToApp}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại app
          </button>
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span className="font-black text-slate-800">docFormat Pro</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 text-amber-700 text-[11px] font-black uppercase tracking-widest">
            <FileDown className="w-3.5 h-3.5 animate-bounce" />
            Cài đặt PDF Helper
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
            Tải{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
              docFormat PDF Helper
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Phần mềm nhỏ chạy ngầm trên máy bạn, giúp xuất file PDF chất lượng cao trực tiếp từ docFormat Pro.
          </p>

          {/* Banner trạng thái Helper */}
          {helperOnline === true && (
            <div className="max-w-md mx-auto p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-left flex-1">
                <p className="font-bold text-emerald-900 text-sm">
                  PDF Helper đã được cài đặt!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Bạn có thể quay lại app và bấm "Tải PDF" ngay.
                </p>
              </div>
              <button
                onClick={handleBackToApp}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
              >
                Quay lại
              </button>
            </div>
          )}

          {/* Big download button */}
          <div className="pt-4">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-3 px-8 sm:px-10 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-orange-500/30 transform hover:-translate-y-1 transition-all duration-300 group"
            >
              <Download className="w-6 h-6 group-hover:animate-bounce" />
              <span>Tải Setup.exe (~10MB)</span>
            </button>
            <p className="text-xs text-slate-500 mt-3">
              Dành cho Windows 10/11 • Hoàn toàn miễn phí • An toàn
            </p>
          </div>

          {/* Watch video link */}
          <button
            onClick={handleVideoTutorial}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-bold underline-offset-4 hover:underline"
          >
            <PlayCircle className="w-4 h-4" />
            Xem video hướng dẫn cài đặt (2 phút)
          </button>
        </div>

        {/* Lợi ích section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">An toàn tuyệt đối</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              File không upload lên cloud. Mọi xử lý đều ngay trên máy bạn.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Nhanh và mượt</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Convert 1 file chỉ mất 3-5 giây. Không cần đợi chờ.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Chất lượng cao</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              PDF giống hệt Word: giữ nguyên font, table, hình ảnh.
            </p>
          </div>
        </div>

        {/* 3 Bước cài đặt */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10 mb-8">
          <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            Cài đặt chỉ 3 bước
          </h2>
          <p className="text-slate-500 mb-8">
            Quá trình cài đặt rất đơn giản, kể cả khi bạn không rành công nghệ.
          </p>

          <div className="space-y-4">
            {/* Bước 1 */}
            <div className="flex gap-4 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">Tải file Setup.exe</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Bấm nút <strong>"Tải Setup.exe"</strong> ở trên. File chỉ ~10MB, tải xong trong vài giây.
                </p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-xl font-bold transition-colors"
                >
                  <Download className="w-4 h-4" /> Tải ngay
                </button>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">Chạy file vừa tải</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Mở thư mục <strong>Downloads</strong>, click đôi vào file <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">docFormatPDF_Setup.exe</code>
                </p>
                <p className="text-sm text-slate-600">
                  Bấm <strong>Next → Next → Install → Finish</strong>. Quá trình mất khoảng 2-3 phút (tự động tải LibreOffice nếu cần).
                </p>
              </div>
            </div>

            {/* Bước 3 */}
            <div className="flex gap-4 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">Quay lại app và bấm "Tải PDF"</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Sau khi cài xong, badge <strong>PDF Helper: ON</strong> sẽ tự động hiện ở góc app. Bấm <strong>"Tải PDF"</strong> là có ngay file PDF chất lượng cao.
                </p>
                <button
                  onClick={handleBackToApp}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-bold transition-colors"
                >
                  Quay lại app <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Cấp phép trình duyệt - cho user gặp lỗi Mixed Content */}
        <div 
          id="cap-phep-trinh-duyet"
          className="bg-white rounded-3xl shadow-sm border-2 border-purple-200 p-6 sm:p-10 mb-8"
        >
          <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
            <Lock className="w-6 h-6 text-purple-600" />
            Cấp phép trình duyệt (chỉ làm 1 lần)
          </h2>
          <p className="text-slate-500 mb-6">
            Trình duyệt cần được cấp phép để kết nối với PDF Helper trên máy bạn. Đây là cài đặt một lần - chỉ cần làm 1 lần là dùng mãi.
          </p>

          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                1
              </div>
              <p className="text-sm text-slate-700">
                Vào trang docFormat Pro, click <strong>icon ổ khóa 🔒 / icon ⓘ</strong> bên trái thanh URL
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                2
              </div>
              <p className="text-sm text-slate-700">
                Chọn <strong>"Cài đặt trang web"</strong> → click <strong>"Các quyền và tuỳ chọn cài đặt khác"</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                3
              </div>
              <p className="text-sm text-slate-700">
                Cuộn xuống tìm <strong>"Nội dung không an toàn"</strong> (Insecure content) → đổi từ <strong>"Chặn"</strong> sang <strong>"Cho phép"</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                4
              </div>
              <p className="text-sm text-slate-700">
                Reload trang docFormat Pro (bấm <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">F5</kbd>) → bấm "Tải PDF" → Thành công!
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <p className="font-bold mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Tại sao cần làm bước này?
            </p>
            <p>
              Trình duyệt mặc định chặn các website HTTPS gọi đến địa chỉ HTTP local (localhost) vì lý do bảo mật. PDF Helper chạy ở localhost nên cần được cấp phép một lần.
            </p>
          </div>
        </div>

        {/* Video tutorial section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10 mb-8">
          <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
            <Video className="w-6 h-6 text-rose-500" />
            Video hướng dẫn
          </h2>
          <p className="text-slate-500 mb-6">
            Xem video 2 phút để biết cách cài đặt và sử dụng PDF Helper.
          </p>
          
          <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
               onClick={handleVideoTutorial}>
            <div className="text-center text-white">
              <PlayCircle className="w-20 h-20 mx-auto mb-3 opacity-90" />
              <p className="font-bold">Xem video trên YouTube</p>
              <p className="text-sm opacity-70 mt-1">2 phút - Hướng dẫn từng bước</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10 mb-8">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Câu hỏi thường gặp
          </h2>
          
          <div className="space-y-3">
            <FAQItem 
              question="PDF Helper có an toàn không? Có gửi file lên cloud không?"
              answer={
                <>
                  PDF Helper hoàn toàn <strong>an toàn</strong>. Tất cả file được xử lý ngay trên máy bạn, 
                  KHÔNG gửi lên bất kỳ server nào. Helper chỉ là một chương trình nhỏ chạy ngầm 
                  ở <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">localhost:8787</code>, 
                  chỉ trình duyệt của bạn mới có thể giao tiếp được.
                </>
              }
            />
            
            <FAQItem 
              question="Có mất phí không? Có cần đăng ký tài khoản gì không?"
              answer={
                <>
                  Hoàn toàn <strong>MIỄN PHÍ</strong>. Không cần đăng ký, không cần tài khoản. 
                  PDF Helper sử dụng LibreOffice (phần mềm mã nguồn mở miễn phí) để chuyển đổi DOCX sang PDF.
                </>
              }
            />
            
            <FAQItem 
              question="Cài xong có cần khởi động máy lại không?"
              answer={
                <>
                  <strong>Không cần</strong>. Sau khi cài xong, Helper sẽ tự động chạy ngầm. 
                  Mỗi lần khởi động máy sau này, Helper cũng tự động bật, bạn không cần làm gì cả.
                </>
              }
            />
            
            <FAQItem 
              question="Nếu máy đã có Microsoft Office thì có cần cài thêm LibreOffice không?"
              answer={
                <>
                  Có. PDF Helper dùng <strong>LibreOffice</strong> (không phải Microsoft Office) 
                  để convert. Hai phần mềm này không xung đột nhau, có thể cài cùng máy. 
                  Installer sẽ tự động tải và cài LibreOffice giúp bạn nếu chưa có.
                </>
              }
            />
            
            <FAQItem 
              question="Tại sao không dùng convert PDF online thay vì cài app?"
              answer={
                <>
                  Vì 3 lý do: (1) <strong>Bảo mật</strong> - văn bản hành chính của trường không nên 
                  upload lên cloud lạ; (2) <strong>Tốc độ</strong> - convert ngay trên máy nhanh hơn 
                  upload/download; (3) <strong>Không giới hạn</strong> - dùng bao nhiêu cũng được, 
                  không bị giới hạn số file/ngày.
                </>
              }
            />
            
            <FAQItem 
              question="Có hỗ trợ Mac không?"
              answer={
                <>
                  Hiện tại chỉ có installer cho <strong>Windows 10/11</strong>. 
                  Phiên bản Mac đang được phát triển, sẽ ra mắt trong tương lai. 
                  Người dùng Mac có thể chạy thủ công bằng Node.js (xem hướng dẫn dành cho developer).
                </>
              }
            />
            
            <FAQItem 
              question="Tôi gặp lỗi khi cài đặt, làm sao để được hỗ trợ?"
              answer={
                <>
                  Hãy gửi email cho <a href="mailto:danglaicao@gmail.com" className="text-indigo-600 hover:underline font-bold">danglaicao@gmail.com</a> 
                  &nbsp;kèm screenshot lỗi. Hoặc xem video hướng dẫn ở trên - đa số trường hợp 
                  đều được giải đáp trong video.
                </>
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">
            docFormat Pro © 2026 - Design by{' '}
            <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-600">
              Lại Cao Đằng - Đắk Lắk
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
