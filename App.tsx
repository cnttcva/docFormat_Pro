import React, { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { ProcessingLog } from './components/ProcessingLog';
import { processDocx } from './services/docxService';
import { DocumentPreview } from './components/DocumentPreview';
import { UserGuide } from './components/UserGuide';
import { ProcessingStatus, ProcessResult, DocxOptions, HeaderType, OrgInfo } from './types';
import { 
  FileText, Download, RefreshCw, Sparkles, 
  FileCheck, ShieldCheck, Cpu, LayoutTemplate, 
  Settings2, Zap, ArrowRight, SlidersHorizontal, ChevronDown, ChevronUp, CheckSquare, ListX, Settings, Database, LockKeyhole, Clock, Trash2, Send, AlertTriangle,
  BookOpen, Bot, UploadCloud, Users, X
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
  const [showGuide, setShowGuide] = useState(false);
  
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
  
  const getSavedSignatures = () => {
    const saved = localStorage.getItem('docFormat_Signatures');
    return saved ? JSON.parse(saved) : {};
  };
  const savedSigs = getSavedSignatures();

  const [options, setOptions] = useState<any>({
    headerType: HeaderType.NONE,
    departmentName: orgInfo?.departments?.[0] || "TỔ CHUYÊN MÔN",
    documentDate: todayStr,
    removeNumbering: false,
    margins: { top: 2, bottom: 2, left: 3, right: 1.5 },
    font: { family: "Times New Roman", sizeNormal: 14, sizeTable: 13 },
    paragraph: { lineSpacing: 1.15, after: 6, indent: 1.27 },
    table: { rowHeight: 0.8 },
    docSymbol: "",
    docSuffix: savedSigs.docSuffix || "", 
    isCongVan: false,
    congVanSummary: "",
    isMinutes: false,
    signerTitle: savedSigs.signerTitle || "",
    signerName: savedSigs.signerName || "",
    presiderName: savedSigs.presiderName || "",
    secretaryName: savedSigs.secretaryName || "",
    approverTitle: savedSigs.approverTitle || "", 
    approverName: savedSigs.approverName || ""   
  });

  const isUploadDisabled = options.isMinutes 
    ? (!options.presiderName?.trim() || !options.secretaryName?.trim())
    : (options.isCongVan 
        ? (!options.congVanSummary?.trim() || !options.signerTitle?.trim() || !options.signerName?.trim())
        : (options.headerType === HeaderType.DEPARTMENT 
            ? (!options.signerTitle?.trim() || !options.signerName?.trim() || !options.approverTitle?.trim() || !options.approverName?.trim())
            : (options.headerType !== HeaderType.NONE && (!options.signerTitle?.trim() || !options.signerName?.trim())))
      );

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
  };

  const handleProcess = async () => {
    if (!file) return;

    const signatureData = {
        signerTitle: options.signerTitle,
        signerName: options.signerName,
        presiderName: options.presiderName,
        secretaryName: options.secretaryName,
        approverTitle: options.approverTitle,
        approverName: options.approverName,
        docSuffix: options.docSuffix 
    };
    localStorage.setItem('docFormat_Signatures', JSON.stringify(signatureData));

    setStatus(ProcessingStatus.PROCESSING);
    setResult({ success: false, logs: ["Khởi tạo AI Engine V7.5 Ultimate...", "Đang phân tích và tái cấu trúc DOCX..."] });

    setTimeout(async () => {
      const finalOptions = {
          ...options,
          orgInfo: orgInfo ? { ...orgInfo, departmentName: options.departmentName } : undefined
      };
      const res = await processDocx(file, finalOptions);
      setResult(res);
      setStatus(res.success ? ProcessingStatus.SUCCESS : ProcessingStatus.ERROR);
    }, 800);
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
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans flex flex-col relative overflow-hidden selection:bg-violet-200 selection:text-violet-900">
      
      {/* Background AI Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-200/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-cyan-100/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-200/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

      {/* Top Banner */}
      <div className="relative z-20 bg-slate-900 text-white py-2 shadow-md px-4 border-b border-indigo-500/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block w-24"></div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase flex-1">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.8)]"></span>
              {orgInfo?.orgName || "CHƯA ĐĂNG KÝ BẢN QUYỀN"}
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            </div>
            
            <button 
                onClick={() => setShowOrgSettings(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] transition-all font-bold border whitespace-nowrap tracking-wide
                  ${authStatus === 'REGISTERED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 
                    authStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 
                    'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'}`}
            >
                {authStatus === 'REGISTERED' && (
                  <><LockKeyhole className="w-3.5 h-3.5" /> <span>License Active</span></>
                )}
                {authStatus === 'PENDING' && (
                  <><Clock className="w-3.5 h-3.5 animate-pulse" /> <span>Đang chờ cấp quyền...</span></>
                )}
                {authStatus === 'UNREGISTERED' && (
                  <><Settings className="w-3.5 h-3.5" /> <span>Đăng ký bản quyền</span></>
                )}
            </button>
        </div>
      </div>

      {/* Header - Glassmorphism */}
      <header className="relative z-30 bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-2.5 rounded-xl text-white shadow-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-cyan-300" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                DocFormat <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500">Pro</span>
              </h1>
              <p className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-widest mt-1">AI Document Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/80 px-4 py-2.5 rounded-full border border-slate-200 shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Client-Side Processing
            </div>
            <button 
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 px-5 py-2.5 rounded-full border border-indigo-100 shadow-sm hover:shadow-md hover:bg-indigo-100 hover:scale-105 transition-all duration-300 backdrop-blur-md"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Hướng dẫn & Mẹo</span>
              <span className="sm:hidden">HDSD</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-grow w-full">
        
        {/* Hero Title */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-cyan-50 border border-violet-100 shadow-sm text-violet-700 text-[11px] font-black uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" /> 
            Phiên bản chuyển đổi số
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            Tự động hóa <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600">Văn bản Hành chính</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Ứng dụng sức mạnh công nghệ để chuẩn hóa tài liệu của bạn về đúng quy chuẩn định dạng một cách thông minh, bảo mật và tức thì.
          </p>
        </div>

        {authStatus !== 'REGISTERED' && (
            <div className="mb-10 p-6 bg-white/80 backdrop-blur-xl border border-rose-100 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl shadow-rose-100/50">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                    <LockKeyhole className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Hệ Thống Đang Bị Khóa</h3>
                <p className="text-slate-500 mt-2 mb-6 max-w-md">Vui lòng đăng ký bản quyền sử dụng để mở khóa toàn bộ sức mạnh của AI Document Engine.</p>
                <button 
                    onClick={() => setShowOrgSettings(true)}
                    className="px-8 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-full text-sm font-bold shadow-lg shadow-slate-900/20 transition-all hover:scale-105"
                >
                    Tiến hành Đăng ký
                </button>
            </div>
        )}

        {authStatus === 'REGISTERED' && (
        <div className="mb-10">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 text-sm font-bold mx-auto px-8 py-3.5 rounded-full transition-all duration-300 shadow-md backdrop-blur-md border ${showSettings ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/30' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:shadow-indigo-200/50'}`}
            >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Tùy chỉnh Thông số AI</span>
                {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showSettings && (
                <div className="mt-6 bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl shadow-indigo-100/40 border border-white relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500"></div>
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-600" /> Bảng điều khiển Định dạng
                    </h3>
                    
                    <div className="mb-6 pb-6 border-b border-slate-100">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <LayoutTemplate className="w-4 h-4 text-violet-600" />
                                <span className="text-sm font-bold text-slate-800">Chèn khung Quốc hiệu / Tiêu ngữ</span>
                            </div>
                            <select 
                                value={options.headerType}
                                onChange={(e) => setOptions({...options, headerType: e.target.value as HeaderType})}
                                className="w-full px-4 py-3.5 bg-slate-50/50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer text-slate-700 transition-all"
                            >
                                <option value={HeaderType.NONE}>❌ Bỏ qua (Không chèn thêm)</option>
                                <option value={HeaderType.SCHOOL}>🏫 Mẫu Văn bản Hành chính (Nhà trường / Cơ quan)</option>
                                <option value={HeaderType.PARTY}>⭐ Mẫu Văn bản Công tác Đảng (Chi bộ)</option>
                                <option value={HeaderType.DEPARTMENT}>📚 Mẫu Văn bản Nội bộ (Tổ chuyên môn)</option>
                            </select>
                            
                            {(options.headerType === HeaderType.SCHOOL || options.headerType === HeaderType.PARTY) && (
                                <div className="mt-4 animate-fadeIn bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ký hiệu văn bản</label>
                                        <select 
                                            value={options.docSymbol || ""}
                                            onChange={(e) => setOptions({...options, docSymbol: e.target.value})}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 transition-all"
                                        >
                                            <option value="">--- Chọn ký hiệu ---</option>
                                            {(options.headerType === HeaderType.SCHOOL ? hanhChinhSymbols : dangSymbols).map(sym => (
                                                <option key={sym.value} value={sym.value}>{sym.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hậu tố cơ quan</label>
                                        <input 
                                            type="text" 
                                            placeholder={options.headerType === HeaderType.SCHOOL ? "VD: THCSCVA" : "VD: CB"}
                                            value={options.docSuffix || ""}
                                            onChange={(e) => setOptions({...options, docSuffix: e.target.value.toUpperCase()})}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 transition-all uppercase placeholder:normal-case"
                                        />
                                    </div>
                                </div>
                            )}

                            {options.headerType === HeaderType.DEPARTMENT && (
                                <div className="mt-4 animate-fadeIn bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chọn Tổ / Phòng ban</label>
                                    <select 
                                        value={options.departmentName || ""}
                                        onChange={(e) => setOptions({...options, departmentName: e.target.value})}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-indigo-800 transition-all"
                                    >
                                        {orgInfo?.departments && orgInfo.departments.length > 0 ? (
                                            orgInfo.departments.map((dept, index) => (
                                                <option key={index} value={dept.toUpperCase()}>{dept.toUpperCase()}</option>
                                            ))
                                        ) : (
                                            <option value="TỔ CHUYÊN MÔN">TỔ CHUYÊN MÔN</option>
                                        )}
                                    </select>
                                </div>
                            )}

                            {options.headerType !== HeaderType.NONE && (
                                <div className="mt-2 animate-fadeIn">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày ban hành văn bản</label>
                                    <input 
                                        type="date" 
                                        value={options.documentDate || ""}
                                        onChange={(e) => setOptions({...options, documentDate: e.target.value})}
                                        className="w-full sm:w-1/2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 transition-all shadow-sm"
                                    />
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${options.isMinutes ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white border-slate-300 group-hover:border-violet-400'}`}>
                                        {options.isMinutes && <CheckSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={options.isMinutes}
                                        onChange={(e) => setOptions({...options, isMinutes: e.target.checked, isCongVan: false})}
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">Đây là BIÊN BẢN cuộc họp</span>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Kích hoạt bộ quy tắc định dạng chuyên biệt cho biên bản</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${options.isCongVan ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white border-slate-300 group-hover:border-violet-400'}`}>
                                        {options.isCongVan && <CheckSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={options.isCongVan}
                                        onChange={(e) => setOptions({...options, isCongVan: e.target.checked, isMinutes: false})}
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">Đây là CÔNG VĂN</span>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Tự động cấu hình chuẩn Kính gửi, Trích yếu theo Nghị định 30</p>
                                    </div>
                                </label>
                            </div>

                            {options.isCongVan && (
                                <div className="mt-2 animate-fadeIn bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <label className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-2">Nội dung trích yếu (V/v...)</label>
                                    <textarea 
                                        rows={2}
                                        placeholder="VD: V/v tiếp tục triển khai thực hiện Chỉ thị số..."
                                        value={options.congVanSummary || ""}
                                        onChange={(e) => setOptions({...options, congVanSummary: e.target.value})}
                                        className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 resize-none shadow-sm"
                                    />
                                </div>
                            )}

                            {/* BLOCK NHẬP LIỆU: BGH DUYỆT TỔ CHUYÊN MÔN */}
                            {options.headerType === HeaderType.DEPARTMENT && !options.isMinutes && (
                                <div className="mt-4 animate-fadeIn border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 rounded-2xl shadow-sm">
                                    <p className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                                        <ShieldCheck className="w-4 h-4"/> Ban Giám Hiệu Duyệt
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Chức vụ duyệt</label>
                                            <select 
                                                value={options.approverTitle || ""}
                                                onChange={(e) => setOptions({...options, approverTitle: e.target.value})}
                                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm"
                                            >
                                                <option value="">-- Chọn chức vụ --</option>
                                                <option value="HIỆU TRƯỞNG">HIỆU TRƯỞNG</option>
                                                <option value="PHÓ HIỆU TRƯỞNG">PHÓ HIỆU TRƯỞNG</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Họ và tên</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: Nguyễn Văn A"
                                                value={options.approverName || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const formatted = val.split(' ').map(word => 
                                                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                    ).join(' ');
                                                    setOptions({...options, approverName: formatted});
                                                }}
                                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm placeholder:font-normal"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Signer Information */}
                            {!options.isMinutes && options.headerType !== HeaderType.NONE && (
                                <div className="mt-4 animate-fadeIn border border-slate-200 bg-slate-50/50 p-5 rounded-2xl">
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
                                        {options.headerType === HeaderType.DEPARTMENT ? "Thông tin Tổ trưởng Ký" : "Thông tin Người ký"}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                {options.headerType === HeaderType.DEPARTMENT ? "Chức danh (Mặc định: TỔ TRƯỞNG)" : "Chức vụ người ký"}
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder={options.headerType === HeaderType.DEPARTMENT ? "TỔ TRƯỞNG" : "VD: PHÓ HIỆU TRƯỞNG"}
                                                value={options.signerTitle || ""}
                                                onChange={(e) => setOptions({...options, signerTitle: e.target.value.toUpperCase()})}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 shadow-sm placeholder:font-normal uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và tên</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: Trần Thị B..."
                                                value={options.signerName || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const formatted = val.split(' ').map(word => 
                                                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                    ).join(' ');
                                                    setOptions({...options, signerName: formatted});
                                                }}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 shadow-sm placeholder:font-normal"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {options.isMinutes && (
                                <div className="mt-4 animate-fadeIn border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 rounded-2xl shadow-sm">
                                    <p className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                                        <Users className="w-4 h-4"/> Thành phần Biên bản
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Họ và tên CHỦ TỌA</label>
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
                                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm placeholder:font-normal"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Họ và tên THƯ KÝ</label>
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
                                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm placeholder:font-normal"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isUploadDisabled && (
                                <div className="mt-4 p-4 bg-rose-50/80 border border-rose-200 rounded-2xl animate-fadeIn flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                                    <p className="text-sm font-bold text-rose-700">
                                        {options.isMinutes 
                                            ? "Vui lòng nhập đầy đủ họ tên Chủ tọa và Thư ký để tiếp tục."
                                            : (options.isCongVan && !options.congVanSummary?.trim() 
                                                ? "Vui lòng nhập Nội dung trích yếu của Công văn."
                                                : (options.headerType === HeaderType.DEPARTMENT 
                                                    ? "Vui lòng nhập đầy đủ thông tin Người ký và Lãnh đạo duyệt."
                                                    : "Vui lòng nhập đầy đủ Chức vụ và Họ tên người ký."))
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-6 pb-6 border-b border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer group bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${options.removeNumbering ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white border-slate-300 group-hover:border-rose-400'}`}>
                                {options.removeNumbering && <ListX className="w-3.5 h-3.5" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={options.removeNumbering}
                                onChange={(e) => setOptions({...options, removeNumbering: e.target.checked})}
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-800 group-hover:text-rose-600 transition-colors">Tẩy sạch định dạng danh sách tự động (Bullets/Numbering)</span>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Chuyển đổi danh sách thông minh thành văn bản thường để đồng bộ định dạng 100%</p>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> Quy chuẩn Lề trang (cm)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Trên (Top)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.top}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, top: parseFloat(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Dưới (Bottom)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.bottom}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, bottom: parseFloat(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Trái (Left)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.left}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, left: parseFloat(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Phải (Right)</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={options.margins.right}
                                        onChange={(e) => setOptions({...options, margins: {...options.margins, right: parseFloat(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> Quy chuẩn Đoạn văn
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Cỡ chữ (pt)</span>
                                    <input 
                                        type="number"
                                        value={options.font.sizeNormal}
                                        onChange={(e) => setOptions({...options, font: {...options.font, sizeNormal: parseInt(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Cỡ chữ Bảng (pt)</span>
                                    <input 
                                        type="number"
                                        value={options.font.sizeTable}
                                        onChange={(e) => setOptions({...options, font: {...options.font, sizeTable: parseInt(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Dãn dòng (Lines)</span>
                                    <input 
                                        type="number" step="0.05"
                                        value={options.paragraph.lineSpacing}
                                        onChange={(e) => setOptions({...options, paragraph: {...options.paragraph, lineSpacing: parseFloat(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">Thụt đầu dòng (cm)</span>
                                    <input 
                                        type="number" step="0.01"
                                        value={options.paragraph.indent}
                                        onChange={(e) => setOptions({...options, paragraph: {...options.paragraph, indent: parseFloat(e.target.value)}})}
                                        className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        )}

        {/* Main Work Area */}
        <div className={`bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden relative group ${authStatus !== 'REGISTERED' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 via-cyan-400 to-indigo-500 opacity-80"></div>

          <div className="p-6 sm:p-10 space-y-8">
            {!file && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                  <span className="w-12 h-px bg-slate-200"></span>
                  <span className="text-slate-500 flex items-center gap-2"><UploadCloud className="w-5 h-5"/> Tải lên tài liệu gốc</span>
                  <span className="w-12 h-px bg-slate-200"></span>
                </div>
                <div className="bg-slate-50/50 rounded-3xl p-2 border border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all duration-300">
                    <Dropzone onFileSelect={handleFileSelect} disabled={isUploadDisabled || authStatus !== 'REGISTERED'} />
                </div>
              </div>
            )}

            {file && status !== ProcessingStatus.SUCCESS && (
              <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto">
                <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden group/file">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-l-3xl"></div>
                  <div className="flex items-center gap-5 relative z-10 pl-2">
                    <div className="bg-gradient-to-br from-violet-100 to-indigo-50 p-4 rounded-2xl group-hover/file:scale-110 transition-transform duration-500">
                      <FileText className="w-8 h-8 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg sm:text-xl line-clamp-1">{file.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                         <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2.5 py-1 rounded-md uppercase tracking-wider">DOCX</span>
                         <span className="text-[12px] text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-md">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="p-3 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300"
                    title="Hủy bỏ file này"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {status === ProcessingStatus.IDLE && (
                  <button
                    onClick={handleProcess}
                    className="w-full py-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:via-indigo-700 hover:to-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                    <Sparkles className="w-6 h-6 text-cyan-300 group-hover:animate-spin" />
                    <span className="tracking-wide">THỰC HIỆN CHUẨN HÓA AI</span>
                    <ArrowRight className="w-6 h-6 opacity-70 group-hover:translate-x-2 transition-transform duration-300" />
                  </button>
                )}

                {status === ProcessingStatus.PROCESSING && (
                  <button
                    disabled
                    className="w-full py-5 bg-white border border-indigo-100 shadow-inner text-indigo-800 rounded-2xl font-bold text-lg flex items-center justify-center gap-4 cursor-wait relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-indigo-50/50"></div>
                    <div className="relative flex items-center gap-4 z-10">
                        <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="tracking-wide animate-pulse">Hệ thống đang tái cấu trúc tài liệu...</span>
                    </div>
                  </button>
                )}
              </div>
            )}

            {status === ProcessingStatus.SUCCESS && result && (
              <div className="text-center space-y-10 animate-fadeIn py-4">
                 <div className="relative w-28 h-28 mx-auto">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-100 to-white text-emerald-600 rounded-full flex items-center justify-center border-[6px] border-white shadow-xl">
                      <FileCheck className="w-12 h-12 drop-shadow-sm" />
                    </div>
                 </div>
                 
                 <div className="max-w-md mx-auto">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3 tracking-tight">Xử lý hoàn tất!</h3>
                    <p className="text-slate-500 font-medium">Tài liệu của bạn đã được thuật toán AI căn chỉnh đạt chuẩn 100% quy định thể thức hành chính.</p>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                      onClick={handleDownload}
                      className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transform hover:-translate-y-1 transition-all duration-300"
                    >
                      <Download className="w-6 h-6" />
                      Tải văn bản về máy
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300 rounded-2xl font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2 hover:text-slate-800"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Xử lý file khác
                    </button>
                 </div>

                 <DocumentPreview originalFile={file} processedBlob={result.blob} />
              </div>
            )}

            {result?.logs && result.logs.length > 0 && (
              <div className="pt-8 border-t border-slate-100">
                <ProcessingLog logs={result.logs} />
              </div>
            )}

            {status === ProcessingStatus.ERROR && (
              <div className="p-6 bg-rose-50/80 text-rose-800 rounded-3xl border border-rose-100 text-center flex flex-col items-center max-w-lg mx-auto shadow-lg shadow-rose-100/50">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <p className="font-black text-lg">Đã xảy ra sự cố thuật toán</p>
                <p className="text-sm font-medium opacity-90 mt-2 mb-5">{result?.error}</p>
                <button onClick={handleReset} className="px-6 py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors">Thử lại với file khác</button>
              </div>
            )}

          </div>
        </div>

      </main>
      
      <footer className="py-8 text-center relative z-10 bg-white/40 border-t border-slate-200/50 backdrop-blur-md">
         <p className="text-slate-500 text-[13px] font-medium tracking-wide">
           <span className="opacity-70">DocFormat Pro V7.5 Ultimate &bull; Design by</span> <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-600 font-bold">Lại Cao Đằng - Đắk Lắk</span>
         </p>
      </footer>

      {showOrgSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
            <div className={`p-5 text-white flex items-center justify-between shrink-0 relative overflow-hidden
              ${authStatus === 'REGISTERED' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : authStatus === 'PENDING' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`}>
              <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none"></div>
              <h3 className="font-bold flex items-center gap-2.5 text-lg relative z-10">
                {authStatus === 'REGISTERED' && <LockKeyhole className="w-5 h-5" />}
                {authStatus === 'PENDING' && <Clock className="w-5 h-5" />}
                {authStatus === 'UNREGISTERED' && <Database className="w-5 h-5" />}
                
                {authStatus === 'REGISTERED' ? 'Thông Tin Bản Quyền' : 
                 authStatus === 'PENDING' ? 'Chờ Cấp Phép Bản Quyền' : 'Đăng ký Đơn vị Sử dụng'}
              </h3>
              <button 
                onClick={closeModal}
                className="relative z-10 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar">
              {authStatus === 'REGISTERED' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-emerald-900 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/50 rounded-bl-full pointer-events-none"></div>
                    <p className="font-medium mb-4 leading-relaxed text-[15px] relative z-10">
                      AI Engine <strong>DocFormat Pro</strong> đã được cấp phép sử dụng bản quyền hợp lệ cho đơn vị: <strong className="text-emerald-700 uppercase block mt-1 text-lg">{orgInfo?.orgName}</strong>
                    </p>
                    <div className="bg-white/80 p-4 rounded-xl text-sm border border-emerald-100/50 space-y-2 relative z-10 shadow-sm">
                      <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Hỗ trợ kỹ thuật 24/7</p>
                      <p className="flex justify-between border-b border-emerald-50/50 pb-2"><span>Tác giả:</span> <strong>Lại Cao Đằng</strong></p>
                      <p className="flex justify-between border-b border-emerald-50/50 pb-2 pt-1"><span>Điện thoại/Zalo:</span> <strong>0973 225 722</strong></p>
                      <p className="flex justify-between pt-1"><span>Email:</span> <strong>laicaodang@thcscva.edu.vn</strong></p>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-center">
                    {!confirmRemove ? (
                        <button 
                            onClick={() => setConfirmRemove(true)}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Gỡ bản quyền (Cài đặt lại thiết bị)
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 w-full bg-rose-50 p-5 rounded-2xl border border-rose-200 animate-fadeIn">
                            <span className="text-sm font-bold text-rose-700 flex items-center gap-2 text-center">
                                <AlertTriangle className="w-5 h-5 shrink-0" /> Chắc chắn gỡ giấy phép bản quyền của thiết bị này?
                            </span>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setConfirmRemove(false)}
                                    className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={handleRemoveLicense}
                                    className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-md transition-colors"
                                >
                                    Xác nhận Gỡ
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                </div>
              )}

              {authStatus === 'PENDING' && (
                  <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-amber-900 shadow-inner text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-amber-500 animate-bounce" />
                    </div>
                    <p className="font-medium mb-4 leading-relaxed">
                      Yêu cầu đăng ký bản quyền cho <strong className="text-amber-700 uppercase block mt-1 text-lg">{pendingAuth?.orgName}</strong> đã được gửi thành công!
                    </p>
                    <p className="text-sm text-amber-800 font-semibold mb-4 bg-amber-100/50 py-2 px-3 rounded-lg inline-block">
                      Vui lòng liên hệ Tác giả để nhận Mã Kích Hoạt:
                    </p>
                    <div className="bg-white/80 p-4 rounded-xl text-sm border border-amber-100/50 space-y-2 text-left shadow-sm">
                      <p className="flex justify-between border-b border-amber-50 pb-2"><span>Tác giả:</span> <strong>Lại Cao Đằng</strong></p>
                      <p className="flex justify-between border-b border-amber-50 pb-2 pt-1"><span>Zalo/Phone:</span> <strong>0973 225 722</strong></p>
                      <p className="flex justify-between pt-1"><span>Email:</span> <strong>laicaodang@thcscva.edu.vn</strong></p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Nhập Mã Kích Hoạt Phần Mềm</label>
                    <input 
                      type="password" 
                      value={unlockCode}
                      onChange={(e) => setUnlockCode(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 tracking-[0.3em] text-center font-mono font-bold text-slate-700"
                    />
                  </div>
                </div>
              )}

              {authStatus === 'UNREGISTERED' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/80 text-indigo-800 p-4 rounded-xl text-[13px] font-medium mb-6 border border-indigo-100 flex gap-3 items-start">
                      <div className="bg-indigo-100 p-1.5 rounded-lg shrink-0 mt-0.5"><ShieldCheck className="w-4 h-4 text-indigo-600"/></div>
                      <p>Hệ thống tự động hóa được bảo vệ bằng mã định danh cấp cơ sở. Vui lòng khai báo thông tin chính xác để xét duyệt cấp phép.</p>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Đơn vị chủ quản</label>
                        <input 
                          type="text" 
                          value={orgFormValues.governingBody}
                          onChange={(e) => setOrgFormValues({...orgFormValues, governingBody: e.target.value})}
                          placeholder="VD: UBND HUYỆN EA KAR"
                          className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên cơ quan / Trường học</label>
                        <input 
                          type="text" 
                          value={orgFormValues.orgName}
                          onChange={(e) => setOrgFormValues({...orgFormValues, orgName: e.target.value})}
                          placeholder="VD: TRƯỜNG THCS CHU VĂN AN"
                          className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                        />
                      </div>
                      
                      <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Đảng bộ cấp trên</label>
                        <input 
                          type="text" 
                          value={orgFormValues.partyUpper}
                          onChange={(e) => setOrgFormValues({...orgFormValues, partyUpper: e.target.value})}
                          placeholder="VD: ĐẢNG BỘ XÃ EA KAR"
                          className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên Chi bộ</label>
                        <input 
                          type="text" 
                          value={orgFormValues.partyCell}
                          onChange={(e) => setOrgFormValues({...orgFormValues, partyCell: e.target.value})}
                          placeholder="VD: CHI BỘ TRƯỜNG THCS CHU VĂN AN"
                          className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                        />
                      </div>
                      
                      <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Địa danh (ghi ngày tháng)</label>
                        <input 
                          type="text" 
                          value={orgFormValues.location}
                          onChange={(e) => setOrgFormValues({...orgFormValues, location: e.target.value})}
                          placeholder="VD: Ea Kar"
                          className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                        />
                      </div>
                      
                      <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Danh sách Tổ chuyên môn / Phòng ban</label>
                        <textarea 
                          rows={3}
                          value={orgFormValues.departments}
                          onChange={(e) => setOrgFormValues({...orgFormValues, departments: e.target.value})}
                          placeholder="Nhập các tổ, cách nhau bằng dấu phẩy. VD: Tổ Toán - Tin, Tổ Ngữ Văn, Tổ Hành Chính..."
                          className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-colors"
                        />
                      </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              
              {authStatus === 'REGISTERED' && (
                  <button 
                      onClick={closeModal}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-all shadow-md"
                  >
                      Hoàn tất
                  </button>
              )}

              {authStatus === 'PENDING' && (
                  <>
                      <button 
                          onClick={handleCancelRegistration}
                          className="px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                          Hủy yêu cầu
                      </button>
                      <button 
                          onClick={handleActivate}
                          className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                      >
                          <Zap className="w-4 h-4" /> Kích hoạt Ngay
                      </button>
                  </>
              )}

              {authStatus === 'UNREGISTERED' && (
                  <>
                      <button 
                          onClick={closeModal}
                          className="px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                          Bỏ qua
                      </button>
                      <button 
                          onClick={handleRegisterRequest}
                          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                      >
                          <Send className="w-4 h-4" /> Gửi Xét Duyệt
                      </button>
                  </>
              )}

            </div>
          </div>
        </div>
      )}
      <UserGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}