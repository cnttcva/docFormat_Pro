// File: src/components/SettingsPanel.tsx
import React from 'react';
import { HeaderType, OrgInfo, Staff } from '../types';
import {
  LayoutTemplate,
  CheckSquare,
  ListX,
  ShieldCheck,
  Loader2,
  Settings2,
  FileText,
  ScrollText,
  PenLine,
} from 'lucide-react';

const hanhChinhSymbols = [
  { name: "Nghị quyết", value: "NQ" }, { name: "Quyết định", value: "QĐ" },
  { name: "Quy chế", value: "QC" }, { name: "Quy định", value: "QyĐ" },
  { name: "Thông báo", value: "TB" }, { name: "Hướng dẫn", value: "HD" },
  { name: "Chương trình", value: "CTr" }, { name: "Kế hoạch", value: "KH" },
  { name: "Phương án", value: "PA" }, { name: "Đề án", value: "ĐA" },
  { name: "Dự án", value: "DA" }, { name: "Báo cáo", value: "BC" },
  { name: "Biên bản", value: "BB" }, { name: "Tờ trình", value: "TTr" },
  { name: "Hợp đồng", value: "HĐ" }, { name: "Bản thỏa thuận", value: "BTT" },
  { name: "Giấy ủy quyền", value: "GUQ" }, { name: "Giấy mời", value: "GM" },
  { name: "Giấy giới thiệu", value: "GGT" }, { name: "Giấy nghỉ phép", value: "GNP" },
  { name: "Công văn", value: "CV" }
];

const dangSymbols = [
  { name: "Nghị quyết", value: "NQ" }, { name: "Quyết định", value: "QĐ" },
  { name: "Chỉ thị", value: "CT" }, { name: "Kết luận", value: "KL" },
  { name: "Quy chế", value: "QC" }, { name: "Quy định", value: "QyĐ" },
  { name: "Hướng dẫn", value: "HD" }, { name: "Báo cáo", value: "BC" },
  { name: "Kế hoạch", value: "KH" }, { name: "Chương trình", value: "CTr" },
  { name: "Thông báo", value: "TB" }, { name: "Thông tri", value: "TT" },
  { name: "Công văn", value: "CV" }, { name: "Tờ trình", value: "TTr" },
  { name: "Biên bản", value: "BB" }
];

