// File: src/components/admin/ImportStaffModal.tsx
// Modal import nhân sự hàng loạt từ Excel
// LOGIC: Báo lỗi và DỪNG import nếu phát hiện trùng dữ liệu

import React, { useState, useRef } from 'react';
import { 
  X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, 
  Loader2, FileWarning, ArrowRight, Users, XCircle 
} from 'lucide-react';
import { collection, addDoc, writeBatch, doc, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Staff } from '../../types';
import { parseExcelFile, downloadExcelTemplate } from '../../utils/excelHelper';

interface ImportStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingStaff: Staff[];
  isSchoolAdmin?: boolean;
  schoolId?: string;
}

type ImportStep = 'upload' | 'preview' | 'duplicate_error' | 'importing' | 'result';

interface DuplicateInfo {
  rowNumber: number;
  schoolId: string;
  fullName: string;
  reason: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export const ImportStaffModal: React.FC<ImportStaffModalProps> = ({ 
  isOpen, onClose, onSuccess, existingStaff, isSchoolAdmin = false, schoolId 
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<Omit<Staff, 'id'>[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [validSchoolIds, setValidSchoolIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setParsedData([]);
    setDuplicates([]);
    setImportResult(null);
    setError('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  /**
   * Tải danh sách School ID hợp lệ từ collection licenses
   */
  const loadValidSchoolIds = async (): Promise<string[]> => {
    try {
      const snapshot = await getDocs(query(collection(db, 'licenses')));
      const ids: string[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.schoolId) ids.push(data.schoolId.toUpperCase());
      });
      return ids;
    } catch (err) {
      console.error('Lỗi tải licenses:', err);
      return [];
    }
  };

  /**
   * Kiểm tra trùng lặp toàn diện:
   * 1. Trùng trong chính file Excel
   * 2. Trùng với database
   * 3. School ID không hợp lệ (chưa đăng ký bản quyền)
   */
  const findDuplicatesAndErrors = (
    data: Omit<Staff, 'id'>[], 
    validIds: string[]
  ): DuplicateInfo[] => {
    const issues: DuplicateInfo[] = [];
    const seenInFile = new Map<string, number>();

    // Tạo map nhân sự đã có trong DB
    const existingMap = new Map<string, Staff>();
    existingStaff.forEach(s => {
      const key = `${s.schoolId?.toUpperCase()}_${s.fullName?.toLowerCase().trim()}`;
      existingMap.set(key, s);
    });

    data.forEach((staff, idx) => {
      const rowNum = idx + 2; // +2 vì Excel có header
      const upperSchoolId = staff.schoolId?.toUpperCase().trim() || '';
      const lowerName = staff.fullName?.toLowerCase().trim() || '';
      
      // Validate cơ bản
      if (!upperSchoolId) {
        issues.push({
          rowNumber: rowNum,
          schoolId: '(trống)',
          fullName: staff.fullName || '(trống)',
          reason: 'Thiếu Mã trường'
        });
        return;
      }
      if (!lowerName) {
        issues.push({
          rowNumber: rowNum,
          schoolId: upperSchoolId,
          fullName: '(trống)',
          reason: 'Thiếu Họ và tên'
        });
        return;
      }

      // Kiểm tra School ID có hợp lệ không
      if (!validIds.includes(upperSchoolId)) {
        issues.push({
          rowNumber: rowNum,
          schoolId: upperSchoolId,
          fullName: staff.fullName || '',
          reason: 'Mã trường chưa đăng ký bản quyền'
        });
        return;
      }

      const key = `${upperSchoolId}_${lowerName}`;

      // Check trùng trong file
      if (seenInFile.has(key)) {
        issues.push({
          rowNumber: rowNum,
          schoolId: upperSchoolId,
          fullName: staff.fullName || '',
          reason: `Trùng với dòng ${seenInFile.get(key)} trong file Excel`
        });
        return;
      }
      seenInFile.set(key, rowNum);

      // Check trùng với database
      const existingStaffData = existingMap.get(key);
      if (existingStaffData) {
        issues.push({
          rowNumber: rowNum,
          schoolId: upperSchoolId,
          fullName: staff.fullName || '',
          reason: `Đã tồn tại trong hệ thống (Tổ: ${existingStaffData.unitName || 'N/A'})`
        });
      }
    });

    return issues;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      // Tải danh sách School ID hợp lệ
      const validIds = await loadValidSchoolIds();
      setValidSchoolIds(validIds);

      let data = await parseExcelFile(file);
      
      // Nếu là admin trường, force toàn bộ schoolId thành trường của họ
      if (isSchoolAdmin && schoolId) {
        data = data.map(s => ({ ...s, schoolId }));
      }
      
      if (data.length === 0) {
        setError('File Excel không có dữ liệu hợp lệ');
        return;
      }

      // Kiểm tra trùng lặp và lỗi
      const issues = findDuplicatesAndErrors(data, validIds);
      
      setParsedData(data);
      setDuplicates(issues);
      
      // Nếu có vấn đề → chuyển sang trang lỗi
      if (issues.length > 0) {
        setStep('duplicate_error');
      } else {
        setStep('preview');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImport = async () => {
    setStep('importing');
    
    const result: ImportResult = {
      total: parsedData.length,
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Sử dụng Firestore Batch để import nhanh và an toàn
      // Mỗi batch tối đa 500 ops, ta dùng 400 cho an toàn
      const BATCH_SIZE = 400;
      
      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = parsedData.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(staff => {
          try {
            const upperSchoolId = staff.schoolId?.toUpperCase().trim() || '';
            const newDocRef = doc(collection(db, 'staffs'));
            batch.set(newDocRef, {
              ...staff,
              schoolId: upperSchoolId,
              fullName: staff.fullName?.trim() || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            result.success++;
          } catch (err: any) {
            result.failed++;
            result.errors.push(`Lỗi: ${err.message}`);
          }
        });
        
        await batch.commit();
      }
      
      setImportResult(result);
      setStep('result');
      
      if (result.success > 0) {
        onSuccess();
      }
    } catch (err: any) {
      result.failed = parsedData.length - result.success;
      result.errors.push(`Lỗi commit: ${err.message}`);
      setImportResult(result);
      setStep('result');
    }
  };

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(schoolId || 'THCS_CVA');
  };

  const downloadDuplicateReport = () => {
    const reportLines = [
      'BÁO CÁO LỖI IMPORT - DocFormat Pro',
      `Thời gian: ${new Date().toLocaleString('vi-VN')}`,
      `Tổng số dòng có vấn đề: ${duplicates.length}`,
      '',
      'CHI TIẾT:',
      '─────────────────────────────────────────'
    ];
    
    duplicates.forEach((d, idx) => {
      reportLines.push(
        `${idx + 1}. Dòng ${d.rowNumber}: ${d.fullName} (${d.schoolId})`,
        `   → ${d.reason}`,
        ''
      );
    });
    
    reportLines.push(
      '─────────────────────────────────────────',
      'CÁCH KHẮC PHỤC:',
      '1. Mở file Excel của bạn',
      '2. Xóa hoặc sửa các dòng được liệt kê ở trên',
      '3. Lưu lại và Import lại file'
    );
    
    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCao_Loi_Import_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-slate-100 ${
          step === 'duplicate_error' 
            ? 'bg-gradient-to-r from-rose-500 to-red-600' 
            : 'bg-gradient-to-r from-emerald-500 to-teal-600'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {step === 'duplicate_error' 
                ? <XCircle className="w-6 h-6 text-white" />
                : <FileSpreadsheet className="w-6 h-6 text-white" />
              }
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                {step === 'duplicate_error' 
                  ? 'Phát hiện lỗi dữ liệu' 
                  : 'Import Nhân sự từ Excel'
                }
              </h3>
              <p className="text-sm text-white/90 mt-0.5">
                {step === 'upload' && 'Bước 1: Chọn file Excel'}
                {step === 'preview' && `Bước 2: Xem trước ${parsedData.length} nhân sự`}
                {step === 'duplicate_error' && `Tìm thấy ${duplicates.length} dòng lỗi - cần sửa file`}
                {step === 'importing' && 'Đang xử lý...'}
                {step === 'result' && 'Kết quả import'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-bold mb-1">Quy tắc Import:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                      <li>Cột bắt buộc: <strong>Mã trường</strong> và <strong>Họ và tên</strong></li>
                      <li>Mã trường phải đã đăng ký bản quyền</li>
                      <li>Hỗ trợ file .xlsx và .xls</li>
                      <li className="font-bold text-rose-700">
                        Quan trọng: Nếu có dòng trùng/lỗi, TOÀN BỘ import sẽ DỪNG. 
                        Bạn cần sửa file rồi import lại.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDownloadTemplate}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-3 transition-colors group"
              >
                <Download className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
                <span className="font-bold text-slate-700 group-hover:text-indigo-600">
                  Tải file Excel mẫu
                </span>
              </button>

              <div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl flex flex-col items-center justify-center gap-3 transition-all shadow-lg"
                >
                  <Upload className="w-12 h-12" />
                  <span className="font-black text-lg">Chọn file Excel để Import</span>
                  <span className="text-sm text-indigo-100">Định dạng .xlsx hoặc .xls</span>
                </button>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-900">
                      Tuyệt vời! Dữ liệu hợp lệ
                    </p>
                    <p className="text-sm text-emerald-700">
                      Sẵn sàng import {parsedData.length} nhân sự mới
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-600">
                    Xem trước dữ liệu
                  </p>
                  <p className="text-xs text-slate-500">
                    Hiển thị {Math.min(10, parsedData.length)}/{parsedData.length} dòng
                  </p>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">#</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Mã trường</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Họ tên</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Chức vụ</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Tổ/PB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((staff, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-indigo-600">{staff.schoolId}</td>
                          <td className="px-3 py-2 font-semibold">{staff.fullName}</td>
                          <td className="px-3 py-2 text-slate-600">{staff.position}</td>
                          <td className="px-3 py-2 text-slate-600">{staff.unitName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2.5: Duplicate Error */}
          {step === 'duplicate_error' && (
            <div className="space-y-5">
              <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <FileWarning className="w-8 h-8 text-rose-600 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-black text-rose-900 text-lg">
                      Import bị dừng do dữ liệu lỗi
                    </h4>
                    <p className="text-sm text-rose-700 mt-1">
                      Phát hiện <strong>{duplicates.length} dòng lỗi</strong> trong file Excel. 
                      Theo cấu hình hệ thống, import phải DỪNG để đảm bảo an toàn dữ liệu.
                    </p>
                    <p className="text-sm text-rose-600 mt-2 font-bold">
                      → Vui lòng sửa các dòng dưới đây trong file Excel rồi Import lại.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-rose-200 rounded-2xl overflow-hidden">
                <div className="bg-rose-50 px-4 py-3 border-b border-rose-200">
                  <p className="text-sm font-bold text-rose-900">
                    Chi tiết các dòng lỗi ({duplicates.length})
                  </p>
                </div>
                <div className="overflow-y-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Dòng</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Mã trường</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Họ tên</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicates.map((dup, idx) => (
                        <tr key={idx} className="border-t border-slate-100 hover:bg-rose-50">
                          <td className="px-3 py-2 font-mono font-bold text-rose-600">
                            #{dup.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-indigo-600">
                            {dup.schoolId}
                          </td>
                          <td className="px-3 py-2 font-semibold">{dup.fullName}</td>
                          <td className="px-3 py-2 text-rose-700">{dup.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
                <p className="font-bold text-amber-900 mb-1">💡 Cách khắc phục:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
                  <li>Bấm <strong>"Tải báo cáo lỗi"</strong> để có file chi tiết các dòng cần sửa</li>
                  <li>Mở file Excel của bạn, xóa hoặc sửa các dòng được liệt kê</li>
                  <li>Lưu lại file và bấm <strong>"Import lại file đã sửa"</strong></li>
                </ol>
              </div>
            </div>
          )}

          {/* STEP 3: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-700">Đang import dữ liệu...</p>
              <p className="text-sm text-slate-500 mt-2">
                Xử lý {parsedData.length} nhân sự, vui lòng đợi
              </p>
            </div>
          )}

          {/* STEP 4: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-4">
              <div className="text-center py-4">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                ) : (
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                )}
                <h4 className="text-xl font-black text-slate-800">
                  {importResult.failed === 0 ? 'Import thành công!' : 'Hoàn thành với cảnh báo'}
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-slate-700">{importResult.total}</p>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mt-1">Tổng cộng</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{importResult.success}</p>
                  <p className="text-[10px] uppercase text-emerald-700 font-bold mt-1">Thành công</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-rose-600">{importResult.failed}</p>
                  <p className="text-[10px] uppercase text-rose-700 font-bold mt-1">Thất bại</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 max-h-48 overflow-y-auto">
                  <p className="font-bold text-rose-900 text-sm mb-2">
                    Chi tiết lỗi:
                  </p>
                  <ul className="text-xs text-rose-700 space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span>•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between gap-3">
          {step === 'upload' && (
            <>
              <p className="text-xs text-slate-500">
                {fileName && <>Đã chọn: <strong>{fileName}</strong></>}
              </p>
              <button 
                onClick={handleClose}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-sm"
              >
                Đóng
              </button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <button 
                onClick={resetState}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-sm"
              >
                ← Chọn file khác
              </button>
              <button 
                onClick={handleImport}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Import {parsedData.length} nhân sự
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
          
          {step === 'duplicate_error' && (
            <>
              <button 
                onClick={downloadDuplicateReport}
                className="px-5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Tải báo cáo lỗi
              </button>
              <button 
                onClick={resetState}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import lại file đã sửa
              </button>
            </>
          )}
          
          {step === 'result' && (
            <>
              <button 
                onClick={resetState}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-sm"
              >
                Import file khác
              </button>
              <button 
                onClick={handleClose}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm"
              >
                Hoàn tất
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
