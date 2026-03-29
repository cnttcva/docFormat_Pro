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
  departments?: string[]; // THÊM DÒNG NÀY: Danh sách các tổ chuyên môn của trường
}

export interface DocxOptions {
  headerType: HeaderType;
  orgInfo?: OrgInfo;
  departmentName?: string;
  documentDate?: string;
  removeNumbering: boolean;
  margins: { top: number; bottom: number; left: number; right: number };
  font: { family: string; sizeNormal: number; sizeTable: number };
  paragraph: { lineSpacing: number; after: number; indent: number };
  table: { rowHeight: number };
  signerTitle?: string;
  signerName?: string;
  isMinutes?: boolean;
  presiderName?: string;
  secretaryName?: string;
  docSymbol?: string;
  docSuffix?: string;
}

export interface ProcessResult {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  error?: string;
  logs?: string[];
}