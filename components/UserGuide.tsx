import React from 'react';
import { 
    X, BookOpen, Settings2, UploadCloud, 
    Zap, Download, Sparkles, ShieldCheck, 
    CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
        
        {/* --- HEADER --- */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 flex items-center justify-between shrink-0 relative overflow-hidden">
            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="bg-white/20 p-2 rounded-lg text-white backdrop-blur-md">
                    <BookOpen className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">HƯỚNG DẪN SỬ DỤNG</h2>
                    <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mt-0.5">DocFormat Pro V8.0 Ultimate </p>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="relative z-10 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Đóng cửa sổ"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* --- BODY (SCROLLABLE) --- */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 custom-scrollbar space-y-6">
            
            <div className="text-center max-w-2xl mx-auto mb-8">
                <p className="text-slate-600 font-medium leading-relaxed">
                    DocFormat Pro giúp bạn biến một văn bản Word cũ kỹ, lộn xộn thành tài liệu chuẩn form hành chính, đẹp mắt và chính xác chỉ với <strong className="text-blue-700">4 bước đơn giản</strong>.
                </p>
            </div>

            {/* BƯỚC 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400"></div>
                <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-xl text-orange-600 shrink-0 group-hover:scale-110 transition-transform">
                        <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Bước 1: Thiết lập thông số</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>Chọn Mẫu chèn:</strong> Chọn loại văn bản (Hành chính Nhà trường, Công tác Đảng, Tổ chuyên môn) hoặc Không chèn thêm.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>Định danh văn bản:</strong> Tích chọn nếu là <em>Biên bản</em> (nhập Chủ tọa, Thư ký) hoặc <em>Công văn</em> (nhập Trích yếu). Nếu là Kế hoạch/Báo cáo, chỉ cần nhập Số ký hiệu & Ngày tháng.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>Thông tin người ký:</strong> Ghi rõ Chức vụ và Họ tên người ký/duyệt.</span>
                            </li>
                        </ul>
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-100">
                            <Sparkles className="w-3.5 h-3.5" /> Smart Memory: Ứng dụng tự động ghi nhớ thông tin này cho các lần mở sau!
                        </div>
                    </div>
                </div>
            </div>

            {/* BƯỚC 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Bước 2: Tải lên tài liệu</h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Kéo thả hoặc click vào khung đứt nét để tải lên file Word (.docx) cần chuẩn hóa.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1.5">
                                <ShieldCheck className="w-4 h-4" /> Tính năng: Smart Eraser (Tẩy thông minh)
                            </h4>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Bạn có thể lấy nguyên file Kế hoạch/Báo cáo <strong>của năm ngoái</strong> tải lên mà <strong>KHÔNG CẦN TỰ XÓA</strong> khung Quốc hiệu cũ, không cần xóa "Nơi nhận" hay Chữ ký cũ ở cuối trang. Hệ thống sẽ tự động quét và tẩy sạch rác cũ!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BƯỚC 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div className="w-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Bước 3: Thực hiện Chuẩn hóa</h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Bấm nút <strong>"Thực hiện Chuẩn hóa ngay"</strong>. Hệ thống sẽ chạy các thuật toán lõi tự động:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-slate-700 block mb-1">📐 Ép chuẩn định dạng</span>
                                <span className="text-[11px] text-slate-500">Căn lề, font chữ, dãn dòng đồng đều. Căn giữa hình ảnh, ép bảng biểu vừa trang giấy.</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-emerald-700 block mb-1">✨ Contextual Spacing Killer</span>
                                <span className="text-[11px] text-slate-500">Trị dứt điểm lỗi dãn dòng không đều do copy/paste hoặc do thiết lập ẩn của Word.</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 md:col-span-2">
                                <span className="text-xs font-bold text-rose-700 block mb-1">🔥 AutoStamp (Khoảng trống Đóng dấu)</span>
                                <span className="text-[11px] text-slate-500">Tự động chừa đúng <strong>5 dòng trống</strong> cho Hiệu trưởng/Chủ tịch (để đóng dấu tròn), và <strong>3 dòng trống</strong> cho Tổ trưởng/Thư ký ký tay gọn gàng.</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span><strong>Lưu ý:</strong> Nếu danh sách của bạn vẫn bị dính nhau không dãn dòng, nguyên nhân do bạn gõ <code>Shift + Enter</code> thay vì <code>Enter</code>. Vui lòng mở file gốc xóa và Enter lại nhé!</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BƯỚC 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                        <Download className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Bước 4: Xem trước và Tải về</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <Layers className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>So sánh trực quan:</strong> Sử dụng 2 tab <em>"Bản gốc"</em> và <em>"Bản chuẩn hóa"</em> để đối chiếu sự khác biệt sắc nét trước và sau khi xử lý.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>Nếu đã ưng ý, bấm <strong>"Tải về máy"</strong> để lưu file Word hoàn chỉnh. Bạn có thể in ra và trình ký ngay lập tức!</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>

        {/* --- FOOTER --- */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 shrink-0 text-center">
            <p className="text-xs text-slate-500 font-medium">
                Cần hỗ trợ thêm về kỹ thuật? Vui lòng liên hệ Tác giả: <strong className="text-blue-700">Lại Cao Đằng</strong>
            </p>
            <button 
                onClick={onClose}
                className="mt-3 px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
            >
                Đã hiểu & Đóng lại
            </button>
        </div>

      </div>
    </div>
  );
};