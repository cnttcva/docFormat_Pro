// File: src/MainApp.tsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './services/firebaseConfig';

import { Dropzone } from './components/Dropzone';
import { ProcessingLog } from './components/ProcessingLog';
import { processDocx } from './services/docxService';
import { DocumentPreview } from './components/DocumentPreview';
import { UserGuide } from './components/UserGuide';
import { LicenseModal } from './components/LicenseModal';
import { SettingsPanel } from './components/SettingsPanel';
import { Header } from './components/Header';
import { useLicenseAuth } from './components/hooks/useLicenseAuth';
import { useStaffSearch } from './components/hooks/useStaffSearch';
import { ProcessingStatus, ProcessResult, HeaderType } from './types';

import {
  FileText,
  Download,
  RefreshCw,
  Sparkles,
  FileCheck,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UploadCloud,
  X,
  LockKeyhole,
  Clock,
  FileDown,
} from 'lucide-react';

/**
 * PDF Helper local
 *
 * Giai đoạn 1: không thuê server PDF riêng.
 * Mỗi máy người dùng chạy PDF Helper tại:
 * http://localhost:8787
 *
 * Cố định đường dẫn để tránh bị .env.local hoặc biến môi trường Vercel
 * trỏ nhầm về localhost:3000.
 *
 * Endpoint server.js đang hỗ trợ:
 * GET  /health
 * POST /convert-to-pdf
 */
const PDF_HELPER_BASE_URL = 'http://localhost:8787';

const PDF_CONVERTER_URL = 'http://localhost:8787/convert-to-pdf';
const PDF_HEALTH_URL = 'http://localhost:8787/health';

const HeroSection = () => (
  <div className="text-center mb-10 space-y-4">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-cyan-50 border border-violet-100 shadow-sm text-violet-700 text-[11px] font-black uppercase tracking-widest mb-2">
      <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
      Phiên bản chuyển đổi số - DocxService_v10.0_Ultimate
    </div>

    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
      Tự động hóa{' '}
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600">
        Văn bản Hành chính
      </span>
    </h2>

    <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
      Ứng dụng sức mạnh công nghệ để chuẩn hóa tài liệu của bạn về đúng quy chuẩn định dạng một cách thông minh, bảo mật và tức thì.
    </p>
  </div>
);

const FooterSection = () => (
  <footer className="py-8 text-center relative z-10 bg-white/40 border-t border-slate-200/50 backdrop-blur-md">
    <p className="text-slate-500 text-[13px] font-medium tracking-wide">
      <span className="opacity-70">DocFormat Pro V10.0 Ultimate &bull; Design by</span>{' '}
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-600 font-bold">
        Lại Cao Đằng - Đắk Lắk
      </span>
    </p>
  </footer>
);

