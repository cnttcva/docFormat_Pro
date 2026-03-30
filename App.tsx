import React, { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { ProcessingLog } from './components/ProcessingLog';
import { processDocx } from './services/docxService';
import { DocumentPreview } from './components/DocumentPreview';
import { ProcessingStatus, ProcessResult, DocxOptions, HeaderType, OrgInfo } from './types';
import { 
  FileText, Download, RefreshCw, Sparkles, 
  FileCheck, ShieldCheck, Cpu, LayoutTemplate, 
  Settings2, Zap, ArrowRight, SlidersHorizontal, ChevronDown, ChevronUp, CheckSquare, ListX, Settings, Database, LockKeyhole, Clock, Trash2, Send, AlertTriangle
} from 'lucide-react';

const hanhChinhSymbols = [
  { name: "Nghị quyết", value: "NQ" }, 
  { name: "Quyết định", value: "QĐ" },
  { name: "Quy chế", value: "QC" }, 
  { name: "Quy định", value: "QyĐ" },
  { name: "Thông báo", value: "TB" }, 
  { name: "Hướng dẫn", value: "HD" },
  { name: "Chương trình", value: "CTr" }, 
  { name: "Kế hoạch", value: "KH" },
  { name: "Phương án", value: "PA" }, 
  { name: "Đề án", value: "ĐA" },
  { name: "Dự án", value: "DA" }, 
  { name: "Báo cáo", value: "BC" },
  { name: "Biên bản", value: "BB" }, 
  { name: "Tờ trình", value: "TTr" },
  { name: "Hợp đồng", value: "HĐ" }, 
  { name: "Bản thỏa thuận", value: "BTT" },
  { name: "Giấy ủy quyền", value: "GUQ" }, 
  { name: "Giấy mời", value: "GM" },
  { name: "Giấy giới thiệu", value: "GGT" }, 
  { name: "Giấy nghỉ phép", value: "GNP" },
  { name: "Công văn", value: "CV" }
];

const dangSymbols = [
  { name: "Nghị quyết", value: "NQ" }, 
  { name: "Quyết định", value: "QĐ" },
  { name: "Chỉ thị", value: "CT" }, 
  { name: "Kết luận", value: "KL" },
  { name: "Quy chế", value: "QC" }, 
  { name: "Quy định", value: "QyĐ" },
  { name: "Hướng dẫn", value: "HD" }, 
  { name: "Báo cáo", value: "BC" },
  { name: "Kế hoạch", value: "KH" }, 
  { name: "Chương trình", value: "CTr" },
  { name: "Thông báo", value: "TB" }, 
  { name: "Thông tri", value: "TTr" },
  { name: "Công văn", value: "CV" }, 
  { name: "Tờ trình", value: "TTr" },
  { name: "Biên bản", value: "BB" }
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  
  const [orgInfo, setOrgInfo] = useState<OrgInfo | undefined>(() => {
    const saved = localStorage.getItem('docFormat_OrgInfo');
    return saved ? JSON.parse(saved) : undefined;
  });

  const [pendingAuth, setPendingAuth] = useState<any>(() => {
    const saved = localStorage.getItem('docFormat_PendingAuth');
    return saved ? JSON.parse(saved) : undefined;
  });

  const [authStatus, setAuthStatus] = useState<'REGISTERED' | 'PENDING' | 'UNREGISTERED'>(() => {
    if (localStorage.getItem('docFormat_OrgInfo')) return 'REGISTERED';
    if (localStorage.getItem('docFormat_PendingAuth')) return 'PENDING';
    return 'UNREGISTERED';
  });

  const [unlockCode, setUnlockCode] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const [orgFormValues, setOrgFormValues] = useState<{
      governingBody: string;
      orgName: string;
      partyUpper: string;
      partyCell: string;
      location: string;
      departments: string;
  }>({
    governingBody: orgInfo?.governingBody || pendingAuth?.governingBody || "",
    orgName: orgInfo?.orgName || pendingAuth?.orgName || "",
    partyUpper: orgInfo?.partyUpper || pendingAuth?.partyUpper || "",
    partyCell: orgInfo?.partyCell || pendingAuth?.partyCell || "",
    location: orgInfo?.location || pendingAuth?.location || "",
    departments: orgInfo?.departments ? orgInfo.departments.join(', ') : (pendingAuth?.departments || ""),
  });
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Dùng kiểu 'any' mở rộng để tránh lỗi Typescript khi thêm trường mới mà file types.ts chưa có
  const [options, setOptions] = useState<any>({
    headerType: HeaderType.NONE,
    departmentName: orgInfo?.departments?.[0] || "TỔ CHUYÊN MÔN",
    documentDate: todayStr,
    removeNumbering: false,
    margins: { top: 2, bottom: 2, left: 3, right: 1.5 },
    font: { family: "Times New Roman", sizeNormal: 14, sizeTable: 13 },
    paragraph: { lineSpacing: 1.15, after: 6, indent: 1.27 },
    table: { rowHeight: 0.8 },
    signerTitle: "",
    signerName: "",
    isMinutes: false,
    presiderName: "",
    secretaryName: "",
    docSymbol: "",
    docSuffix: "",
    isCongVan: false,
    congVanSummary: ""
  });

  const isUploadDisabled = options.isMinutes 
    ? (!options.presiderName?.trim() || !options.secretaryName?.trim())
    : (options.isCongVan 
        ? (!options.congVanSummary?.trim() || !options.signerTitle?.trim() || !options.signerName?.trim())
        : (options.headerType !== HeaderType.NONE && (!options.signerTitle?.trim() || !options.signerName?.trim())));

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus(ProcessingStatus.PROCESSING);
    setResult({ success: false, logs: ["Khởi tạo hệ thống xử lý...", "Đang phân tích cấu trúc DOCX..."] });

    setTimeout(async () => {
      const finalOptions = {
          ...options,
          orgInfo: orgInfo ? { ...orgInfo, departmentName: options.departmentName } : undefined
      };
      const res = await processDocx(file, finalOptions);
      setResult(res);
      setStatus(res.success ? ProcessingStatus.SUCCESS : ProcessingStatus.ERROR);
    }, 500);
  };

  const handleDownload = () => {
    if (result?.blob && result.fileName) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus(ProcessingStatus.IDLE);
    setResult(null);
  };

  const handleRegisterRequest = () => {
    if (!orgFormValues.orgName.trim()) {
        alert("Vui lòng nhập ít nhất Tên cơ quan/Trường học để đăng ký.");
        return;
    }

    const code = "DOC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const payload = {
        ...orgFormValues,
        activationCode: code
    };

    localStorage.setItem('docFormat_PendingAuth', JSON.stringify(payload));
    setPendingAuth(payload);
    setAuthStatus('PENDING');

    const scriptUrl = "https://script.google.com/macros/s/AKfycbyDqki9BX9a-qoJfJ-E6WkBc4dSIKA2a_vTjcLZAFShbg0bm9IbOEsM__BbGplO1-CT/exec";
    fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).catch(err => console.log("Tracker err:", err));
  };

  const handleActivate = () => {
      if (unlockCode === pendingAuth?.activationCode) {
          const departmentsArray = pendingAuth.departments
              .split(',')
              .map((d: string) => d.trim())
              .filter((d: string) => d !== "");

          const newOrgInfo: OrgInfo = {
              governingBody: pendingAuth.governingBody,
              orgName: pendingAuth.orgName,
              partyUpper: pendingAuth.partyUpper,
              partyCell: pendingAuth.partyCell,
              location: pendingAuth.location,
              departments: departmentsArray
          };

          localStorage.setItem('docFormat_OrgInfo', JSON.stringify(newOrgInfo));
          localStorage.removeItem('docFormat_PendingAuth');
          setOrgInfo(newOrgInfo);
          setAuthStatus('REGISTERED');
          setShowOrgSettings(false);
          setUnlockCode("");

          if (departmentsArray.length > 0 && (!options.departmentName || !departmentsArray.includes(options.departmentName))) {
              setOptions({...options, departmentName: departmentsArray[0]});
          }
          alert("Kích hoạt bản quyền thành công!");
      } else {
          alert("Mã kích hoạt không hợp lệ. Vui lòng kiểm tra lại!");
      }
  };

  const handleCancelRegistration = () => {
      localStorage.removeItem('docFormat_PendingAuth');
      setPendingAuth(undefined);
      setAuthStatus('UNREGISTERED');
      setUnlockCode("");
  };

  const handleRemoveLicense = () => {
      localStorage.removeItem('docFormat_OrgInfo');
      window.location.reload();
  };

  const closeModal = () => {
      setShowOrgSettings(false);
      setUnlockCode("");
      setConfirmRemove(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col relative overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* Abstract Tech Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* School Top Bar */}
      <div className="relative z-20 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white py-2.5 shadow-md px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="w-24"></div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase flex-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
              {orgInfo?.orgName || "CHƯA ĐĂNG KÝ BẢN QUYỀN"}
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
            </div>
            
            <button 
                onClick={() => setShowOrgSettings(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors font-medium border whitespace-nowrap 
                  ${authStatus === 'REGISTERED' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/30' : 
                    authStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30' : 
                    'bg-rose-500/20 text-rose-200 border-rose-500/30 hover:bg-rose-500/30'}`}
            >
                {authStatus === 'REGISTERED' && (
                  <><LockKeyhole className="w-3.5 h-3.5" /> <span>Bản quyền: {orgInfo?.orgName}</span></>
                )}
                {authStatus === 'PENDING' && (
                  <><Clock className="w-3.5 h-3.5 animate-pulse" /> <span>Đang chờ kích hoạt...</span></>
                )}
                {authStatus === 'UNREGISTERED' && (
                  <><Settings className="w-3.5 h-3.5" /> <span>Đăng ký bản quyền</span></>
                )}
            </button>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-white/50 sticky top-0 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none group-hover:text-blue-700 transition-colors">
                DocFormat <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Pro</span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Automation System</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50/80 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Bảo mật Client-Side
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 flex-grow w-full">
        
        {/* Intro */}
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Phiên bản chuyển đổi số 2.0
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-700">Công cụ chuẩn hóa văn bản hành chính</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
            Chuẩn hóa tài liệu của bạn ngay lập tức. Tuân thủ các quy tắc định dạng hành chính.
          </p>
        </div>

        {/* CẢNH BÁO NẾU CHƯA ĐĂNG KÝ */}
        {authStatus !== 'REGISTERED' && (
            <div className="mb-8 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center animate-pulse shadow-md">
                <LockKeyhole className="w-8 h-8 text-rose-500 mb-2" />
                <h3 className="font-bold text-rose-800">HỆ THỐNG ĐANG BỊ KHÓA</h3>
                <p className="text-sm text-rose-600 mt-1 mb-3">Vui lòng đăng ký bản quyền đơn vị để mở khóa chức năng chuẩn hóa văn bản.</p>
                <button 
                    onClick={() => setShowOrgSettings(true)}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-sm font-bold shadow transition-colors"
                >
                    Đăng ký ngay
                </button>
            </div>
        )}

        {/* Configuration Section */}
        {authStatus === 'REGISTERED' && (
        <div className="mb-8">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-sm font-bold text-orange-700 bg-orange-50 border-2 border-orange-300 px-6 py-2.5 rounded-full shadow-md hover:bg-orange-100 hover:shadow-lg hover:scale-105 transition-all mx-auto"
            >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Tùy chỉnh thông số</span>
                {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showSettings && (
                <div className="mt-4 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-fadeIn">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-blue-600" /> Cấu hình định dạng
                    </h3>
                    
                    {/* Header Template Option */}
                    <div className="mb-4 pb-4 border-b border-slate-100">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <LayoutTemplate className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-bold text-slate-700">Chèn khung Quốc hiệu/Tiêu ngữ mẫu</span>
                            </div>
                            <select 
                                value={options.headerType}
                                onChange={(e) => setOptions({...options, headerType: e.target.value as HeaderType})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-slate-700"
                            >
                                <option value={HeaderType.NONE}>❌ Không chèn thêm</option>
                                <option value={HeaderType.SCHOOL}>🏫 Văn bản Hành chính (Nhà trường/Cơ quan)</option>
                                <option value={HeaderType.PARTY}>⭐ Văn bản Công tác Đảng (Chi bộ)</option>
                                <option value={HeaderType.DEPARTMENT}>📚 Văn bản Nội bộ (Tổ chuyên môn)</option>
                            </select>
                            <p className="text-[10px] text-slate-400">Tự động chèn bảng thông tin cơ quan và Quốc hiệu vào đầu trang theo mẫu đã chọn</p>
                            
                            {/* Conditional Document Symbol & Suffix */}
                            {(options.headerType === HeaderType.SCHOOL || options.headerType === HeaderType.PARTY) && (
                                <div className="mt-4 animate-fadeIn border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Ký hiệu văn bản
                                        </label>
                                        <select 
                                            value={options.docSymbol || ""}
                                            onChange={(e) => setOptions({...options, docSymbol: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-slate-700"
                                        >
                                            <option value="">--- Chọn ký hiệu ---</option>
                                            {(options.headerType === HeaderType.SCHOOL ? hanhChinhSymbols : dangSymbols).map(sym => (
                                                <option key={sym.value} value={sym.value}>{sym.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Hậu tố cơ quan
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder={options.headerType === HeaderType.SCHOOL ? "Nhập hậu tố, vd: THCSCVA" : "Nhập hậu tố, vd: CB"}
                                            value={options.docSuffix || ""}
                                            onChange={(e) => setOptions({...options, docSuffix: e.target.value.toUpperCase()})}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Conditional Department Select */}
                            {options.headerType === HeaderType.DEPARTMENT && (
                                <div className="mt-4 animate-fadeIn border-t border-slate-100 pt-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Chọn Tổ/Phòng ban
                                    </label>
                                    <select 
                                        value={options.departmentName || ""}
                                        onChange={(e) => setOptions({...options, departmentName: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-blue-800"
                                    >
                                        {orgInfo?.departments && orgInfo.departments.length > 0 ? (
                                            orgInfo.departments.map((dept, index) => (
                                                <option key={index} value={dept.toUpperCase()}>{dept.toUpperCase()}</option>
                                            ))
                                        ) : (
                                            <option value="TỔ CHUYÊN MÔN">TỔ CHUYÊN MÔN</option>
                                        )}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">Danh sách này được lấy từ phần Cài đặt đơn vị.</p>
                                </div>
                            )}

                            {/* Document Date Picker */}
                            {options.headerType !== HeaderType.NONE && (
                                <div className="mt-4 animate-fadeIn border-t border-slate-100 pt-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Ngày ban hành văn bản
                                    </label>
                                    <input 
                                        type="date" 
                                        value={options.documentDate || ""}
                                        onChange={(e) => setOptions({...options, documentDate: e.target.value})}
                                        className="w-full sm:w-1/2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">Mặc định là ngày hôm nay. Bạn có thể thay đổi nếu soạn văn bản cho ngày khác.</p>
                                </div>
                            )}

                            {/* Options: Minutes & Cong Van */}
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${options.isMinutes ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                                        {options.isMinutes && <CheckSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={options.isMinutes}
                                        onChange={(e) => setOptions({...options, isMinutes: e.target.checked, isCongVan: false})}
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Đây là văn bản BIÊN BẢN</span>
                                        <p className="text-[10px] text-slate-400">Tự động cấu hình định dạng dành riêng cho biên bản cuộc họp</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${options.isCongVan ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                                        {options.isCongVan && <CheckSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={options.isCongVan}
                                        onChange={(e) => setOptions({...options, isCongVan: e.target.checked, isMinutes: false})}
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Đây là CÔNG VĂN</span>
                                        <p className="text-[10px] text-slate-400">Tự động trích yếu, thụt lề Kính gửi, Nơi nhận theo chuẩn Nghị định 30</p>
                                    </div>
                                </label>
                            </div>

                            {/* Cong Van Summary Input */}
                            {options.isCongVan && (
                                <div className="mt-4 animate-fadeIn border-t border-slate-100 pt-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Nội dung trích yếu (V/v...)
                                    </label>
                                    <textarea 
                                        rows={2}
                                        placeholder="VD: V/v tiếp tục triển khai thực hiện Chỉ thị số..."
                                        value={options.congVanSummary || ""}
                                        onChange={(e) => setOptions({...options, congVanSummary: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-800 resize-none"
                                    />
                                </div>
                            )}

                            {/* Signer Information (For both Normal and Cong Van) */}
                            {!options.isMinutes && options.headerType !== HeaderType.NONE && (
                                <div className="mt-4 animate-fadeIn border-t border-slate-100 pt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Chức vụ người ký
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Nhập chức vụ người ký (VD: PHÓ HIỆU TRƯỞNG...)"
                                            value={options.signerTitle || ""}
                                            onChange={(e) => setOptions({...options, signerTitle: e.target.value.toUpperCase()})}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Họ và tên người ký
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Nhập Họ và tên người ký (VD: Nguyễn Văn A...)"
                                            value={options.signerName || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const formatted = val.split(' ').map(word => 
                                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                ).join(' ');
                                                setOptions({...options, signerName: formatted});
                                            }}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Minutes Signer Information */}
                            {options.isMinutes && (
                                <div className="mt-4 animate-fadeIn border-t border-slate-100 pt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Nhập Họ và tên CHỦ TỌA
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="VD: Nguyễn Văn A..."
                                            value={options.presiderName || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const formatted = val.split(' ').map(word => 
                                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                ).join(' ');
                                                setOptions({...options, presiderName: formatted});
                                            }}
                                            className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Nhập Họ và tên THƯ KÝ
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="VD: Trần Thị B..."
                                            value={options.secretaryName || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const formatted = val.split(' ').map(word => 
                                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                ).join(' ');
                                                setOptions({...options, secretaryName: formatted});
                                            }}
                                            className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-800"
                                        />
                                    </div>
                                </div>
                            )}

                            {isUploadDisabled && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl animate-fadeIn">
                                    <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                                        {options.isMinutes 
                                            ? "Bạn chưa nhập đầy đủ họ tên Chủ tọa và Thư ký"
                                            : (options.isCongVan && !options.congVanSummary?.trim() 
                                                ? "Bạn chưa nhập Nội dung trích yếu của Công văn"
                                                : "Bạn chưa nhập đầy đủ thông tin chức vụ hoặc họ tên người ký")
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Remove Numbering Option */}
                    <div className="mb-6 pb-6 border-b border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${options.removeNumbering ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 group-hover:border-orange-400'}`}>
                                {options.removeNumbering && <ListX className="w-3.5 h-3.5" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={options.removeNumbering}
                                onChange={(e) => setOptions({...options, removeNumbering: e.target.checked})}
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-700 group-hover:text-orange-600 transition-colors">Xóa định dạng danh sách tự động (Bullets/Numbering)</span>
                                <p className="text-xs text-slate-400 mt-0.5">Chuyển đổi danh sách 1., 2., • thành văn bản thường để đồng bộ định dạng</p>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Margins */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Lề Trang (cm)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-xs text-slate-400">Trên (Top)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.top}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, top: parseFloat(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Dưới (Bottom)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.bottom}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, bottom: parseFloat(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Trái (Left)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.left}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, left: parseFloat(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Phải (Right)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.right}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, right: parseFloat(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Font & Paragraph */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Font & Đoạn văn</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-xs text-slate-400">Cỡ chữ Thường (pt)</span>
                                    <input 
                                        type="number"
                                        value={options.font.sizeNormal}
                                        onChange={(e) => setOptions({...options, font: {...options.font, sizeNormal: parseInt(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Cỡ chữ Bảng (pt)</span>
                                    <input 
                                        type="number"
                                        value={options.font.sizeTable}
                                        onChange={(e) => setOptions({...options, font: {...options.font, sizeTable: parseInt(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Dãn dòng (Lines)</span>
                                    <input 
                                        type="number" step="0.05"
                                        value={options.paragraph.lineSpacing}
                                        onChange={(e) => setOptions({...options, paragraph: {...options.paragraph, lineSpacing: parseFloat(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Thụt đầu dòng (cm)</span>
                                    <input 
                                        type="number" step="0.01"
                                        value={options.paragraph.indent}
                                        onChange={(e) => setOptions({...options, paragraph: {...options.paragraph, indent: parseFloat(e.target.value)}})}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        )}

        {/* Main Card (Only show if Registered) */}
        <div className={`bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group ${authStatus !== 'REGISTERED' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"></div>

          <div className="p-8 space-y-8">
            {/* Step 1: Upload */}
            {!file && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-400 uppercase tracking-wider">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs border border-slate-200 shadow-sm">01</div>
                  <span className="text-slate-500">Tải lên tài liệu</span>
                  <div className="h-px bg-slate-100 flex-grow"></div>
                </div>
                <Dropzone onFileSelect={handleFileSelect} disabled={isUploadDisabled || authStatus !== 'REGISTERED'} />
              </div>
            )}

            {/* Step 2: File Selected & Actions */}
            {file && status !== ProcessingStatus.SUCCESS && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="bg-blue-100/50 p-3 rounded-xl">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">DOCX</span>
                         <span className="text-xs text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    title="Hủy bỏ"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {status === ProcessingStatus.IDLE && (
                  <button
                    onClick={handleProcess}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 group"
                  >
                    <Zap className="w-5 h-5 group-hover:text-yellow-300 transition-colors" />
                    <span>Thực hiện Chuẩn hóa ngay</span>
                    <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {status === ProcessingStatus.PROCESSING && (
                  <button
                    disabled
                    className="w-full py-4 bg-slate-50 text-slate-500 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 cursor-wait border border-slate-200"
                  >
                    <div className="relative">
                       <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <span>Đang xử lý dữ liệu...</span>
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Success */}
            {status === ProcessingStatus.SUCCESS && result && (
              <div className="text-center space-y-8 animate-fadeIn py-2">
                 <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-green-50 to-white text-green-600 rounded-full flex items-center justify-center border-4 border-green-50 shadow-inner">
                      <FileCheck className="w-10 h-10 drop-shadow-sm" />
                    </div>
                 </div>
                 
                 <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Xử lý thành công!</h3>
                    <p className="text-slate-500">Tài liệu đã được chuẩn hóa theo quy định.</p>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleDownload}
                      className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Tải về máy
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Làm tiếp
                    </button>
                 </div>

                 {/* NEW: Document Preview Injection */}
                 <DocumentPreview blob={result.blob} />
              </div>
            )}

            {/* Logs Area */}
            {result?.logs && result.logs.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <ProcessingLog logs={result.logs} />
              </div>
            )}

            {/* Error Display */}
            {status === ProcessingStatus.ERROR && (
              <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-center flex flex-col items-center">
                <p className="font-bold">Đã xảy ra lỗi</p>
                <p className="text-sm opacity-90 mt-1">{result?.error}</p>
                <button onClick={handleReset} className="mt-3 text-sm font-semibold hover:underline text-red-700">Thử lại</button>
              </div>
            )}

          </div>
        </div>


      </main>
      
      {/* Design Credit Footer */}
      <footer className="py-6 text-center relative z-10 bg-white/50 border-t border-slate-200 backdrop-blur-sm">
         <p className="text-slate-500 text-sm font-medium">
           <span className="opacity-70">Version: 1.1-2026 &bull; Design by</span> <span className="text-blue-700 font-bold">Lai Cao Dang</span>
         </p>
      </footer>

      {/* Organization Settings Modal */}
      {showOrgSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-4 text-white flex items-center justify-between shrink-0 
              ${authStatus === 'REGISTERED' ? 'bg-emerald-600' : authStatus === 'PENDING' ? 'bg-amber-500' : 'bg-blue-600'}`}>
              <h3 className="font-bold flex items-center gap-2">
                {authStatus === 'REGISTERED' && <LockKeyhole className="w-5 h-5" />}
                {authStatus === 'PENDING' && <Clock className="w-5 h-5" />}
                {authStatus === 'UNREGISTERED' && <Database className="w-5 h-5" />}
                
                {authStatus === 'REGISTERED' ? 'Thông Tin Bản Quyền' : 
                 authStatus === 'PENDING' ? 'Chờ Kích Hoạt Bản Quyền' : 'Đăng ký Đơn vị Hệ thống'}
              </h3>
              <button 
                onClick={closeModal}
                className="text-white/70 hover:text-white transition-colors"
              >
                <ListX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* STATE: REGISTERED */}
              {authStatus === 'REGISTERED' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900 shadow-inner">
                    <p className="font-medium mb-3 leading-relaxed">
                      Phần mềm <strong>DocFormat Pro</strong> đã được đăng ký bản quyền sử dụng hợp lệ cho đơn vị: <strong className="text-emerald-700 uppercase">{orgInfo?.orgName}</strong>.
                    </p>
                    <div className="bg-white/60 p-3 rounded-lg text-sm border border-emerald-100/50 space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Hỗ trợ kỹ thuật:</p>
                      <p><strong>Tác giả:</strong> Lại Cao Đằng</p>
                      <p><strong>Điện thoại:</strong> 0973 225 722</p>
                      <p><strong>Email:</strong> laicaodang@thcscva.edu.vn</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 flex justify-center">
                    {!confirmRemove ? (
                        <button 
                            onClick={() => setConfirmRemove(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Gỡ bản quyền (Cài đặt lại)
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-3 w-full bg-rose-50 p-4 rounded-xl border border-rose-200 animate-fadeIn">
                            <span className="text-sm font-bold text-rose-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Chắc chắn gỡ bản quyền thiết bị này?
                            </span>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setConfirmRemove(false)}
                                    className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={handleRemoveLicense}
                                    className="flex-1 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-md transition-colors"
                                >
                                    Xác nhận gỡ
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                </div>
              )}

              {/* STATE: PENDING */}
              {authStatus === 'PENDING' && (
                  <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 shadow-inner text-center">
                    <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-bounce" />
                    <p className="font-medium mb-3 leading-relaxed">
                      Yêu cầu đăng ký bản quyền cho <strong className="text-amber-700 uppercase">{pendingAuth?.orgName}</strong> đã được gửi thành công.
                    </p>
                    <p className="text-sm mb-4">
                      Vui lòng liên hệ tác giả để nhận Mã kích hoạt phần mềm:
                    </p>
                    <div className="bg-white/60 p-3 rounded-lg text-sm border border-amber-100/50 space-y-1 text-left">
                      <p><strong>Tác giả:</strong> Lại Cao Đằng</p>
                      <p><strong>Điện thoại/Zalo:</strong> 0973 225 722</p>
                      <p><strong>Email:</strong> laicaodang@thcscva.edu.vn</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 text-center">NHẬP MÃ KÍCH HOẠT</label>
                    <input 
                      type="password" 
                      value={unlockCode}
                      onChange={(e) => setUnlockCode(e.target.value)}
                      placeholder="Nhập mã tác giả cung cấp..."
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 tracking-widest text-center font-mono"
                    />
                  </div>
                </div>
              )}

              {/* STATE: UNREGISTERED */}
              {authStatus === 'UNREGISTERED' && (
                <>
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs font-medium mb-4 border border-blue-100 shadow-inner">
                      Vui lòng điền thông tin chính xác. Yêu cầu của bạn sẽ được gửi đến Tác giả để xét duyệt cấp mã kích hoạt.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Đơn vị chủ quản</label>
                    <input 
                      type="text" 
                      value={orgFormValues.governingBody}
                      onChange={(e) => setOrgFormValues({...orgFormValues, governingBody: e.target.value})}
                      placeholder="VD: UBND HUYỆN EA KAR"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tên cơ quan / Trường học</label>
                    <input 
                      type="text" 
                      value={orgFormValues.orgName}
                      onChange={(e) => setOrgFormValues({...orgFormValues, orgName: e.target.value})}
                      placeholder="VD: TRƯỜNG THCS CHU VĂN AN"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Đảng bộ cấp trên</label>
                    <input 
                      type="text" 
                      value={orgFormValues.partyUpper}
                      onChange={(e) => setOrgFormValues({...orgFormValues, partyUpper: e.target.value})}
                      placeholder="VD: ĐẢNG BỘ XÃ EA KAR"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tên Chi bộ</label>
                    <input 
                      type="text" 
                      value={orgFormValues.partyCell}
                      onChange={(e) => setOrgFormValues({...orgFormValues, partyCell: e.target.value})}
                      placeholder="VD: CHI BỘ TRƯỜNG THCS CHU VĂN AN"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Địa danh (ghi ngày tháng)</label>
                    <input 
                      type="text" 
                      value={orgFormValues.location}
                      onChange={(e) => setOrgFormValues({...orgFormValues, location: e.target.value})}
                      placeholder="VD: Ea Kar"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Danh sách Tổ chuyên môn (Cơ quan/Trường học)</label>
                    <textarea 
                      rows={3}
                      value={orgFormValues.departments}
                      onChange={(e) => setOrgFormValues({...orgFormValues, departments: e.target.value})}
                      placeholder="Nhập các tổ, cách nhau bằng dấu phẩy. VD: Tổ Toán - Tin, Tổ Ngữ Văn, Tổ Hành Chính..."
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* ACTION BUTTONS */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              
              {authStatus === 'REGISTERED' && (
                  <button 
                      onClick={closeModal}
                      className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-colors"
                  >
                      Đóng
                  </button>
              )}

              {authStatus === 'PENDING' && (
                  <>
                      <button 
                          onClick={handleCancelRegistration}
                          className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                          Hủy yêu cầu
                      </button>
                      <button 
                          onClick={handleActivate}
                          className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
                      >
                          <LockKeyhole className="w-4 h-4" /> Kích hoạt phần mềm
                      </button>
                  </>
              )}

              {authStatus === 'UNREGISTERED' && (
                  <>
                      <button 
                          onClick={closeModal}
                          className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                          Hủy bỏ
                      </button>
                      <button 
                          onClick={handleRegisterRequest}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
                      >
                          <Send className="w-4 h-4" /> Gửi yêu cầu đăng ký
                      </button>
                  </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}