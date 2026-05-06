// File: src/components/UserGuide.tsx
import React from 'react';
import {
  BookOpen,
  X,
  CheckCircle2,
  UploadCloud,
  Settings2,
  FileDown,
  Sparkles,
  AlertTriangle,
  Monitor,
  ShieldCheck,
  Download,
  RefreshCw,
  FileText,
  PlayCircle,
  MousePointerClick,
  FolderOpen,
  Power,
  Globe2,
  HelpCircle,
  Laptop,
} from 'lucide-react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const SoftBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-700">
    {children}
  </span>
);

const CodeText = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[12px] font-bold text-slate-700">
    {children}
  </span>
);

const SectionCard = ({
  icon,
  title,
  children,
  accent = 'from-indigo-500 to-blue-500',
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) => (
  <section className="relative overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm">
    <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${accent}`} />

    <div className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-base font-black leading-snug text-slate-800 sm:text-lg">
          {title}
        </h3>
      </div>

      <div className="space-y-3 text-sm leading-6 text-slate-600">
        {children}
      </div>
    </div>
  </section>
);

const StepBox = ({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: React.ReactNode;
}) => (
  <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
      {number}
    </div>
    <div>
      <p className="font-extrabold text-slate-800">{title}</p>
      <div className="mt-1 text-[13px] leading-5 text-slate-600">
        {desc}
      </div>
    </div>
  </div>
);

const CheckLine = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3">
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
    <span className="text-[13px] leading-5 text-slate-600">{children}</span>
  </div>
);

const SimplePdfStep = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
        {icon}
      </div>
      <p className="font-black text-slate-800">{title}</p>
    </div>
    <div className="text-[13px] leading-5 text-slate-600">
      {desc}
    </div>
  </div>
);

export function UserGuide({ isOpen, onClose }: UserGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-indigo-700 via-violet-700 to-blue-600 px-5 py-6 text-white sm:px-8 sm:py-7">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-28 left-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="absolute right-24 top-8 h-24 w-24 rounded-full bg-purple-300/20 blur-xl" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                <BookOpen className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  HƯỚNG DẪN SỬ DỤNG
                </h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">
                  DOCFORMAT PRO V10.0 ULTIMATE
                </p>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-indigo-50">
                  Hướng dẫn nhanh cách cài đặt, đăng ký bản quyền, chuẩn hóa văn bản và tải PDF bằng PDF Helper.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-2xl p-3 text-white/85 transition hover:bg-white/15 hover:text-white"
              title="Đóng hướng dẫn"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-6 sm:px-8">
          <div className="mx-auto mb-6 max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Chuẩn hóa văn bản nhanh, bảo mật, chuyên nghiệp
            </div>

            <p className="text-[15px] font-medium leading-7 text-slate-600">
              DocFormat Pro giúp chuyển tài liệu Word cũ, sai định dạng hoặc chưa thống nhất
              thành văn bản hành chính chuẩn form. Người dùng chỉ cần làm theo các bước bên dưới.
            </p>
          </div>

          <div className="grid gap-5">
            {/* 1 */}
            <SectionCard
              icon={<Monitor className="h-6 w-6" />}
              title="1. Cài ứng dụng docFormat Pro ra màn hình Desktop"
              accent="from-violet-500 to-indigo-600"
            >
              <StepBox
                number="1"
                title="Mở docFormat Pro bằng Chrome hoặc Edge"
                desc="Mở đường link docFormat Pro do quản trị viên cung cấp."
              />

              <StepBox
                number="2"
                title="Bấm biểu tượng cài đặt ứng dụng"
                desc={
                  <>
                    Trên thanh địa chỉ trình duyệt, bấm biểu tượng <b>Cài đặt ứng dụng</b>.
                    Nếu không thấy biểu tượng, bấm menu ba chấm rồi chọn <b>Cài đặt docFormat Pro</b>.
                  </>
                }
              />

              <StepBox
                number="3"
                title="Từ lần sau mở bằng biểu tượng Desktop"
                desc="Sau khi cài, ngoài màn hình Desktop sẽ có biểu tượng docFormat Pro. Người dùng chỉ cần bấm biểu tượng đó để mở ứng dụng."
              />
            </SectionCard>

            {/* 2 */}
            <SectionCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="2. Đăng ký và kiểm tra bản quyền thiết bị"
              accent="from-emerald-500 to-teal-600"
            >
              <CheckLine>
                Nếu thiết bị chưa được cấp phép, ứng dụng sẽ hiện cửa sổ đăng ký bản quyền.
              </CheckLine>
              <CheckLine>
                Chọn đúng đơn vị trường học, nhập tên thiết bị và tên người sử dụng.
              </CheckLine>
              <CheckLine>
                Sau khi gửi yêu cầu, chờ Admin duyệt. Khi được duyệt, bấm <b>Kiểm tra trạng thái cấp phép</b>.
              </CheckLine>
              <CheckLine>
                Nếu thiết bị bị thu hồi hoặc trường bị khóa, ứng dụng sẽ tự khóa lại theo trạng thái bản quyền.
              </CheckLine>
            </SectionCard>

            {/* 3 */}
            <SectionCard
              icon={<Settings2 className="h-6 w-6" />}
              title="3. Tinh chỉnh thông số trước khi chuẩn hóa"
              accent="from-blue-500 to-cyan-500"
            >
              <CheckLine>
                Chọn mẫu văn bản: Nhà trường, Chi bộ Đảng, Tổ chuyên môn hoặc không chèn thêm.
              </CheckLine>
              <CheckLine>
                Nếu là <b>Công văn</b>, nhập phần trích yếu để hệ thống trình bày đúng thể thức.
              </CheckLine>
              <CheckLine>
                Nếu là <b>Biên bản</b>, nhập họ tên Chủ tọa và Thư ký để tạo đúng hai vùng chữ ký.
              </CheckLine>
              <CheckLine>
                Nếu là <b>Quyết định</b>, chọn đúng loại văn bản nhà trường hoặc Chi bộ để hệ thống định dạng đúng mẫu.
              </CheckLine>
              <CheckLine>
                Nhập chức vụ, họ tên người ký hoặc người duyệt. Ứng dụng sẽ tự ghi nhớ cho lần sau.
              </CheckLine>
            </SectionCard>

            {/* 4 */}
            <SectionCard
              icon={<UploadCloud className="h-6 w-6" />}
              title="4. Chuẩn hóa tài liệu Word"
              accent="from-fuchsia-500 to-violet-600"
            >
              <StepBox
                number="1"
                title="Tải file Word gốc lên"
                desc="Kéo thả hoặc chọn file Word cần chuẩn hóa. Nên dùng file .docx để có kết quả tốt nhất."
              />

              <StepBox
                number="2"
                title="Bấm Thực hiện chuẩn hóa AI"
                desc="Ứng dụng sẽ xử lý bố cục, font chữ, căn lề, bảng biểu, tiêu đề, nơi nhận, chữ ký và các phần đặc biệt."
              />

              <StepBox
                number="3"
                title="Xem lại kết quả"
                desc="Có thể xem Bản gốc, Soi chiếu song song và Bản chuẩn hóa trước khi tải về."
              />
            </SectionCard>

            {/* 5 PDF HELPER SIMPLE */}
            <SectionCard
              icon={<FileDown className="h-6 w-6" />}
              title="5. Muốn tải PDF thì cần bật docFormat PDF Helper"
              accent="from-rose-500 to-orange-500"
            >
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-black">Giải thích dễ hiểu</p>
                    <p className="mt-1 text-[13px] leading-5">
                      Nút <b>Tải DOCX</b> dùng trực tiếp trong ứng dụng. Nhưng nút <b>Tải PDF</b> cần một
                      “bộ hỗ trợ nhỏ” chạy trên máy tính, gọi là <b>docFormat PDF Helper</b>. Bộ hỗ trợ này dùng
                      LibreOffice để chuyển Word thành PDF ngay trên máy, không cần thuê máy chủ.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SimplePdfStep
                  icon={<Download className="h-5 w-5" />}
                  title="Việc 1: Cài LibreOffice"
                  desc={
                    <>
                      Cài LibreOffice một lần trên máy tính. Đây là phần mềm miễn phí, giúp chuyển file Word sang PDF.
                      Sau khi cài xong, không cần mở LibreOffice.
                    </>
                  }
                />

                <SimplePdfStep
                  icon={<FolderOpen className="h-5 w-5" />}
                  title="Việc 2: Mở thư mục pdf-converter"
                  desc={
                    <>
                      Trong bộ cài docFormat Pro, mở thư mục <CodeText>pdf-converter</CodeText>.
                      Đây là thư mục chứa công cụ hỗ trợ xuất PDF.
                    </>
                  }
                />

                <SimplePdfStep
                  icon={<MousePointerClick className="h-5 w-5" />}
                  title="Việc 3: Bấm file START_PDF_HELPER.bat"
                  desc={
                    <>
                      Bấm đúp file <CodeText>START_PDF_HELPER.bat</CodeText>.
                      Nếu cửa sổ màu đen hiện dòng <b>docFormat PDF Helper đang chạy</b> là đã thành công.
                    </>
                  }
                />

                <SimplePdfStep
                  icon={<Power className="h-5 w-5" />}
                  title="Việc 4: Không đóng cửa sổ đó"
                  desc={
                    <>
                      Trong lúc dùng nút <b>Tải PDF</b>, hãy để cửa sổ PDF Helper mở.
                      Nếu đóng cửa sổ đó, chức năng tải PDF sẽ không hoạt động.
                    </>
                  }
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <div className="flex items-start gap-3">
                  <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-black">Cách kiểm tra nhanh</p>
                    <p className="mt-1 text-[13px] leading-5">
                      Mở trình duyệt và nhập <CodeText>http://localhost:8787</CodeText>.
                      Nếu thấy dòng <CodeText>"ok": true</CodeText> và <CodeText>"libreOfficeDetected": true</CodeText>
                      thì máy đã sẵn sàng tải PDF.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 flex items-center gap-2 font-black text-slate-800">
                  <HelpCircle className="h-5 w-5 text-indigo-600" />
                  Người dùng chỉ cần nhớ ngắn gọn
                </p>
                <p className="text-[13px] leading-6 text-slate-600">
                  Muốn tải PDF: <b>Cài LibreOffice</b> → <b>Bấm START_PDF_HELPER.bat</b> → <b>Để cửa sổ đó mở</b> → <b>Quay lại docFormat Pro bấm Tải PDF</b>.
                </p>
              </div>
            </SectionCard>

            {/* 6 ERROR */}
            <SectionCard
              icon={<AlertTriangle className="h-6 w-6" />}
              title="6. Nếu không tải được PDF thì làm gì?"
              accent="from-amber-500 to-red-500"
            >
              <CheckLine>
                Nếu báo <b>không kết nối được PDF Helper</b>: mở thư mục <CodeText>pdf-converter</CodeText> và chạy lại <CodeText>START_PDF_HELPER.bat</CodeText>.
              </CheckLine>
              <CheckLine>
                Nếu báo <b>chưa tìm thấy LibreOffice</b>: cài LibreOffice rồi chạy lại PDF Helper.
              </CheckLine>
              <CheckLine>
                Nếu trình duyệt hỏi quyền truy cập dịch vụ trên thiết bị: bấm <b>Cho phép</b>.
              </CheckLine>
              <CheckLine>
                Nếu chỉ cần file Word đã chuẩn hóa, bấm <b>Tải DOCX</b>; chức năng này không cần PDF Helper.
              </CheckLine>
            </SectionCard>

            {/* 7 DOWNLOAD */}
            <SectionCard
              icon={<Download className="h-6 w-6" />}
              title="7. Tải kết quả và xử lý file mới"
              accent="from-slate-700 to-slate-900"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <FileText className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="font-black text-emerald-800">Tải DOCX</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Tải file Word đã chuẩn hóa.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <FileDown className="mb-2 h-5 w-5 text-rose-600" />
                  <p className="font-black text-rose-800">Tải PDF</p>
                  <p className="mt-1 text-xs text-rose-700">
                    Cần PDF Helper đang chạy.
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <RefreshCw className="mb-2 h-5 w-5 text-indigo-600" />
                  <p className="font-black text-indigo-800">Xử lý file khác</p>
                  <p className="mt-1 text-xs text-indigo-700">
                    Quay lại để tải tài liệu mới.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* FOOTER */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <PlayCircle className="h-4 w-4 text-indigo-500" />
              <span>
                Cần hỗ trợ kỹ thuật? Vui lòng liên hệ tác giả:{' '}
                <b className="text-indigo-700">Lại Cao Đằng</b>
              </span>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Đã hiểu & Đóng lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}