export default function MainApp() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [keepOriginalReceivers, setKeepOriginalReceivers] = useState(true);
  const [dictionaryData, setDictionaryData] = useState<any[]>([]);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const {
    orgInfo,
    pendingAuth,
    authStatus,
    unlockCode,
    setUnlockCode,
    confirmRemove,
    setConfirmRemove,
    orgFormValues,
    setOrgFormValues,
    isCheckingLicense,
    licenseNotice,
    handleRegisterRequest,
    handleActivate: handleActivateLicense,
    handleCancelRegistration,
    handleRemoveLicense,
  } = useLicenseAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const savedSigs = JSON.parse(localStorage.getItem('docFormat_Signatures') || '{}');

  const [options, setOptions] = useState<any>({
    headerType: HeaderType.NONE,
    departmentName: orgInfo?.departments?.[0] || 'TỔ CHUYÊN MÔN',
    documentDate: todayStr,
    removeNumbering: false,
    margins: { top: 2, bottom: 2, left: 3, right: 1.5 },
    font: { family: 'Times New Roman', sizeNormal: 14, sizeTable: 13 },
    paragraph: { lineSpacing: 1.15, after: 6, indent: 1.27 },
    docSymbol: 'CV',
    docSuffix: savedSigs.docSuffix || 'THCSCVA',
    isCongVan: false,
    congVanSummary: '',
    isMinutes: false,
    isDecision: false,
    signerTitle: savedSigs.signerTitle || '',
    signerName: savedSigs.signerName || '',
    presiderName: savedSigs.presiderName || '',
    secretaryName: savedSigs.secretaryName || '',
    approverTitle: savedSigs.approverTitle || 'HIỆU TRƯỞNG',
    approverName: savedSigs.approverName || '',
  });

  const currentSchoolId = orgInfo?.schoolId || 'THCS_CVA';

  const {
    suggestions,
    showDropdown,
    activeField,
    isSearching,
    firebaseError,
    dropdownRef,
    handleNameInput,
    handleSelectStaff,
  } = useStaffSearch(setOptions, currentSchoolId);

  const [tenantIdentities, setTenantIdentities] = useState<any[]>([]);

  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const docRef = doc(db, 'system_settings', 'general');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.tenantIdentities) setTenantIdentities(data.tenantIdentities);
        }

        const dictSnap = await getDocs(collection(db, 'dictionaries'));
        const dictList = dictSnap.docs.map(d => d.data());
        setDictionaryData(dictList);
      } catch (e) {
        console.error('Lỗi truy xuất dữ liệu đám mây:', e);
      }
    };

    fetchCloudData();
  }, []);

  const currentHeaderType = options.headerType;

  useEffect(() => {
    if (tenantIdentities.length > 0 && currentSchoolId) {
      const tenant = tenantIdentities.find((t: any) => t.tenantCode === currentSchoolId);

      if (tenant) {
        if (currentHeaderType === HeaderType.SCHOOL) {
          setOptions((prev: any) => ({ ...prev, docSuffix: tenant.schoolSuffix || '' }));
        } else if (currentHeaderType === HeaderType.PARTY) {
          setOptions((prev: any) => ({ ...prev, docSuffix: tenant.partySuffix || '' }));
        }
      }
    }
  }, [currentHeaderType, tenantIdentities, currentSchoolId]);

  const isUploadDisabled = options.isMinutes
    ? !options.presiderName?.trim() || !options.secretaryName?.trim()
    : options.isCongVan
      ? !options.congVanSummary?.trim() || !options.signerTitle?.trim() || !options.signerName?.trim()
      : options.headerType === HeaderType.DEPARTMENT
        ? !options.signerTitle?.trim() ||
          !options.signerName?.trim() ||
          !options.approverTitle?.trim() ||
          !options.approverName?.trim()
        : options.headerType !== HeaderType.NONE &&
          (!options.signerTitle?.trim() || !options.signerName?.trim());

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
      docSuffix: options.docSuffix,
    };

    localStorage.setItem('docFormat_Signatures', JSON.stringify(signatureData));
    setStatus(ProcessingStatus.PROCESSING);

    const finalOptions = {
      ...options,
      orgInfo: orgInfo ? { ...orgInfo, departmentName: options.departmentName } : undefined,
      keepOriginalReceivers,
    };

    const res = await processDocx(file, finalOptions, dictionaryData);

    setResult(res);
    setStatus(res.success ? ProcessingStatus.SUCCESS : ProcessingStatus.ERROR);
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

  const handleDownloadPDF = async () => {
    if (!result?.blob) {
      alert('Chưa có tài liệu đã chuẩn hóa để xuất PDF.');
      return;
    }

    if (isExportingPDF) return;

    setIsExportingPDF(true);

    const showEnvironmentGuide = (detail: string) => {
      alert(
        `Không thể xuất PDF bằng bộ chuyển đổi local.\n\n` +
        `Nguyên nhân:\n${detail}\n\n` +
        `Máy tính cần chuẩn bị đủ môi trường sau:\n\n` +
        `1. Cài LibreOffice.\n` +
        `2. Mở thư mục pdf-converter.\n` +
        `3. Chạy file START_PDF_HELPER.bat.\n` +
        `4. Giữ cửa sổ PDF Helper đang mở trong lúc dùng nút Tải PDF.\n` +
        `5. Mở http://localhost:8787 để kiểm tra có "ok": true và "libreOfficeDetected": true.\n` +
        `6. Quay lại docFormat Pro và bấm Tải PDF lại.\n\n` +
        `Nếu trình duyệt hỏi quyền truy cập dịch vụ trên thiết bị này, hãy bấm "Cho phép".`
      );
    };

    try {
      let healthData: any = null;

      try {
        const healthResponse = await fetch(PDF_HEALTH_URL, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!healthResponse.ok) {
          showEnvironmentGuide(
            `docFormat PDF Helper có phản hồi nhưng chưa sẵn sàng. Mã lỗi: ${healthResponse.status}.`
          );
          return;
        }

        healthData = await healthResponse.json();
      } catch (healthError) {
        showEnvironmentGuide(
          `Không kết nối được docFormat PDF Helper tại http://localhost:8787.\n` +
          `Có thể máy chưa chạy START_PDF_HELPER.bat, hoặc trình duyệt chưa được cấp quyền truy cập localhost.`
        );
        return;
      }

      if (!healthData?.ok) {
        showEnvironmentGuide(
          `docFormat PDF Helper đang phản hồi không đúng định dạng.\n` +
          `Vui lòng tắt cửa sổ PDF Helper rồi chạy lại START_PDF_HELPER.bat.`
        );
        return;
      }

      if (healthData.libreOfficeDetected === false) {
        showEnvironmentGuide(
          `docFormat PDF Helper đã chạy nhưng chưa tìm thấy LibreOffice.\n` +
          `Vui lòng cài LibreOffice, sau đó chạy lại START_PDF_HELPER.bat.`
        );
        return;
      }

      const formData = new FormData();

      const docxName = result.fileName?.toLowerCase().endsWith('.docx')
        ? result.fileName
        : 'formatted_document.docx';

      formData.append('file', result.blob, docxName);

      const response = await fetch(PDF_CONVERTER_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const rawMessage = await response.text();

        let friendlyMessage = rawMessage || 'PDF Helper trả về lỗi khi chuyển đổi PDF.';

        if (rawMessage.includes('Cannot POST')) {
          friendlyMessage =
            `PDF Helper đang chạy phiên bản cũ hoặc sai endpoint.\n` +
            `Vui lòng tắt cửa sổ PDF Helper, kiểm tra file pdf-converter/server.js, rồi chạy lại START_PDF_HELPER.bat.`;
        } else if (rawMessage.toLowerCase().includes('libreoffice')) {
          friendlyMessage =
            `LibreOffice chưa hoạt động đúng hoặc chưa được tìm thấy.\n` +
            `Vui lòng cài LibreOffice và chạy lại START_PDF_HELPER.bat.`;
        } else if (rawMessage.trim().startsWith('<!DOCTYPE html') || rawMessage.includes('<html')) {
          friendlyMessage =
            `Ứng dụng nhận được phản hồi HTML thay vì file PDF.\n` +
            `Có thể request đang bị gửi sai nơi hoặc PDF Helper chưa chạy đúng.\n` +
            `Vui lòng mở http://localhost:8787 để kiểm tra trạng thái.`;
        }

        showEnvironmentGuide(friendlyMessage);
        return;
      }

      const pdfBlob = await response.blob();

      if (!pdfBlob || pdfBlob.size === 0) {
        showEnvironmentGuide(
          `PDF Helper đã phản hồi nhưng file PDF trả về bị rỗng.\n` +
          `Vui lòng thử lại hoặc kiểm tra LibreOffice.`
        );
        return;
      }

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');

      const pdfName = docxName.replace(/\.docx$/i, '.pdf');

      a.href = pdfUrl;
      a.download = pdfName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error('Lỗi xuất PDF:', error);

      const message = error instanceof Error ? error.message : String(error);

      showEnvironmentGuide(
        message.includes('Failed to fetch')
          ? `Không thể kết nối tới docFormat PDF Helper.\nVui lòng kiểm tra START_PDF_HELPER.bat đã chạy chưa.`
          : message
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus(ProcessingStatus.IDLE);
    setResult(null);
  };

  const handleActivate = async () => {
    const isSuccess = await handleActivateLicense(setOptions, options);
    if (isSuccess) setShowOrgSettings(false);
  };

  const closeModal = () => {
    setShowOrgSettings(false);
    setUnlockCode('');
    setConfirmRemove(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans flex flex-col relative overflow-hidden selection:bg-violet-200 selection:text-violet-900">
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-200/40 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-cyan-100/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-200/30 rounded-full blur-[80px] pointer-events-none z-0"></div>

      <Header
        orgInfo={orgInfo}
        authStatus={authStatus}
        setShowOrgSettings={setShowOrgSettings}
        setShowGuide={setShowGuide}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-grow w-full">
        <HeroSection />

        {authStatus !== 'REGISTERED' && (
          <div className="mb-10 p-6 bg-white/80 backdrop-blur-xl border border-rose-100 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl shadow-rose-100/50">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                authStatus === 'PENDING' ? 'bg-amber-50' : 'bg-rose-50'
              }`}
            >
              {authStatus === 'PENDING' ? (
                <Clock className="w-8 h-8 text-amber-500" />
              ) : (
                <LockKeyhole className="w-8 h-8 text-rose-500" />
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              {authStatus === 'PENDING' ? 'Hệ Thống Đang Chờ Kích Hoạt' : 'Hệ Thống Đang Bị Khóa'}
            </h3>

            <p className="text-slate-500 mt-2 mb-6 max-w-md">
              {authStatus === 'PENDING'
                ? 'Yêu cầu bản quyền của thiết bị này đang chờ Admin duyệt. Sau khi được duyệt, bấm kiểm tra trạng thái trong hộp thoại bản quyền.'
                : 'Vui lòng đăng ký bản quyền sử dụng để mở khóa toàn bộ sức mạnh của AI Document Engine.'}
            </p>

            <button
              onClick={() => setShowOrgSettings(true)}
              className={`px-8 py-3 text-white rounded-full text-sm font-bold shadow-lg transition-all hover:scale-105 ${
                authStatus === 'PENDING'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-slate-800 to-slate-900 shadow-slate-900/20'
              }`}
            >
              {authStatus === 'PENDING' ? 'Kiểm tra trạng thái cấp phép' : 'Tiến hành Đăng ký'}
            </button>
          </div>
        )}

        {authStatus === 'REGISTERED' && (
          <div className="mb-10">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 text-sm font-bold mx-auto px-8 py-3.5 rounded-full transition-all duration-300 shadow-md backdrop-blur-md border ${
                showSettings
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/30'
                  : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:shadow-indigo-200/50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Tùy chỉnh Thông số AI</span>
              {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSettings && (
              <SettingsPanel
                options={options}
                setOptions={setOptions}
                orgInfo={orgInfo}
                keepOriginalReceivers={keepOriginalReceivers}
                setKeepOriginalReceivers={setKeepOriginalReceivers}
                activeField={activeField}
                isSearching={isSearching}
                showDropdown={showDropdown}
                suggestions={suggestions}
                firebaseError={firebaseError}
                dropdownRef={dropdownRef}
                handleNameInput={handleNameInput}
                handleSelectStaff={handleSelectStaff}
              />
            )}
          </div>
        )}

        <div
          className={`bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden relative group ${
            authStatus !== 'REGISTERED' ? 'opacity-50 pointer-events-none grayscale' : ''
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 via-cyan-400 to-indigo-500 opacity-80"></div>

          <div className="p-6 sm:p-10 space-y-8">
            {!file && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                  <span className="w-12 h-px bg-slate-200"></span>
                  <span className="text-slate-500 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" /> Tải lên tài liệu gốc
                  </span>
                  <span className="w-12 h-px bg-slate-200"></span>
                </div>

                <div className="bg-slate-50/50 rounded-3xl p-2 border border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all duration-300">
                  <Dropzone
                    onFileSelect={handleFileSelect}
                    disabled={isUploadDisabled || authStatus !== 'REGISTERED'}
                  />
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
                        <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          DOCX
                        </span>
                        <span className="text-[12px] text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-md">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
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
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3 tracking-tight">
                    Xử lý hoàn tất!
                  </h3>
                  <p className="text-slate-500 font-medium">
                    Tài liệu của bạn đã được thuật toán AI căn chỉnh đạt chuẩn 100% quy định thể thức hành chính.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transform hover:-translate-y-1 transition-all duration-300"
                  >
                    <Download className="w-6 h-6" /> Tải DOCX
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isExportingPDF}
                    className={`w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-rose-500/30 flex items-center justify-center gap-3 transform hover:-translate-y-1 transition-all duration-300 ${
                      isExportingPDF ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isExportingPDF ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <FileDown className="w-6 h-6" />
                    )}
                    {isExportingPDF ? 'Đang chuyển PDF...' : 'Tải PDF'}
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300 rounded-2xl font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2 hover:text-slate-800"
                  >
                    <RefreshCw className="w-5 h-5" /> Xử lý file khác
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

                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors"
                >
                  Thử lại với file khác
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterSection />

      <LicenseModal
        isOpen={showOrgSettings}
        onClose={closeModal}
        authStatus={authStatus}
        orgInfo={orgInfo}
        pendingAuth={pendingAuth}
        orgFormValues={orgFormValues}
        setOrgFormValues={setOrgFormValues}
        unlockCode={unlockCode}
        setUnlockCode={setUnlockCode}
        confirmRemove={confirmRemove}
        setConfirmRemove={setConfirmRemove}
        handleRemoveLicense={handleRemoveLicense}
        handleCancelRegistration={handleCancelRegistration}
        handleActivate={handleActivate}
        handleRegisterRequest={handleRegisterRequest}
        isCheckingLicense={isCheckingLicense}
        licenseNotice={licenseNotice}
      />

      <UserGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}