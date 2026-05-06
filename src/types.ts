export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum HeaderType {
  NONE = 'NONE',
  SCHOOL = 'SCHOOL',
  PARTY = 'PARTY',
  DEPARTMENT = 'DEPARTMENT'
}

export interface OrgInfo {
  governingBody: string;
  orgName: string;
  partyUpper: string;
  partyCell: string;
  location: string;
  departmentName?: string;
  partyPosition?: string;
  departments?: string[];
  schoolId?: string;
  receivers?: string[];
}

export interface DocxOptions {
  headerType: HeaderType;
  orgInfo?: OrgInfo;
  departmentName?: string;
  documentDate?: string;

  removeNumbering: boolean;

  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  font: {
    family: string;
    sizeNormal: number;
    sizeTable: number;
  };

  paragraph: {
    lineSpacing: number;
    after: number;
    indent: number;
  };

  table: {
    rowHeight: number;
  };

  signerTitle?: string;
  signerName?: string;

  docSymbol?: string;
  docSuffix?: string;

  keepOriginalReceivers?: boolean;

  // BIÊN BẢN
  isMinutes?: boolean;
  presiderName?: string;
  secretaryName?: string;

  // CÔNG VĂN
  isCongVan?: boolean;
  congVanSummary?: string;

  // QUYẾT ĐỊNH
  // HeaderType.SCHOOL + isDecision = Quyết định hành chính nhà trường
  // HeaderType.PARTY + isDecision = Quyết định của Cấp ủy Chi bộ Đảng
  isDecision?: boolean;

  // BGH duyệt đối với văn bản tổ chuyên môn
  approverTitle?: string;
  approverName?: string;

  extractedReceivers?: string[] | null;
}

export interface ProcessResult {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  error?: string;
  logs?: string[];
}

export interface Staff {
  id: string;
  fullName: string;
  position: string;
  partyPosition?: string;
  unitName: string;
  email: string;
  schoolId: string;
  status: string;
}