// File: src/components/UserGuide.tsx
import React from 'react';
import {
  X,
  BookOpen,
  MonitorSmartphone,
  ShieldCheck,
  Settings2,
  UploadCloud,
  Sparkles,
  FileDown,
  CheckCircle2,
  Info,
  Lightbulb,
  Laptop,
  Globe,
  FileText,
  LockKeyhole,
  ChevronRight,
} from 'lucide-react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideStep = {
  step: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  items: string[];
  tip?: string;
};

const guideSteps: GuideStep[] = [
  {
    step: 'A',
    title: 'Hướng dẫn cài đặt ứng dụng',
    icon: <MonitorSmartphone className="w-6 h-6" />,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    items: [
      'Mở docFormat Pro bằng trình duyệt Google Chrome hoặc Microsoft Edge.',
      'Quan sát phía trên thanh địa chỉ, nếu trình duyệt hỗ trợ cài ứng dụng sẽ xuất hiện biểu tượng cài đặt ứng dụng.',
      'Nhấn vào biểu tượng cài đặt rồi chọn “Cài đặt / Install”.',
      'Sau khi cài xong, ngoài màn hình Desktop sẽ có biểu tượng docFormat Pro để mở nhanh.',
      'Từ những lần sau, bạn có thể mở ứng dụng từ Desktop mà không cần nhập lại đường link.',
    ],
    tip: 'Khuyến nghị dùng Chrome hoặc Edge để chức năng cài ứng dụng ra Desktop hoạt động ổn định nhất.',
  },
  {
    step: '1',
    title: 'Đăng ký và kích hoạt bản quyền',
    icon: <ShieldCheck className="w-6 h-6" />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    items: [
      'Khi mở ứng dụng lần đầu, nếu chưa được cấp quyền sử dụng, hãy nhấn “Đăng ký bản quyền”.',
      'Chọn đúng trường hợp: “Trường đã có mã định danh” hoặc “Trường đăng ký bản quyền lần đầu”.',
      'Nếu trường đã có mã định danh, nhập mã của đơn vị, ví dụ: THCS_CVA, rồi gửi yêu cầu cấp phép cho thiết bị hiện tại.',
      'Nếu đăng ký lần đầu, điền thông tin đơn vị để Admin tạo hồ sơ bản quyền mới.',
      'Sau khi Admin duyệt, thiết bị sẽ được mở khóa và có thể sử dụng đầy đủ chức năng.',
    ],
    tip: 'Mỗi đơn vị chỉ có một mã định danh duy nhất, nhưng có thể kích hoạt tối đa 15 thiết bị.',
  },
  {
    step: '2',
    title: 'Thiết lập thông số AI',
    icon: <Settings2 className="w-6 h-6" />,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    items: [
      'Nhấn “Tùy chỉnh Thông số AI” để mở bảng cấu hình.',
      'Chọn đúng loại văn bản: Không tiêu đề, Hành chính nhà trường, Công tác Đảng hoặc Tổ chuyên môn.',
      'Nếu là biên bản, nhập Chủ tọa và Thư ký.',
      'Nếu là công văn, nhập trích yếu, số ký hiệu, ngày ban hành và thông tin người ký.',
      'Kiểm tra lại lề trang, font chữ, cỡ chữ, giãn dòng, thụt đầu dòng và các tùy chọn nâng cao trước khi xử lý.',
    ],
    tip: 'docFormat Pro có thể ghi nhớ một số thông tin thường dùng để giúp thao tác nhanh hơn ở những lần sau.',
  },
  {
    step: '3',
    title: 'Tải lên và chuẩn hóa văn bản',
    icon: <UploadCloud className="w-6 h-6" />,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    items: [
      'Kéo thả file .DOCX vào vùng tải lên hoặc nhấn để chọn file từ máy tính.',
      'Sau khi chọn file, nhấn “Thực hiện Chuẩn hóa AI”.',
      'Hệ thống sẽ tự động phân tích văn bản, nhận diện lỗi định dạng và căn chỉnh theo thể thức hành chính.',
      'Sau khi xử lý xong, bạn có thể xem bản gốc, bản chuẩn hóa hoặc soi chiếu song song.',
      'Với văn bản có bảng biểu, nơi nhận, chữ ký hoặc nội dung dài, nên kiểm tra lại bản xem trước trước khi tải file.',
    ],
    tip: 'Nên dùng file Word .DOCX gốc để hệ thống xử lý chính xác nhất.',
  },
  {
    step: '4',
    title: 'Tải DOCX hoặc xuất PDF',
    icon: <FileDown className="w-6 h-6" />,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    items: [
      'Sau khi xử lý thành công, nhấn “Tải DOCX” để lưu bản Word đã chuẩn hóa.',
      'Nếu cần bản in hoặc bản gửi đi cố định định dạng, nhấn “Tải PDF”.',
      'Chức năng PDF sử dụng bộ chuyển đổi DOCX sang PDF để hạn chế lỗi mất đầu trang, chân trang.',
      'Nếu xuất PDF bị lỗi, hãy kiểm tra kết nối tới PDF Converter API hoặc server chuyển đổi.',
      'Nên mở file PDF sau khi tải về để rà soát lần cuối trước khi in hoặc phát hành.',
    ],
    tip: 'Xuất PDF bằng bộ chuyển đổi server ổn định hơn nhiều so với in trực tiếp từ trình duyệt.',
  },
  {
    step: '5',
    title: 'Lưu ý để sử dụng hiệu quả',
    icon: <Lightbulb className="w-6 h-6" />,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    items: [
      'Luôn chọn đúng loại văn bản trước khi chuẩn hóa.',
      'Với file lấy từ nhiều nguồn khác nhau, nên kiểm tra kỹ bản xem trước sau khi xử lý.',
      'Nếu thiết bị chưa được cấp quyền, hãy gửi yêu cầu đăng ký thay vì thử nhập lại nhiều lần.',
      'Nếu không thấy nút cài ứng dụng ra Desktop, hãy dùng Chrome hoặc Edge và tải lại trang.',
      'Khi gặp lỗi, hãy chụp màn hình lỗi và gửi cho quản trị viên hoặc tác giả để được hỗ trợ.',
    ],
    tip: 'Quy trình tốt nhất: Cài ứng dụng → Đăng ký bản quyền → Thiết lập thông số → Tải DOCX → Kiểm tra → Xuất DOCX/PDF.',
  },
];