interface SettingsPanelProps {
  options: any;
  setOptions: (val: any) => void;
  orgInfo?: OrgInfo;
  keepOriginalReceivers: boolean;
  setKeepOriginalReceivers: (val: boolean) => void;
  activeField: string | null;
  isSearching: boolean;
  showDropdown: boolean;
  suggestions: Staff[];
  firebaseError: string | null;
  dropdownRef: React.RefObject<HTMLDivElement>;
  handleNameInput: (val: string, field: string, isFocus?: boolean) => void;
  handleSelectStaff: (staff: Staff, targetName: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  options,
  setOptions,
  orgInfo,
  keepOriginalReceivers,
  setKeepOriginalReceivers,
  activeField,
  isSearching,
  showDropdown,
  suggestions,
  firebaseError,
  dropdownRef,
  handleNameInput,
  handleSelectStaff
}) => {
  const isDecisionEligible =
    options.headerType === HeaderType.SCHOOL || options.headerType === HeaderType.PARTY;

  const handleHeaderTypeChange = (nextHeaderType: HeaderType) => {
    setOptions({
      ...options,
      headerType: nextHeaderType,
      isDecision:
        nextHeaderType === HeaderType.SCHOOL || nextHeaderType === HeaderType.PARTY
          ? options.isDecision
          : false,
    });
  };

  const handleSpecialTypeChange = (
    type: 'minutes' | 'congVan' | 'decision',
    checked: boolean
  ) => {
    if (type === 'decision' && checked && !isDecisionEligible) {
      alert('Quyết định chỉ áp dụng khi chọn Mẫu Văn bản Hành chính hoặc Mẫu Văn bản Công tác Đảng.');
      return;
    }

    if (type === 'minutes') {
      setOptions({
        ...options,
        isMinutes: checked,
        isCongVan: checked ? false : options.isCongVan,
        isDecision: checked ? false : options.isDecision,
        docSymbol: checked ? 'BB' : options.docSymbol,
      });
      return;
    }

    if (type === 'congVan') {
      setOptions({
        ...options,
        isCongVan: checked,
        isMinutes: checked ? false : options.isMinutes,
        isDecision: checked ? false : options.isDecision,
        docSymbol: checked ? 'CV' : options.docSymbol,
      });
      return;
    }

    setOptions({
      ...options,
      isDecision: checked,
      isMinutes: checked ? false : options.isMinutes,
      isCongVan: checked ? false : options.isCongVan,
      docSymbol: checked ? 'QĐ' : options.docSymbol,
      signerTitle:
        checked && options.headerType === HeaderType.PARTY
          ? (options.signerTitle || 'BÍ THƯ')
          : checked && options.headerType === HeaderType.SCHOOL
            ? (options.signerTitle || 'HIỆU TRƯỞNG')
            : options.signerTitle,
    });
  };

  const SpecialTypeBox = ({
    checked,
    disabled,
    icon,
    title,
    description,
    onChange,
  }: {
    checked: boolean;
    disabled?: boolean;
    icon: React.ReactNode;
    title: string;
    description: string;
    onChange: (checked: boolean) => void;
  }) => {
    return (
      <label
        className={`flex items-start gap-3 cursor-pointer group p-4 rounded-2xl border transition-all min-h-[112px] ${
          checked
            ? 'bg-violet-50 border-violet-200 shadow-sm'
            : 'bg-slate-50/60 border-slate-100 hover:bg-white hover:border-violet-200'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            checked
              ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
              : 'bg-white border-slate-300 group-hover:border-violet-400'
          }`}
        >
          {checked && <CheckSquare className="w-3.5 h-3.5" />}
        </div>

        <input
          type="checkbox"
          className="hidden"
          disabled={disabled}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`${checked ? 'text-violet-700' : 'text-slate-500'}`}>
              {icon}
            </span>
            <span className="text-sm font-black text-slate-800 group-hover:text-violet-700 transition-colors">
              {title}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-4">
            {description}
          </p>
        </div>
      </label>
    );
  };

  return (
    <div className="mt-6 bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl shadow-indigo-100/40 border border-white relative overflow-visible animate-fadeIn">
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
            onChange={(e) => handleHeaderTypeChange(e.target.value as HeaderType)}
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
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ký hiệu văn bản
                </label>

                <select
                  value={options.docSymbol || ""}
                  onChange={(e) => setOptions({ ...options, docSymbol: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 transition-all"
                >
                  <option value="">--- Chọn ký hiệu ---</option>
                  {(options.headerType === HeaderType.SCHOOL ? hanhChinhSymbols : dangSymbols).map(sym => (
                    <option key={sym.value} value={sym.value}>{sym.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Hậu tố cơ quan
                </label>

                <input
                  type="text"
                  placeholder={options.headerType === HeaderType.SCHOOL ? "VD: THCSCVA" : "VD: CB"}
                  value={options.docSuffix || ""}
                  onChange={(e) => setOptions({ ...options, docSuffix: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 transition-all uppercase placeholder:normal-case"
                />
              </div>
            </div>
          )}

          {options.headerType === HeaderType.DEPARTMENT && (
            <div className="mt-4 animate-fadeIn bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Chọn Tổ / Phòng ban
              </label>

              <select
                value={options.departmentName || ""}
                onChange={(e) => setOptions({ ...options, departmentName: e.target.value })}
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Ngày ban hành văn bản
              </label>

              <input
                type="date"
                value={options.documentDate || ""}
                onChange={(e) => setOptions({ ...options, documentDate: e.target.value })}
                className="w-full sm:w-1/2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 transition-all shadow-sm"
              />
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Chọn loại văn bản đặc biệt
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SpecialTypeBox
                checked={!!options.isMinutes}
                icon={<ScrollText className="w-4 h-4" />}
                title="BIÊN BẢN"
                description="Hiện ô Chủ tọa và Thư ký; chữ ký Chủ tọa nằm bên phải văn bản."
                onChange={(checked) => handleSpecialTypeChange('minutes', checked)}
              />

              <SpecialTypeBox
                checked={!!options.isCongVan}
                icon={<FileText className="w-4 h-4" />}
                title="CÔNG VĂN"
                description="Hiện ô Trích yếu công văn và cấu hình chuẩn dòng V/v."
                onChange={(checked) => handleSpecialTypeChange('congVan', checked)}
              />

              <SpecialTypeBox
                checked={!!options.isDecision}
                disabled={!isDecisionEligible}
                icon={<PenLine className="w-4 h-4" />}
                title="QUYẾT ĐỊNH"
                description="Hành chính nếu chọn Nhà trường; Quyết định Đảng nếu chọn Chi bộ."
                onChange={(checked) => handleSpecialTypeChange('decision', checked)}
              />
            </div>

            {!isDecisionEligible && (
              <p className="mt-2 text-[11px] text-amber-600 font-bold">
                Lưu ý: Quyết định chỉ áp dụng cho Mẫu Văn bản Hành chính hoặc Mẫu Văn bản Công tác Đảng.
              </p>
            )}
          </div>

          {options.isDecision && (
            <div className="mt-2 animate-fadeIn bg-amber-50/70 p-4 rounded-2xl border border-amber-100">
              <p className="text-xs font-black text-amber-800 uppercase tracking-widest">
                {options.headerType === HeaderType.PARTY
                  ? 'Đang bật: Quyết định của Cấp ủy Chi bộ Đảng'
                  : 'Đang bật: Quyết định hành chính nhà trường'}
              </p>
              <p className="text-[12px] text-amber-700 font-medium mt-1 leading-5">
                Khi xuất DOCX, hệ thống sẽ áp dụng mẫu trình bày Quyết định tương ứng với loại khung văn bản đang chọn.
              </p>
            </div>
          )}

          {options.isCongVan && (
            <div className="mt-2 animate-fadeIn bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-2">
                Nội dung trích yếu công văn
              </label>

              <textarea
                rows={2}
                placeholder="VD: tiếp tục triển khai thực hiện nhiệm vụ năm học 2025 - 2026"
                value={options.congVanSummary || ""}
                onChange={(e) => setOptions({ ...options, congVanSummary: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 resize-none shadow-sm"
              />

              <p className="text-[11px] text-indigo-600 mt-2 font-medium">
                Không cần nhập “V/v:”. Hệ thống sẽ tự chèn tiền tố này khi xuất văn bản.
              </p>
            </div>
          )}

          {options.headerType === HeaderType.DEPARTMENT && !options.isMinutes && (
            <div className="mt-4 animate-fadeIn border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 rounded-2xl shadow-sm relative">
              <p className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <ShieldCheck className="w-4 h-4" /> Ban Giám Hiệu Duyệt
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative" ref={activeField === 'approverName' ? dropdownRef : null}>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                    Chức vụ duyệt
                  </label>

                  <select
                    value={options.approverTitle || ""}
                    onChange={(e) => setOptions({ ...options, approverTitle: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm"
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    <option value="HIỆU TRƯỞNG">HIỆU TRƯỞNG</option>
                    <option value="PHÓ HIỆU TRƯỞNG">PHÓ HIỆU TRƯỞNG</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                    Họ và tên
                  </label>

                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="VD: Nguyễn Văn A"
                    value={options.approverName || ""}
                    onChange={e => handleNameInput(e.target.value, 'approverName')}
                    onFocus={() => handleNameInput(options.approverName || "", 'approverName', true)}
                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm placeholder:font-normal pr-10"
                  />

                  {isSearching && activeField === 'approverName' && (
                    <div className="absolute right-3 top-9">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  )}

                  {showDropdown && activeField === 'approverName' && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[105%] bg-white border-2 border-indigo-200 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-48 overflow-y-auto">
                      {suggestions.map(s => (
                        <div
                          key={s.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectStaff(s, 'approverName');
                          }}
                          className="p-3 hover:bg-indigo-50 cursor-pointer border-b font-bold text-sm text-slate-800"
                        >
                          {s.fullName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 animate-fadeIn border border-slate-200 bg-slate-50/50 p-5 rounded-2xl relative">
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
              {options.isMinutes
                ? "Thông tin Chủ tọa / Thư ký"
                : (options.headerType === HeaderType.DEPARTMENT ? "Thông tin Tổ trưởng Ký" : "Thông tin Người ký")}
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative"
              ref={(activeField === 'signerName' || activeField === 'presiderName' || activeField === 'secretaryName') ? dropdownRef : null}
            >
              {!options.isMinutes ? (
                <>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Họ tên người ký
                    </label>

                    <input
                      type="text"
                      autoComplete="off"
                      value={options.signerName || ""}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 shadow-sm pr-10"
                      placeholder="Gõ tên để tìm từ DB..."
                      onChange={(e) => handleNameInput(e.target.value, 'signerName')}
                      onFocus={() => handleNameInput(options.signerName || "", 'signerName', true)}
                    />

                    {isSearching && activeField === 'signerName' && (
                      <div className="absolute right-3.5 top-9">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      </div>
                    )}

                    {showDropdown && suggestions.length > 0 && activeField === 'signerName' && (
                      <div className="absolute left-0 right-0 top-[105%] bg-white text-slate-900 border-2 border-violet-400 rounded-2xl shadow-2xl z-[9999] overflow-y-auto max-h-64">
                        {suggestions.map(s => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectStaff(s, 'signerName');
                            }}
                            className="p-4 hover:bg-violet-50 cursor-pointer border-b flex flex-col"
                          >
                            <span className="text-sm font-black text-slate-900">{s.fullName}</span>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                              {options.headerType === HeaderType.PARTY ? (s.partyPosition || s.position) : s.position}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {options.headerType === HeaderType.DEPARTMENT ? "Chức danh (Mặc định: TỔ TRƯỞNG)" : "Chức vụ người ký"}
                    </label>

                    <input
                      type="text"
                      value={options.signerTitle || ""}
                      placeholder={options.headerType === HeaderType.DEPARTMENT ? "TỔ TRƯỞNG" : "VD: PHÓ HIỆU TRƯỞNG"}
                      onChange={e => setOptions({ ...options, signerTitle: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 shadow-sm uppercase"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Họ và tên Chủ tọa
                    </label>

                    <input
                      type="text"
                      autoComplete="off"
                      value={options.presiderName || ""}
                      placeholder="Gõ tên chủ tọa..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 shadow-sm pr-10"
                      onChange={e => handleNameInput(e.target.value, 'presiderName')}
                      onFocus={() => handleNameInput(options.presiderName || "", 'presiderName', true)}
                    />

                    {isSearching && activeField === 'presiderName' && (
                      <div className="absolute right-3.5 top-9">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      </div>
                    )}

                    {showDropdown && suggestions.length > 0 && activeField === 'presiderName' && (
                      <div className="absolute left-0 right-0 top-[105%] bg-white text-slate-900 border-2 border-violet-400 rounded-2xl shadow-2xl z-[9999] overflow-y-auto max-h-60">
                        {suggestions.map(s => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectStaff(s, 'presiderName');
                            }}
                            className="p-4 hover:bg-violet-50 cursor-pointer border-b font-bold text-sm"
                          >
                            {s.fullName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Họ và tên Thư ký
                    </label>

                    <input
                      type="text"
                      autoComplete="off"
                      value={options.secretaryName || ""}
                      placeholder="Gõ tên thư ký..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 shadow-sm pr-10"
                      onChange={e => handleNameInput(e.target.value, 'secretaryName')}
                      onFocus={() => handleNameInput(options.secretaryName || "", 'secretaryName', true)}
                    />

                    {isSearching && activeField === 'secretaryName' && (
                      <div className="absolute right-3.5 top-9">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      </div>
                    )}

                    {showDropdown && suggestions.length > 0 && activeField === 'secretaryName' && (
                      <div className="absolute left-0 right-0 top-[105%] bg-white text-slate-900 border-2 border-violet-400 rounded-2xl shadow-2xl z-[9999] overflow-y-auto max-h-60">
                        {suggestions.map(s => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectStaff(s, 'secretaryName');
                            }}
                            className="p-4 hover:bg-violet-50 cursor-pointer border-b font-bold text-sm"
                          >
                            {s.fullName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {firebaseError && (
              <div className="mt-4 p-4 bg-rose-900/50 border border-rose-500 rounded-xl text-rose-200 text-sm font-bold shadow-inner">
                🚨 {firebaseError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 pb-6 border-b border-slate-100">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-1 items-center gap-3 cursor-pointer group bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white transition-all">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${options.removeNumbering ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white border-slate-300 group-hover:border-rose-400'}`}>
              {options.removeNumbering && <ListX className="w-3.5 h-3.5" />}
            </div>

            <input
              type="checkbox"
              className="hidden"
              checked={options.removeNumbering}
              onChange={(e) => setOptions({ ...options, removeNumbering: e.target.checked })}
            />

            <div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                Tẩy sạch Bullets/Numbering
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Chuyển đổi danh sách tự động thành văn bản thường
              </p>
            </div>
          </label>

          <label className="flex flex-1 items-center gap-3 cursor-pointer group bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white transition-all">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${keepOriginalReceivers ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-200' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
              {keepOriginalReceivers && <CheckSquare className="w-3.5 h-3.5" />}
            </div>

            <input
              type="checkbox"
              className="hidden"
              checked={keepOriginalReceivers}
              onChange={(e) => setKeepOriginalReceivers(e.target.checked)}
            />

            <div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                Giữ nguyên Nơi nhận gốc
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Ép in thường và tự động sửa chính tả thay vì xóa
              </p>
            </div>
          </label>
        </div>
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
                type="number"
                step="0.1"
                value={options.margins.top}
                onChange={(e) => setOptions({ ...options, margins: { ...options.margins, top: parseFloat(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Dưới (Bottom)</span>
              <input
                type="number"
                step="0.1"
                value={options.margins.bottom}
                onChange={(e) => setOptions({ ...options, margins: { ...options.margins, bottom: parseFloat(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Trái (Left)</span>
              <input
                type="number"
                step="0.1"
                value={options.margins.left}
                onChange={(e) => setOptions({ ...options, margins: { ...options.margins, left: parseFloat(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Phải (Right)</span>
              <input
                type="number"
                step="0.1"
                value={options.margins.right}
                onChange={(e) => setOptions({ ...options, margins: { ...options.margins, right: parseFloat(e.target.value) } })}
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
                onChange={(e) => setOptions({ ...options, font: { ...options.font, sizeNormal: parseInt(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Cỡ chữ Bảng (pt)</span>
              <input
                type="number"
                value={options.font.sizeTable}
                onChange={(e) => setOptions({ ...options, font: { ...options.font, sizeTable: parseInt(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Dãn dòng (Lines)</span>
              <input
                type="number"
                step="0.05"
                value={options.paragraph.lineSpacing}
                onChange={(e) => setOptions({ ...options, paragraph: { ...options.paragraph, lineSpacing: parseFloat(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Thụt đầu dòng (cm)</span>
              <input
                type="number"
                step="0.01"
                value={options.paragraph.indent}
                onChange={(e) => setOptions({ ...options, paragraph: { ...options.paragraph, indent: parseFloat(e.target.value) } })}
                className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};