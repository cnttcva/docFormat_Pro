import React, { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { ProcessingLog } from './components/ProcessingLog';
import { processDocx } from './services/docxService';
import { DocumentPreview } from './components/DocumentPreview';
import { ProcessingStatus, ProcessResult, DocxOptions, HeaderType, OrgInfo } from './types';
import { 
  FileText, Download, RefreshCw, Sparkles, 
  FileCheck, ShieldCheck, Cpu, LayoutTemplate, 
  Settings2, Zap, ArrowRight, SlidersHorizontal, ChevronDown, ChevronUp, CheckSquare, ListX, Settings, Database, LockKeyhole
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

  const [isLocked, setIsLocked] = useState(!!orgInfo?.orgName);
  const [unlockCode, setUnlockCode] = useState("");

  const [orgFormValues, setOrgFormValues] = useState<{
      governingBody: string;
      orgName: string;
      partyUpper: string;
      partyCell: string;
      location: string;
      departments: string;
  }>({
    governingBody: orgInfo?.governingBody || "",
    orgName: orgInfo?.orgName || "",
    partyUpper: orgInfo?.partyUpper || "",
    partyCell: orgInfo?.partyCell || "",
    location: orgInfo?.location || "",
    departments: orgInfo?.departments ? orgInfo.departments.join(', ') : "",
  });
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [options, setOptions] = useState<DocxOptions>({
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
    docSuffix: ""
  });

  const isUploadDisabled = options.isMinutes 
    ? (!options.presiderName?.trim() || !options.secretaryName?.trim())
    : (options.headerType !== HeaderType.NONE && (!options.signerTitle?.trim() || !options.signerName?.trim()));

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

  const handleSaveOrgSettings = () => {
    const departmentsArray = orgFormValues.departments
        .split(',')
        .map(d => d.trim())
        .filter(d => d !== "");

    const newOrgInfo: OrgInfo = {
        governingBody: orgFormValues.governingBody,
        orgName: orgFormValues.orgName,
        partyUpper: orgFormValues.partyUpper,
        partyCell: orgFormValues.partyCell,
        location: orgFormValues.location,
        departments: departmentsArray
    };

    localStorage.setItem('docFormat_OrgInfo', JSON.stringify(newOrgInfo));
    setOrgInfo(newOrgInfo);
    setIsLocked(true);
    setShowOrgSettings(false);
    
    // Khởi chạy hệ thống gửi báo cáo ngầm
    const scriptUrl = "https://script.google.com/macros/s/AKfycbyDqki9BX9a-qoJfJ-E6WkBc4dSIKA2a_vTjcLZAFShbg0bm9IbOEsM__BbGplO1-CT/exec";
    fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            governingBody: newOrgInfo.governingBody,
            orgName: newOrgInfo.orgName,
            partyUpper: newOrgInfo.partyUpper,
            partyCell: newOrgInfo.partyCell,
            location: newOrgInfo.location
        })
    }).catch(err => console.log("Tracker err:", err));
    
    // Update current selected department if needed
    if (departmentsArray.length > 0 && (!options.departmentName || !departmentsArray.includes(options.departmentName))) {
        setOptions({...options, departmentName: departmentsArray[0]});
    }
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
            <div className="w-24"></div> {/* Spacer for centering */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase flex-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
              {orgInfo?.orgName || "TRƯỜNG THCS CHU VĂN AN"}
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
            </div>
            <button 
                onClick={() => setShowOrgSettings(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors font-medium border whitespace-nowrap ${isLocked ? 'bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
            >
                {isLocked ? (
                  <>
                    <LockKeyhole className="w-3.5 h-3.5" /> 
                    <span>Bản quyền: {orgInfo?.orgName}</span>
                  </>
                ) : (
                  <>
                    <Settings className="w-3.5 h-3.5" /> 
                    <span>Cài đặt đơn vị</span>
                  </>
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

        {/* Configuration Section */}
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
                            
                            {/* NEW: Conditional Document Symbol & Suffix */}
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

                            {/* NEW: Conditional Department Select */}
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

                            {/* Minutes Option Checkbox */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${options.isMinutes ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                                        {options.isMinutes && <CheckSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={options.isMinutes}
                                        onChange={(e) => setOptions({...options, isMinutes: e.target.checked})}
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Đây là văn bản BIÊN BẢN</span>
                                        <p className="text-[10px] text-slate-400">Tự động cấu hình định dạng dành riêng cho biên bản cuộc họp</p>
                                    </div>
                                </label>
                            </div>

                            {/* Signer Information */}
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
                                            : "Bạn chưa nhập đầy đủ thông tin về chức vụ người ký hoặc họ và tên người ký"
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

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
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
                <Dropzone onFileSelect={handleFileSelect} disabled={isUploadDisabled} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-4 text-white flex items-center justify-between shrink-0 ${isLocked ? 'bg-amber-500' : 'bg-blue-600'}`}>
              <h3 className="font-bold flex items-center gap-2">
                {isLocked ? <LockKeyhole className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                {isLocked ? 'Thông Tin Bản Quyền' : 'Cấu hình Đơn vị Hệ thống'}
              </h3>
              <button 
                onClick={() => {
                  setShowOrgSettings(false);
                  setUnlockCode("");
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <ListX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {isLocked ? (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 shadow-inner">
                    <p className="font-medium mb-3 leading-relaxed">
                      Phần mềm <strong>DocFormat Pro</strong> đã được đăng ký bản quyền sử dụng cho đơn vị: <strong className="text-amber-700 uppercase">{orgInfo?.orgName}</strong>.
                    </p>
                    <p className="text-sm mb-4">
                      Để cấp phép sử dụng cho đơn vị khác, vui lòng nhập Mã kích hoạt (Activation Code) hoặc liên hệ tác giả:
                    </p>
                    <div className="bg-white/60 p-3 rounded-lg text-sm border border-amber-100/50 space-y-1">
                      <p><strong>Tác giả:</strong> Lại Cao Đằng</p>
                      <p><strong>Điện thoại:</strong> 0973 225 722</p>
                      <p><strong>Email:</strong> laicaodang@thcscva.edu.vn</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nhập Mã Kích Hoạt</label>
                    <input 
                      type="password" 
                      value={unlockCode}
                      onChange={(e) => setUnlockCode(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 tracking-widest text-center font-mono"
                    />
                  </div>
                </div>
              ) : (
                <>
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
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => {
                  setShowOrgSettings(false);
                  setUnlockCode("");
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {isLocked ? "Đóng" : "Hủy bỏ"}
              </button>
              
              {isLocked ? (
                <button 
                  onClick={() => {
                    if (unlockCode === "Daklak@01062025#") {
                      setIsLocked(false);
                      setUnlockCode("");
                    } else {
                      alert("Mã kích hoạt không hợp lệ!");
                    }
                  }}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
                >
                  <LockKeyhole className="w-4 h-4" /> Mở khóa
                </button>
              ) : (
                <button 
                  onClick={handleSaveOrgSettings}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"
                >
                  Lưu cài đặt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}