function SectionCard({ guideStep }: { guideStep: GuideStep }) {
  return (
    <div
      className={`relative rounded-3xl border ${guideStep.border} ${guideStep.bg} p-6 sm:p-7 shadow-sm hover:shadow-lg transition-all duration-300`}
    >
      <div className="absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full bg-gradient-to-b from-violet-500 to-cyan-400" />

      <div className="pl-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center ${guideStep.color}`}
          >
            {guideStep.icon}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="px-3 py-1 rounded-full bg-white border border-white/70 text-xs font-black text-slate-600 shadow-sm">
                BƯỚC {guideStep.step}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-800">
                {guideStep.title}
              </h3>
            </div>

            <div className="space-y-3 mt-4">
              {guideStep.items.map((item, index) => (
                <div key={`${guideStep.step}-${index}`} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[15px] sm:text-base leading-7 text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            {guideStep.tip && (
              <div className="mt-5 rounded-2xl bg-white/80 border border-white shadow-sm px-4 py-3 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-sm sm:text-[15px] text-slate-700 leading-6">
                  <span className="font-bold text-violet-700">Gợi ý thông minh:</span>{' '}
                  {guideStep.tip}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserGuide({ isOpen, onClose }: UserGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.35)] border border-white/60">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white px-6 sm:px-8 py-5">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white blur-3xl"></div>
            <div className="absolute -bottom-10 right-10 w-40 h-40 rounded-full bg-cyan-300 blur-3xl"></div>
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-wide">
                  HƯỚNG DẪN SỬ DỤNG
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-blue-100 font-semibold tracking-wide">
                  <span>DOCFORMAT PRO V10.0 ULTIMATE</span>
                  <span className="opacity-70">•</span>
                  <span>AI DOCUMENT ENGINE</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all"
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-90px)] overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
          <div className="px-5 sm:px-8 py-7 sm:py-8">
            <div className="text-center max-w-4xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs sm:text-sm font-black uppercase tracking-wider shadow-sm">
                <Sparkles className="w-4 h-4" />
                Trợ lý hướng dẫn thông minh
              </div>

              <h3 className="mt-5 text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                docFormat Pro giúp bạn chuẩn hóa văn bản hành chính{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-cyan-500">
                  nhanh - đúng - chuyên nghiệp
                </span>
              </h3>

              <p className="mt-4 text-slate-600 text-[15px] sm:text-lg leading-8">
                Thực hiện theo các bước dưới đây để cài ứng dụng ra Desktop, đăng ký
                bản quyền, cấu hình thông số, tải file Word và xuất DOCX/PDF ổn định.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Laptop className="w-5 h-5 text-cyan-600" />
                  <h4 className="font-black text-slate-800">Cài như ứng dụng Desktop</h4>
                </div>
                <p className="text-sm text-slate-600 leading-6">
                  Mở nhanh từ Desktop, không cần nhập lại đường link mỗi lần sử dụng.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <LockKeyhole className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-black text-slate-800">Bản quyền theo đơn vị</h4>
                </div>
                <p className="text-sm text-slate-600 leading-6">
                  Mỗi trường có một mã định danh duy nhất, hỗ trợ kích hoạt tối đa 15 thiết bị.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-rose-600" />
                  <h4 className="font-black text-slate-800">Xuất DOCX và PDF</h4>
                </div>
                <p className="text-sm text-slate-600 leading-6">
                  Chuẩn hóa văn bản rồi tải file Word hoặc PDF để lưu trữ, in ấn, phát hành.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {guideSteps.map((guideStep) => (
                <React.Fragment key={guideStep.step}>
                  <SectionCard guideStep={guideStep} />
                </React.Fragment>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Info className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />

                  <div>
                    <h4 className="font-black text-slate-800 text-lg">Lưu ý quan trọng</h4>

                    <div className="mt-3 space-y-2 text-slate-700 text-sm sm:text-[15px] leading-7">
                      <p className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                        <span>
                          Nên xử lý trên file <strong>.DOCX</strong> gốc để AI nhận diện tốt nhất.
                        </span>
                      </p>

                      <p className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                        <span>Trước khi phát hành văn bản, nên xem lại bản chuẩn hóa và file PDF.</span>
                      </p>

                      <p className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                        <span>Nếu có lỗi PDF, hãy kiểm tra lại server chuyển đổi PDF hoặc kết nối mạng.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Globe className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />

                  <div>
                    <h4 className="font-black text-slate-800 text-lg">Hỗ trợ kỹ thuật</h4>

                    <div className="mt-3 space-y-2 text-slate-700 text-sm sm:text-[15px] leading-7">
                      <p>Khi cần hỗ trợ, vui lòng chuẩn bị:</p>

                      <p className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-sky-600 mt-1 shrink-0" />
                        <span>Ảnh chụp màn hình lỗi.</span>
                      </p>

                      <p className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-sky-600 mt-1 shrink-0" />
                        <span>Mô tả ngắn gọn thao tác đang thực hiện.</span>
                      </p>

                      <p className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-sky-600 mt-1 shrink-0" />
                        <span>Tên đơn vị, mã định danh hoặc tên thiết bị nếu có.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm sm:text-[15px] text-slate-600">
                Cần hỗ trợ thêm về kỹ thuật? Vui lòng liên hệ tác giả:{' '}
                <span className="font-bold text-indigo-700">Lại Cao Đằng</span>
              </p>

              <button
                onClick={onClose}
                className="mt-5 inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black text-base shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 hover:shadow-2xl transition-all"
              >
                Đã hiểu & Đóng lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}