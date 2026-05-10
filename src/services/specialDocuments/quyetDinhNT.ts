// File: src/services/specialDocuments/quyetDinhNT.ts
import { HeaderType } from '../../types';
import {
  W_NS,
  getOrCreate,
  setAttr,
  forceBoldNode,
  forceParagraphBold
} from '../docUtils';

const normalizeForDetect = (value: string): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Đđ]/g, match => (match === 'Đ' ? 'D' : 'd'))
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const normalizeText = (value: string): string => {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
};

const getBody = (doc: Document): Element | null => {
  const bodies = doc.getElementsByTagNameNS(W_NS, 'body');
  if (bodies.length > 0) return bodies[0];

  const fallbackBodies = doc.getElementsByTagName('w:body');
  if (fallbackBodies.length > 0) return fallbackBodies[0];

  return null;
};

const getLocalName = (el: Element): string => {
  return el.localName || el.nodeName.replace(/^.*:/, '');
};

const getDirectBodyBlocks = (body: Element): Element[] => {
  return Array.from(body.childNodes).filter(node => node.nodeType === 1) as Element[];
};

const getText = (el: Element): string => {
  return normalizeText(el.textContent || '');
};

const cleanSignerTitle = (title: string): string => {
  if (!title) return '';

  const cleaned = title
    .normalize('NFC')
    .replace(/[\.\,\;]+$/, '')
    .trim()
    .toUpperCase();

  if (cleaned.includes('PHÓ HIỆU TRƯỞNG')) return 'PHÓ HIỆU TRƯỞNG';
  if (cleaned.includes('HIỆU TRƯỞNG')) return 'HIỆU TRƯỞNG';

  return cleaned;
};

const cleanSignerName = (name: string): string => {
  if (!name) return '';

  const cleaned = name
    .normalize('NFC')
    .replace(/[\.\,\;]+$/, '')
    .trim();

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const isQuyetDinhNT = (options: any, docType: string): boolean => {
  const type = normalizeForDetect(docType || '');

  return (
    options?.headerType === HeaderType.SCHOOL &&
    (
      options?.isDecision === true ||
      type.includes('QUYET DINH')
    )
  );
};

const isMainDecisionTitleLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t === 'QUYET DINH';
};

const isMainDecisionCommandLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t === 'QUYET DINH:';
};

const isMainDecisionArticleLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^DIEU\s+\d+[\.\:]/.test(t) || /^DIEU\s+\d+\s+/.test(t);
};

const isDecisionLegalBasisLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return (
    t.startsWith('CAN CU') ||
    t.startsWith('XET') ||
    t.startsWith('THEO') ||
    t.startsWith('THUC HIEN')
  );
};

const isDecisionAuthorityLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return (
    t.startsWith('HIEU TRUONG') ||
    t.startsWith('CHU TICH') ||
    t.startsWith('GIAM DOC')
  );
};

const isDecisionSummaryLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t.startsWith('V/V') || t.startsWith('VE VIEC');
};

const isAttachmentTitleLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  if (!t) return false;
  if (isMainDecisionTitleLine(text)) return false;
  if (isMainDecisionArticleLine(text)) return false;
  if (t.startsWith('V/V')) return false;
  if (t.startsWith('VE VIEC')) return false;

  const titles = [
    'QUY CHE',
    'NOI QUY',
    'QUY DINH',
    'DANH SACH',
    'PHU LUC',
    'KE HOACH',
    'THE LE',
    'DANH MUC'
  ];

  return titles.some(title => t === title || t.startsWith(`${title} `));
};

const isAttachmentNoteStartLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  if (!raw) return false;

  /**
   * Mẫu chuẩn của văn bản ban hành kèm theo:
   * (Ban hành kèm theo Quyết định số .../QĐ-..., ngày ... tháng ... năm ...)
   */
  return (
    raw.includes('(') &&
    t.includes('BAN HANH KEM THEO') &&
    t.includes('QUYET DINH')
  );
};

const isAttachmentNoteContinuationLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  if (!raw) return false;

  return (
    t.includes('QUYET DINH') ||
    t.includes('/QD') ||
    t.includes('SO ') ||
    t.includes('NGAY') ||
    t.includes('THANG') ||
    t.includes('NAM') ||
    t.includes('CUA HIEU TRUONG') ||
    t.includes('CUA NHA TRUONG') ||
    raw.includes(')')
  );
};

const isLikelyAttachmentSubtitleLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  if (!raw) return false;
  if (raw.length > 180) return false;
  if (isMainDecisionTitleLine(text)) return false;
  if (isMainDecisionArticleLine(text)) return false;
  if (isDecisionLegalBasisLine(text)) return false;
  if (isDecisionAuthorityLine(text)) return false;
  if (isNationalHeaderLine(text)) return false;
  if (isMottoLine(text)) return false;
  if (isDateLine(text)) return false;
  if (isNoiNhanLine(text)) return false;
  if (isSignerLine(text)) return false;
  if (isPageNumberLine(text)) return false;
  if (isDecorativeLine(text)) return false;
  if (t.startsWith('V/V') || t.startsWith('VE VIEC')) return false;

  return !/[;:]$/.test(raw);
};

const isLikelyGenericAttachmentTitleLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  if (!isLikelyAttachmentSubtitleLine(text)) return false;
  if (raw.length < 8) return false;
  if (raw.length > 180) return false;

  const letters = raw.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  const isMostlyUppercase =
    letters.length >= 6 &&
    letters === letters.toUpperCase();

  const hasAttachmentKeyword =
    t.includes('DANH SACH') ||
    t.includes('BANG PHAN CONG') ||
    t.includes('PHAN CONG') ||
    t.includes('THANH VIEN') ||
    t.includes('HOI DONG') ||
    t.includes('LICH') ||
    t.includes('NOI DUNG') ||
    t.includes('CHUONG TRINH') ||
    t.includes('BAO CAO') ||
    t.includes('BIEN BAN') ||
    t.includes('PHIEU') ||
    t.includes('MAU') ||
    t.includes('DE CUONG') ||
    t.includes('THONG KE') ||
    t.includes('TONG HOP');

  return isMostlyUppercase || hasAttachmentKeyword;
};

const isLikelyGenericAttachmentTitleBlock = (block: Element): boolean => {
  if (getLocalName(block) !== 'p') return false;

  const text = getText(block);

  return (
    isAttachmentTitleLine(text) ||
    isLikelyGenericAttachmentTitleLine(text)
  );
};

const isChapterLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^CHUONG\s+([IVXLCDM]+|\d+)/.test(t);
};

const isArticleLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^DIEU\s+\d+[\.\:]/.test(t) || /^DIEU\s+\d+\s+/.test(t);
};

const isNationalHeaderLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t.includes('CONG HOA XA HOI CHU NGHIA VIET NAM');
};

const isMottoLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('DOC LAP') &&
    t.includes('TU DO') &&
    t.includes('HANH PHUC')
  );
};

const isAdministrativeAgencyHeaderLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  if (!t) return false;
  if (raw.length > 80) return false;
  if (isMainDecisionArticleLine(text)) return false;
  if (isDecisionLegalBasisLine(text)) return false;

  return (
    t.includes('UBND') ||
    t.includes('UY BAN NHAN DAN') ||
    t.includes('PHONG GIAO DUC') ||
    t.includes('SO GIAO DUC') ||
    t === 'TRUONG THCS CHU VAN AN' ||
    t.startsWith('TRUONG THCS ') ||
    t.startsWith('TRUONG THPT ') ||
    t.startsWith('TRUONG TIEU HOC ') ||
    t.startsWith('TRUONG MAM NON ')
  );
};

const isDateLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.length < 160 &&
    t.includes('NGAY') &&
    t.includes('THANG') &&
    t.includes('NAM')
  );
};

const isDecorativeLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^[\s*._\-–—=]+$/.test(t);
};

const isPageNumberLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^[0-9]{1,3}$/.test(t);
};

const isEmptyLine = (text: string): boolean => {
  return normalizeText(text).length === 0;
};

const isNoiNhanLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t === 'NOI NHAN:' || t === 'NOI NHAN';
};

const isSignerLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('HIEU TRUONG') ||
    t.includes('PHO HIEU TRUONG') ||
    t.startsWith('KT.') ||
    t.startsWith('TM.') ||
    t.startsWith('T/M ')
  );
};

const isAttachmentHeaderBlock = (block: Element): boolean => {
  const text = getText(block);
  const local = getLocalName(block);

  if (isEmptyLine(text)) return true;
  if (isPageNumberLine(text)) return true;
  if (isDecorativeLine(text)) return true;

  if (local === 'tbl') {
    const t = normalizeForDetect(text);

    return (
      t.includes('CONG HOA XA HOI CHU NGHIA VIET NAM') ||
      (
        t.includes('DOC LAP') &&
        t.includes('TU DO') &&
        t.includes('HANH PHUC')
      ) ||
      (
        t.length < 250 &&
        (
          t.includes('UBND') ||
          t.includes('UY BAN NHAN DAN') ||
          t.includes('TRUONG THCS') ||
          t.includes('TRUONG THPT') ||
          t.includes('TRUONG TIEU HOC') ||
          t.includes('TRUONG MAM NON')
        )
      )
    );
  }

  return (
    isAdministrativeAgencyHeaderLine(text) ||
    isNationalHeaderLine(text) ||
    isMottoLine(text) ||
    isDateLine(text)
  );
};

const getTableRows = (tbl: Element): Element[] => {
  return Array.from(tbl.getElementsByTagNameNS(W_NS, 'tr')) as Element[];
};

const getTableCells = (tr: Element): Element[] => {
  return Array.from(tr.getElementsByTagNameNS(W_NS, 'tc')) as Element[];
};

const getTableRowText = (tr: Element): string => {
  return normalizeText(tr.textContent || '');
};

const isLikelyDataTableBlock = (block: Element): boolean => {
  if (getLocalName(block) !== 'tbl') return false;

  const rows = getTableRows(block);
  if (rows.length < 2) return false;

  const firstRow = rows[0];
  const firstRowCells = getTableCells(firstRow);
  const firstRowText = normalizeForDetect(getTableRowText(firstRow));
  const tableText = normalizeForDetect(getText(block));

  if (firstRowCells.length >= 2) {
    const hasCommonHeader =
      firstRowText.includes('TT') ||
      firstRowText.includes('STT') ||
      firstRowText.includes('HO VA TEN') ||
      firstRowText.includes('CHUC VU') ||
      firstRowText.includes('NHIEM VU') ||
      firstRowText.includes('GHI CHU') ||
      firstRowText.includes('NOI DUNG') ||
      firstRowText.includes('THOI GIAN') ||
      firstRowText.includes('DIA DIEM') ||
      firstRowText.includes('THANH PHAN');

    if (hasCommonHeader) return true;
  }

  const hasNumberedRows = rows.slice(1, 8).some(row => {
    const rowText = normalizeForDetect(getTableRowText(row));
    return /^[0-9]{1,3}(\s|$)/.test(rowText);
  });

  if (firstRowCells.length >= 2 && hasNumberedRows) return true;

  return rows.length >= 3 && firstRowCells.length >= 2 && tableText.length >= 80;
};

const isAttachmentSearchBoundaryLine = (text: string): boolean => {
  return (
    isMainDecisionArticleLine(text) ||
    isMainDecisionCommandLine(text) ||
    isDecisionLegalBasisLine(text) ||
    isDecisionAuthorityLine(text) ||
    isNoiNhanLine(text) ||
    isSignerLine(text) ||
    isNationalHeaderLine(text) ||
    isMottoLine(text) ||
    isDateLine(text)
  );
};

const findAttachmentHeadingGroupStartBeforeNote = (
  blocks: Element[],
  noteIndex: number,
  lowerBoundIndex = 0
): Element | null => {
  let groupStart: Element | null = null;
  let foundHeadingText = false;

  /**
   * Quét ngược không giới hạn 40 block nữa. Với một số file Word, giữa nội dung
   * Quyết định và văn bản kèm theo có rất nhiều paragraph rỗng/ngắt trang nên
   * giới hạn gần sẽ bỏ sót tiêu đề và dễ làm sai mốc chèn.
   */
  for (let i = noteIndex - 1; i >= lowerBoundIndex; i--) {
    const block = blocks[i];
    const text = getText(block);
    const local = getLocalName(block);

    if (isEmptyLine(text) || isDecorativeLine(text) || isPageNumberLine(text)) {
      continue;
    }

    if (isAttachmentSearchBoundaryLine(text)) {
      break;
    }

    /**
     * Bỏ qua header hành chính cũ nếu có. Không xóa, chỉ không lấy nó làm mốc
     * bắt đầu của văn bản kèm theo.
     */
    if (isAttachmentHeaderBlock(block)) {
      continue;
    }

    if (local === 'p' && isLikelyAttachmentSubtitleLine(text)) {
      groupStart = block;
      foundHeadingText = true;
      continue;
    }

    if (foundHeadingText) {
      break;
    }
  }

  return groupStart;
}

const findPreviousAttachmentTitle = (blocks: Element[], index: number): Element | null => {
  return findAttachmentHeadingGroupStartBeforeNote(blocks, index);
};

const findPreviousAttachmentStartCandidate = (blocks: Element[], index: number): Element | null => {
  const from = Math.max(0, index - 12);

  for (let i = index - 1; i >= from; i--) {
    const block = blocks[i];
    const text = getText(block);

    if (isEmptyLine(text) || isDecorativeLine(text)) continue;

    if (isLikelyGenericAttachmentTitleBlock(block)) return block;

    if (isMainDecisionArticleLine(text)) return null;
    if (isMainDecisionCommandLine(text)) return null;
    if (isDecisionLegalBasisLine(text)) return null;
    if (isDecisionAuthorityLine(text)) return null;
    if (isNoiNhanLine(text)) return null;
    if (isSignerLine(text)) return null;
  }

  return blocks[index] || null;
};


const isMainDecisionEndingText = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('CAN CU QUYET DINH THI HANH') ||
    t.includes('CAN CU QUYET DINH NAY THI HANH') ||
    t.includes('QUYET DINH NAY CO HIEU LUC') ||
    t.includes('CO HIEU LUC KE TU NGAY KY') ||
    t.includes('KE TU NGAY KY') ||
    t.includes('CHIU TRACH NHIEM THI HANH QUYET DINH NAY') ||
    t.includes('CHIU TRACH NHIEM THI HANH') ||
    t.includes('QUYET DINH THI HANH') ||
    t.includes('THI HANH QUYET DINH NAY')
  );
};

const isMainDecisionEndingArticleLine = (text: string): boolean => {
  return isArticleLine(text) && isMainDecisionEndingText(text);
};

const isRealContentBlock = (block: Element): boolean => {
  const text = getText(block);

  if (!text) return false;
  if (isEmptyLine(text)) return false;
  if (isDecorativeLine(text)) return false;
  if (isPageNumberLine(text)) return false;
  if (getLocalName(block) === 'sectPr') return false;

  return true;
};

const isReceiverItemLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  return (
    raw.startsWith('-') ||
    raw.startsWith('+') ||
    t.startsWith('LUU:')
  );
};

const hasAttachmentEvidenceNearby = (blocks: Element[], startIndex: number): boolean => {
  const to = Math.min(blocks.length, startIndex + 16);

  for (let i = startIndex; i < to; i++) {
    const block = blocks[i];
    const text = getText(block);

    if (isAttachmentNoteStartLine(text)) return true;
    if (isLikelyDataTableBlock(block)) return true;
    if (isLikelyGenericAttachmentTitleBlock(block)) return true;
    if (isChapterLine(text)) return true;
  }

  return false;
};

/**
 * Cách nhận diện chính, an toàn nhất cho Quyết định nhà trường:
 * - Tìm điều khoản kết thúc phần Quyết định chính.
 * - Mọi nội dung thật nằm sau điều khoản này được coi là văn bản ban hành kèm theo.
 * - Nếu giữa điều khoản kết thúc và văn bản kèm theo có chữ ký/nơi nhận cũ, bỏ qua vùng chữ ký đó.
 * - Không xóa/can thiệp nội dung từ attachmentStart trở đi.
 */
const findAttachmentStartAfterMainDecisionEnding = (doc: Document): Element | null => {
  const body = getBody(doc);
  if (!body) return null;

  const blocks = getDirectBodyBlocks(body);

  let decisionCommandIndex = -1;
  let currentArticleStartIndex = -1;
  let currentArticleText = '';
  let endingContentIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const text = getText(blocks[i]);
    if (!text) continue;

    if (decisionCommandIndex < 0) {
      if (isMainDecisionCommandLine(text)) {
        decisionCommandIndex = i;
      }
      continue;
    }

    /**
     * Chỉ xét trong phần Quyết định chính. Nếu gặp Nơi nhận/chữ ký thì dừng,
     * vì sau đó không còn là thân nội dung quyết định chính.
     */
    if (isNoiNhanLine(text) || isSignerLine(text)) {
      break;
    }

    if (isArticleLine(text)) {
      currentArticleStartIndex = i;
      currentArticleText = text;

      if (isMainDecisionEndingArticleLine(text)) {
        endingContentIndex = i;
      }

      continue;
    }

    if (currentArticleStartIndex >= 0) {
      currentArticleText = `${currentArticleText} ${text}`;

      if (isMainDecisionEndingText(currentArticleText)) {
        endingContentIndex = i;
      }
    }
  }

  if (endingContentIndex < 0) return null;

  /**
   * Bản v5: mốc văn bản ban hành kèm theo là BLOCK NỘI DUNG THẬT ĐẦU TIÊN
   * sau điều khoản kết thúc quyết định chính.
   *
   * Không tìm theo bảng ở gần/xa, không tìm theo dòng ghi chú, không xóa khoảng
   * rỗng. Lý do: tài liệu Word có thể có rất nhiều paragraph rỗng/ngắt trang;
   * nếu quét theo khoảng hoặc theo dấu hiệu phụ lục, bảng dễ bị bỏ sót và bị
   * các bước dọn sau đó xóa nhầm.
   */
  for (let i = endingContentIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);

    if (!text || isEmptyLine(text) || isDecorativeLine(text) || isPageNumberLine(text)) {
      continue;
    }

    if (getLocalName(block) === 'sectPr') {
      continue;
    }

    /**
     * Nếu file nguồn đã có sẵn chữ ký/nơi nhận ngay sau Điều cuối thì bỏ qua
     * phần chữ ký đó để tìm văn bản kèm theo phía sau. Không xóa tại đây.
     */
    if (isNoiNhanLine(text) || isSignerLine(text) || isReceiverItemLine(text)) {
      continue;
    }

    return block;
  }

  return null;
};

export const findQuyetDinhNTAttachmentStart = (doc: Document): Element | null => {
  const body = getBody(doc);
  if (!body) return null;

  const attachmentAfterEnding = findAttachmentStartAfterMainDecisionEnding(doc);
  if (attachmentAfterEnding) return attachmentAfterEnding;

  const blocks = getDirectBodyBlocks(body);

  let mainDecisionTitleIndex = -1;
  let mainDecisionCommandIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const text = getText(blocks[i]);

    if (!text) continue;

    if (mainDecisionTitleIndex < 0 && isMainDecisionTitleLine(text)) {
      mainDecisionTitleIndex = i;
      continue;
    }

    if (
      mainDecisionTitleIndex >= 0 &&
      mainDecisionCommandIndex < 0 &&
      isMainDecisionCommandLine(text)
    ) {
      mainDecisionCommandIndex = i;
      continue;
    }
  }

  const scanStart =
    mainDecisionCommandIndex >= 0
      ? mainDecisionCommandIndex + 1
      : mainDecisionTitleIndex >= 0
        ? mainDecisionTitleIndex + 1
        : 0;

  /**
   * Ưu tiên cao nhất: dòng ghi chú chuẩn
   * "(Ban hành kèm theo Quyết định số...)".
   * Đây là dấu hiệu chắc nhất để xác định văn bản ban hành kèm theo,
   * kể cả khi tiêu đề phụ lục không chứa QUY CHẾ, QUY ĐỊNH, DANH SÁCH...
   */
  for (let i = scanStart; i < blocks.length; i++) {
    const text = getText(blocks[i]);

    if (!text) continue;

    if (isAttachmentNoteStartLine(text)) {
      const previousTitle = findPreviousAttachmentTitle(blocks, i);
      if (previousTitle) return previousTitle;

      return blocks[i];
    }
  }

  /**
   * Fallback: tiêu đề phụ lục dạng quen thuộc hoặc dòng tiêu đề in hoa.
   * Chỉ nhận nếu gần sau nó có ghi chú chuẩn hoặc bảng dữ liệu thật.
   */
  for (let i = scanStart; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);

    if (!text) continue;

    if (isLikelyGenericAttachmentTitleBlock(block)) {
      const to = Math.min(blocks.length, i + 12);

      for (let j = i + 1; j < to; j++) {
        const next = blocks[j];
        const nextText = getText(next);

        if (isAttachmentNoteStartLine(nextText)) return block;
        if (isLikelyDataTableBlock(next)) return block;

        if (isMainDecisionArticleLine(nextText)) break;
        if (isDecisionLegalBasisLine(nextText)) break;
        if (isNoiNhanLine(nextText)) break;
        if (isSignerLine(nextText)) break;
      }
    }
  }

  /**
   * Fallback: văn bản kèm theo bắt đầu trực tiếp bằng bảng.
   */
  for (let i = scanStart; i < blocks.length; i++) {
    const block = blocks[i];

    if (!isLikelyDataTableBlock(block)) continue;

    const candidate = findPreviousAttachmentStartCandidate(blocks, i);
    if (candidate) return candidate;

    return block;
  }

  /**
   * Fallback cuối: phụ lục dạng Chương/Điều.
   */
  for (let i = scanStart; i < blocks.length; i++) {
    const text = getText(blocks[i]);

    if (!text) continue;

    if (isChapterLine(text)) {
      const candidate = findPreviousAttachmentStartCandidate(blocks, i);
      if (candidate) return candidate;

      return blocks[i];
    }
  }

  return null;
};

const createP = (
  doc: Document,
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right' | 'both';
    size?: number;
    firstLine?: string;
    left?: string;
    hanging?: string;
  } = {}
): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const p = createElement('w:p');
  const pPr = getOrCreate(p, 'w:pPr');

  const jc = getOrCreate(pPr, 'w:jc');
  setAttr(jc, 'val', options.align || 'center');

  const ind = getOrCreate(pPr, 'w:ind');
  setAttr(ind, 'left', options.left || '0');
  setAttr(ind, 'right', '0');

  if (options.hanging) {
    setAttr(ind, 'hanging', options.hanging);
  } else {
    setAttr(ind, 'firstLine', options.firstLine || '0');
  }

  const spacing = getOrCreate(pPr, 'w:spacing');
  setAttr(spacing, 'before', '0');
  setAttr(spacing, 'after', '0');
  setAttr(spacing, 'line', '240');
  setAttr(spacing, 'lineRule', 'auto');

  const r = createElement('w:r');
  p.appendChild(r);

  const rPr = getOrCreate(r, 'w:rPr');

  const sizeVal = String((options.size || 13) * 2);
  const sz = getOrCreate(rPr, 'w:sz');
  setAttr(sz, 'val', sizeVal);

  const szCs = getOrCreate(rPr, 'w:szCs');
  setAttr(szCs, 'val', sizeVal);

  if (options.bold) {
    forceBoldNode(rPr);
    forceParagraphBold(pPr);
  }

  if (options.italic) {
    const i = getOrCreate(rPr, 'w:i');
    setAttr(i, 'val', 'true');

    const iCs = getOrCreate(rPr, 'w:iCs');
    setAttr(iCs, 'val', 'true');
  }

  if (options.underline) {
    const u = getOrCreate(rPr, 'w:u');
    setAttr(u, 'val', 'single');
  }

  const t = createElement('w:t');
  t.textContent = text;
  r.appendChild(t);

  return p;
};

const createPageBreakParagraph = (doc: Document): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const p = createElement('w:p');
  const pPr = getOrCreate(p, 'w:pPr');

  const spacing = getOrCreate(pPr, 'w:spacing');
  setAttr(spacing, 'before', '0');
  setAttr(spacing, 'after', '0');
  setAttr(spacing, 'line', '240');
  setAttr(spacing, 'lineRule', 'auto');

  const r = createElement('w:r');
  const br = createElement('w:br');
  setAttr(br, 'type', 'page');

  r.appendChild(br);
  p.appendChild(r);

  return p;
};

const createLineTable = (doc: Document, widthTwips: string, borderSize: string = '6'): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const tbl = createElement('w:tbl');
  const tblPr = getOrCreate(tbl, 'w:tblPr');

  const jcTbl = getOrCreate(tblPr, 'w:jc');
  setAttr(jcTbl, 'val', 'center');

  const tblW = getOrCreate(tblPr, 'w:tblW');
  setAttr(tblW, 'w', widthTwips);
  setAttr(tblW, 'type', 'dxa');

  const tblLayout = getOrCreate(tblPr, 'w:tblLayout');
  setAttr(tblLayout, 'type', 'fixed');

  const tblGrid = getOrCreate(tbl, 'w:tblGrid');
  const gridCol = createElement('w:gridCol');
  setAttr(gridCol, 'w', widthTwips);
  tblGrid.appendChild(gridCol);

  const tr = createElement('w:tr');
  tbl.appendChild(tr);

  const tc = createElement('w:tc');
  tr.appendChild(tc);

  const tcPr = getOrCreate(tc, 'w:tcPr');

  const tcW = getOrCreate(tcPr, 'w:tcW');
  setAttr(tcW, 'w', widthTwips);
  setAttr(tcW, 'type', 'dxa');

  const tcMar = getOrCreate(tcPr, 'w:tcMar');
  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const mar = getOrCreate(tcMar, `w:${side}`);
    setAttr(mar, 'w', '0');
    setAttr(mar, 'type', 'dxa');
  });

  const tcBorders = getOrCreate(tcPr, 'w:tcBorders');
  const top = getOrCreate(tcBorders, 'w:top');
  setAttr(top, 'val', 'single');
  setAttr(top, 'sz', borderSize);
  setAttr(top, 'space', '0');
  setAttr(top, 'color', '000000');

  const p = createElement('w:p');
  tc.appendChild(p);

  const pPr = getOrCreate(p, 'w:pPr');
  const spacing = getOrCreate(pPr, 'w:spacing');
  setAttr(spacing, 'before', '0');
  setAttr(spacing, 'after', '0');
  setAttr(spacing, 'line', '24');
  setAttr(spacing, 'lineRule', 'exact');

  return tbl;
};

const createTwoColumnHeaderTable = (
  doc: Document,
  leftLines: string[],
  rightLines: string[],
  options: {
    includeShortLine?: boolean;
    includeMottoLine?: boolean;
  } = {}
): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const tbl = createElement('w:tbl');
  const tblPr = getOrCreate(tbl, 'w:tblPr');

  const tblBorders = getOrCreate(tblPr, 'w:tblBorders');
  ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].forEach(side => {
    const border = getOrCreate(tblBorders, `w:${side}`);
    setAttr(border, 'val', 'none');
  });

  const tblLayout = getOrCreate(tblPr, 'w:tblLayout');
  setAttr(tblLayout, 'type', 'fixed');

  const tblW = getOrCreate(tblPr, 'w:tblW');
  setAttr(tblW, 'w', '9350');
  setAttr(tblW, 'type', 'dxa');

  const tblGrid = getOrCreate(tbl, 'w:tblGrid');

  const col1 = createElement('w:gridCol');
  setAttr(col1, 'w', '3800');
  tblGrid.appendChild(col1);

  const col2 = createElement('w:gridCol');
  setAttr(col2, 'w', '5550');
  tblGrid.appendChild(col2);

  const tr = createElement('w:tr');
  tbl.appendChild(tr);

  const createCell = (width: string) => {
    const tc = createElement('w:tc');
    const tcPr = getOrCreate(tc, 'w:tcPr');

    const tcW = getOrCreate(tcPr, 'w:tcW');
    setAttr(tcW, 'w', width);
    setAttr(tcW, 'type', 'dxa');

    const tcMar = getOrCreate(tcPr, 'w:tcMar');
    ['top', 'bottom', 'left', 'right'].forEach(side => {
      const mar = getOrCreate(tcMar, `w:${side}`);
      setAttr(mar, 'w', '0');
      setAttr(mar, 'type', 'dxa');
    });

    return tc;
  };

  const tc1 = createCell('3800');
  tr.appendChild(tc1);

  const tc2 = createCell('5550');
  tr.appendChild(tc2);

  leftLines.forEach((line, index) => {
    tc1.appendChild(createP(doc, line, {
      bold: index === leftLines.length - 1,
      align: 'center',
      size: 13
    }));
  });

  if (options.includeShortLine) {
    tc1.appendChild(createLineTable(doc, '1000', '4'));
  }

  rightLines.forEach(line => {
    tc2.appendChild(createP(doc, line, {
      bold: true,
      align: 'center',
      size: 13
    }));
  });

  if (options.includeMottoLine) {
    tc2.appendChild(createLineTable(doc, '3200', '6'));
  }

  return tbl;
};

export const createQuyetDinhNTAttachmentStandardHeader = (doc: Document, options: any): Element => {
  const org = options?.orgInfo || {
    governingBody: 'UBND XÃ EA KAR',
    orgName: 'TRƯỜNG THCS CHU VĂN AN'
  };

  return createTwoColumnHeaderTable(
    doc,
    [
      String(org.governingBody || 'UBND XÃ EA KAR').toUpperCase(),
      String(org.orgName || 'TRƯỜNG THCS CHU VĂN AN').toUpperCase()
    ],
    [
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc'
    ],
    {
      includeShortLine: true,
      includeMottoLine: true
    }
  );
};

const removeOldMainDecisionSignatureBeforeAttachment = (
  doc: Document,
  attachmentStart: Element
): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  const from = Math.max(0, startIndex - 60);
  let noiNhanIndex = -1;

  for (let i = startIndex - 1; i >= from; i--) {
    const text = getText(blocks[i]);

    if (isLikelyGenericAttachmentTitleBlock(blocks[i])) break;

    if (isNoiNhanLine(text)) {
      noiNhanIndex = i;
      break;
    }

    if (isMainDecisionCommandLine(text)) break;
  }

  if (noiNhanIndex < 0) return;

  const toRemove: Element[] = [];

  for (let i = noiNhanIndex; i < startIndex; i++) {
    const block = blocks[i];
    const text = getText(block);

    if (isLikelyGenericAttachmentTitleBlock(block)) break;

    toRemove.push(block);
  }

  toRemove.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
};

export const cleanQuyetDinhNTAttachmentHeader = (
  _doc: Document,
  _attachmentStart: Element
): void => {
  /**
   * Bản v5: không xóa header hoặc bất kỳ block nào của văn bản ban hành kèm theo.
   * Chỉ chèn chữ ký/ngắt trang/header mới trước phần kèm theo. Giữ nguyên toàn bộ
   * nội dung phía sau để tránh mất bảng.
   */
  return;
};

const hardResetParagraphAsSingleRun = (
  doc: Document,
  p: Element,
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right' | 'both';
    size?: number;
    before?: string;
    after?: string;
    line?: string;
  } = {}
): void => {
  const cleanText = normalizeText(text);

  const pPr = getOrCreate(p, 'w:pPr');

  const jc = getOrCreate(pPr, 'w:jc');
  setAttr(jc, 'val', options.align || 'center');

  const ind = getOrCreate(pPr, 'w:ind');
  setAttr(ind, 'left', '0');
  setAttr(ind, 'right', '0');
  setAttr(ind, 'firstLine', '0');
  setAttr(ind, 'hanging', '0');

  ind.removeAttributeNS(W_NS, 'firstLineChars');
  ind.removeAttributeNS(W_NS, 'hangingChars');
  ind.removeAttribute('w:firstLineChars');
  ind.removeAttribute('w:hangingChars');

  const contextualSpacing = pPr.getElementsByTagNameNS(W_NS, 'contextualSpacing')[0];
  if (contextualSpacing && contextualSpacing.parentNode) {
    contextualSpacing.parentNode.removeChild(contextualSpacing);
  }

  const tabs = Array.from(pPr.getElementsByTagNameNS(W_NS, 'tabs')) as Element[];
  tabs.forEach(tab => {
    if (tab.parentNode) tab.parentNode.removeChild(tab);
  });

  const spacing = getOrCreate(pPr, 'w:spacing');
  setAttr(spacing, 'before', options.before || '0');
  setAttr(spacing, 'after', options.after || '0');
  setAttr(spacing, 'line', options.line || '240');
  setAttr(spacing, 'lineRule', 'auto');

  Array.from(p.childNodes).forEach(child => {
    const localName =
      child.nodeType === 1
        ? ((child as Element).localName || child.nodeName.replace(/^.*:/, ''))
        : child.nodeName.replace(/^.*:/, '');

    if (localName !== 'pPr') {
      p.removeChild(child);
    }
  });

  const r = doc.createElementNS(W_NS, 'w:r');
  const rPr = getOrCreate(r, 'w:rPr');

  const sz = getOrCreate(rPr, 'w:sz');
  setAttr(sz, 'val', String((options.size || 14) * 2));

  const szCs = getOrCreate(rPr, 'w:szCs');
  setAttr(szCs, 'val', String((options.size || 14) * 2));

  if (options.bold) {
    forceBoldNode(rPr);
    forceParagraphBold(pPr);
  }

  if (options.italic) {
    const i = getOrCreate(rPr, 'w:i');
    setAttr(i, 'val', 'true');

    const iCs = getOrCreate(rPr, 'w:iCs');
    setAttr(iCs, 'val', 'true');
  }

  const t = doc.createElementNS(W_NS, 'w:t');
  t.textContent = cleanText;
  r.appendChild(t);
  p.appendChild(r);
};

const setParagraphSpacing = (
  p: Element,
  beforeTwips: string,
  afterTwips: string,
  lineTwips: string = '240'
): void => {
  const pPr = getOrCreate(p, 'w:pPr');

  const contextualSpacing = pPr.getElementsByTagNameNS(W_NS, 'contextualSpacing')[0];
  if (contextualSpacing && contextualSpacing.parentNode) {
    contextualSpacing.parentNode.removeChild(contextualSpacing);
  }

  const spacing = getOrCreate(pPr, 'w:spacing');
  setAttr(spacing, 'before', beforeTwips);
  setAttr(spacing, 'after', afterTwips);
  setAttr(spacing, 'line', lineTwips);
  setAttr(spacing, 'lineRule', 'auto');
};

const setTableLineSpacing = (
  tbl: Element,
  beforeTwips: string,
  afterTwips: string
): void => {
  const tblPr = getOrCreate(tbl, 'w:tblPr');
  const jcTbl = getOrCreate(tblPr, 'w:jc');
  setAttr(jcTbl, 'val', 'center');

  const paragraphs = Array.from(tbl.getElementsByTagNameNS(W_NS, 'p'));
  paragraphs.forEach(p => {
    const pPr = getOrCreate(p, 'w:pPr');

    const jc = getOrCreate(pPr, 'w:jc');
    setAttr(jc, 'val', 'center');

    const spacing = getOrCreate(pPr, 'w:spacing');
    setAttr(spacing, 'before', beforeTwips);
    setAttr(spacing, 'after', afterTwips);
    setAttr(spacing, 'line', '240');
    setAttr(spacing, 'lineRule', 'auto');
  });
};

const isShortUnderlineParagraph = (block: Element): boolean => {
  if (getLocalName(block) !== 'p') return false;

  const raw = normalizeText(getText(block));
  if (!raw) return false;

  const compact = raw.replace(/\s+/g, '');
  return /^[_\-–—.·]{6,}$/.test(compact);
};

const removeDecorativeBlocksBetweenAttachmentNoteAndContent = (_doc: Document): void => {
  /**
   * Bản v5: no-op. Tuyệt đối không removeChild trong vùng văn bản kèm theo.
   */
  return;
};

const normalizeQuyetDinhNTMainHeadingSpacing = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);

  let decisionTitleIndex = -1;
  let summaryIndex = -1;
  let authorityIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);

    if (!text || getLocalName(block) !== 'p') continue;

    if (decisionTitleIndex < 0 && isMainDecisionTitleLine(text)) {
      decisionTitleIndex = i;
      continue;
    }

    if (decisionTitleIndex >= 0 && summaryIndex < 0 && isDecisionSummaryLine(text)) {
      summaryIndex = i;
      continue;
    }

    if (summaryIndex >= 0 && authorityIndex < 0 && isDecisionAuthorityLine(text)) {
      authorityIndex = i;
      break;
    }
  }

  if (summaryIndex >= 0) {
    const summaryBlock = blocks[summaryIndex];
    if (getLocalName(summaryBlock) === 'p') {
      setParagraphSpacing(summaryBlock, '0', '0', '240');
    }
  }

  if (authorityIndex >= 0) {
    const authorityBlock = blocks[authorityIndex];
    if (getLocalName(authorityBlock) === 'p') {
      // Dòng thẩm quyền "HIỆU TRƯỞNG TRƯỜNG ..." luôn cách đoạn trên và đoạn dưới 18pt.
      setParagraphSpacing(authorityBlock, '360', '360', '240');
    }

    // Đảm bảo dòng căn cứ đầu tiên không tự cộng thêm khoảng cách ngoài 18pt của dòng thẩm quyền.
    for (let i = authorityIndex + 1; i < blocks.length; i++) {
      const nextBlock = blocks[i];
      const nextText = getText(nextBlock);
      if (!nextText || getLocalName(nextBlock) !== 'p') continue;

      if (isDecisionLegalBasisLine(nextText)) {
        setParagraphSpacing(nextBlock, '0', '0', '240');
      }

      break;
    }
  }
};

const normalizeAttachmentUnderlineSpacing = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const attachmentStart = findQuyetDinhNTAttachmentStart(doc);
  if (!attachmentStart) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  let inAttachmentNote = false;
  let noteEnded = false;

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);
    const raw = normalizeText(text);

    if (!inAttachmentNote && isAttachmentNoteStartLine(text)) {
      inAttachmentNote = true;
      noteEnded = raw.includes(')');
      continue;
    }

    if (inAttachmentNote && !noteEnded) {
      if (raw.includes(')')) {
        noteEnded = true;
      }
      continue;
    }

    if (inAttachmentNote && noteEnded) {
      if (isArticleLine(text) || isChapterLine(text) || isLikelyGenericAttachmentTitleBlock(block)) {
        break;
      }

      if (isShortUnderlineParagraph(block)) {
        hardResetParagraphAsSingleRun(doc, block, text, {
          align: 'center',
          size: 12,
          before: '40',
          after: '240',
          line: '240'
        });
        break;
      }

      if (getLocalName(block) === 'tbl') {
        if (isLikelyDataTableBlock(block)) {
          break;
        }

        setTableLineSpacing(block, '40', '240');
        break;
      }
    }
  }
};

export const normalizeQuyetDinhNTAttachmentHeadings = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  let attachmentStart = findQuyetDinhNTAttachmentStart(doc);
  if (!attachmentStart) return;

  /**
   * Không xóa bất kỳ block nào trong văn bản ban hành kèm theo.
   * Chỉ định dạng nhẹ các heading/ghi chú nhận diện được.
   */

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  let inParenthesizedAttachmentNote = false;
  let lastAttachmentNoteParagraph: Element | null = null;

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);
    const rawText = normalizeText(text);

    if (getLocalName(block) !== 'p') continue;

    if (!text) {
      continue;
    }

    if (isLikelyGenericAttachmentTitleBlock(block)) {
      hardResetParagraphAsSingleRun(doc, block, text, {
        bold: true,
        align: 'center',
        size: 14,
        before: '360',
        after: '240',
        line: '240'
      });

      inParenthesizedAttachmentNote = false;
      lastAttachmentNoteParagraph = null;
      continue;
    }

    const startsAttachmentNote = isAttachmentNoteStartLine(rawText);
    const endsAttachmentNote = rawText.includes(')');

    if (startsAttachmentNote || (inParenthesizedAttachmentNote && isAttachmentNoteContinuationLine(rawText))) {
      hardResetParagraphAsSingleRun(doc, block, text, {
        italic: true,
        align: 'center',
        size: 14,
        before: '0',
        after: endsAttachmentNote ? '80' : '0',
        line: '240'
      });

      lastAttachmentNoteParagraph = block;

      if (endsAttachmentNote) {
        inParenthesizedAttachmentNote = false;
      } else {
        inParenthesizedAttachmentNote = true;
      }

      continue;
    }

    if (isChapterLine(text)) {
      hardResetParagraphAsSingleRun(doc, block, text, {
        bold: true,
        align: 'center',
        size: 14,
        before: '360',
        after: '0',
        line: '240'
      });

      const next = blocks[i + 1];
      if (!next || getLocalName(next) !== 'p') continue;

      const nextText = getText(next);

      if (
        nextText &&
        !isArticleLine(nextText) &&
        !isChapterLine(nextText) &&
        !isAttachmentNoteStartLine(nextText)
      ) {
        hardResetParagraphAsSingleRun(doc, next, nextText, {
          bold: true,
          align: 'center',
          size: 14,
          before: '0',
          after: '240',
          line: '240'
        });
      }

      continue;
    }

    if (isArticleLine(text)) {
      if (lastAttachmentNoteParagraph) {
        setParagraphSpacing(lastAttachmentNoteParagraph, '0', '360', '240');
      }

      continue;
    }
  }
};

const getMainDecisionExecutionArticleNumber = (doc: Document): string => {
  const body = getBody(doc);
  if (!body) return '3';

  const blocks = getDirectBodyBlocks(body);
  let decisionCommandSeen = false;
  let lastArticleNumber = '3';

  for (const block of blocks) {
    const text = getText(block);
    if (!text) continue;

    if (isMainDecisionCommandLine(text)) {
      decisionCommandSeen = true;
      continue;
    }

    if (!decisionCommandSeen) continue;

    if (isNoiNhanLine(text) || isSignerLine(text)) break;
    if (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text)) break;

    const normalized = normalizeForDetect(text);
    const articleMatch = normalized.match(/^DIEU\s+(\d+)/);

    if (articleMatch?.[1]) {
      lastArticleNumber = articleMatch[1];
    }

    if (
      isMainDecisionEndingText(text) ||
      normalized.includes('CAN CU QUYET DINH THI HANH') ||
      normalized.includes('CHIU TRACH NHIEM THI HANH') ||
      normalized.includes('QUYET DINH NAY CO HIEU LUC')
    ) {
      return articleMatch?.[1] || lastArticleNumber;
    }
  }

  return lastArticleNumber;
};

const getQuyetDinhNTReceivers = (options: any, doc: Document): string[] => {
  if (Array.isArray(options?.receivers) && options.receivers.length > 0) {
    return options.receivers.map((item: unknown) => String(item || '')).filter(Boolean);
  }

  const executionArticleNumber = getMainDecisionExecutionArticleNumber(doc);

  return [
    '- Cấp ủy chi bộ (b/c)',
    `- Như Điều ${executionArticleNumber} (t/h)`,
    '- Các tổ chuyên môn',
    '- Các tổ chức Đoàn thể',
    '- Lưu: VT'
  ];
};

const normalizeReceiverEnd = (text: string, index: number, total: number): string => {
  const cleanText = normalizeText(text).replace(/[\.\,\;]+$/, '');
  if (!cleanText) return cleanText;

  return index === total - 1 ? `${cleanText}.` : `${cleanText};`;
};

export const createQuyetDinhNTSignatureBlock = (
  doc: Document,
  options: any,
  docType: string
): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const tbl = createElement('w:tbl');
  const tblPr = getOrCreate(tbl, 'w:tblPr');

  const tblBorders = getOrCreate(tblPr, 'w:tblBorders');
  ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].forEach(side => {
    const border = getOrCreate(tblBorders, `w:${side}`);
    setAttr(border, 'val', 'none');
  });

  const tblLayout = getOrCreate(tblPr, 'w:tblLayout');
  setAttr(tblLayout, 'type', 'fixed');

  const tblW = getOrCreate(tblPr, 'w:tblW');
  setAttr(tblW, 'w', '9350');
  setAttr(tblW, 'type', 'dxa');

  const tblGrid = getOrCreate(tbl, 'w:tblGrid');

  const col1 = createElement('w:gridCol');
  setAttr(col1, 'w', '3800');
  tblGrid.appendChild(col1);

  const col2 = createElement('w:gridCol');
  setAttr(col2, 'w', '5550');
  tblGrid.appendChild(col2);

  const tr = createElement('w:tr');
  tbl.appendChild(tr);

  const createCell = (width: string): Element => {
    const tc = createElement('w:tc');
    const tcPr = getOrCreate(tc, 'w:tcPr');

    const tcW = getOrCreate(tcPr, 'w:tcW');
    setAttr(tcW, 'w', width);
    setAttr(tcW, 'type', 'dxa');

    const tcMar = getOrCreate(tcPr, 'w:tcMar');
    ['top', 'bottom', 'left', 'right'].forEach(side => {
      const mar = getOrCreate(tcMar, `w:${side}`);
      setAttr(mar, 'w', '0');
      setAttr(mar, 'type', 'dxa');
    });

    return tc;
  };

  const tc1 = createCell('3800');
  tr.appendChild(tc1);

  const tc2 = createCell('5550');
  tr.appendChild(tc2);

  tc1.appendChild(createP(doc, 'Nơi nhận:', {
    bold: true,
    italic: true,
    align: 'left',
    size: 12
  }));

  const receivers = getQuyetDinhNTReceivers(options, doc);

  receivers.forEach((receiver, index) => {
    tc1.appendChild(createP(doc, normalizeReceiverEnd(receiver, index, receivers.length), {
      align: 'left',
      size: 11,
      left: '340',
      hanging: '340'
    }));
  });

  const signerTitle = cleanSignerTitle(options?.signerTitle) || 'HIỆU TRƯỞNG';
  const signerName = cleanSignerName(options?.signerName);

  if (signerTitle.includes('PHÓ')) {
    const baseTitle = signerTitle.replace('PHÓ ', '');

    tc2.appendChild(createP(doc, `KT. ${baseTitle}`, {
      bold: true,
      align: 'center',
      size: 14
    }));

    tc2.appendChild(createP(doc, signerTitle, {
      bold: true,
      align: 'center',
      size: 14
    }));
  } else {
    tc2.appendChild(createP(doc, signerTitle, {
      bold: true,
      align: 'center',
      size: 14
    }));
  }

  const blankLines = signerTitle.includes('PHÓ') ? 4 : 5;

  for (let i = 0; i < blankLines; i++) {
    tc2.appendChild(createP(doc, '', {
      align: 'center',
      size: 14
    }));
  }

  if (signerName) {
    tc2.appendChild(createP(doc, signerName, {
      bold: true,
      align: 'center',
      size: 14
    }));
  }

  return tbl;
};

const insertBeforeSectPrOrAppend = (doc: Document, el: Element): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const lastBlock = blocks[blocks.length - 1];

  if (lastBlock && getLocalName(lastBlock) === 'sectPr') {
    body.insertBefore(el, lastBlock);
  } else {
    body.appendChild(el);
  }
};

const getAttachmentInsertionPoint = (
  doc: Document,
  attachmentStart: Element
): Element => {
  const body = getBody(doc);
  if (!body) return attachmentStart;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return attachmentStart;

  /**
   * Nếu attachmentStart đang là dòng ghi chú "(Ban hành kèm theo...)" thì
   * điểm chèn đúng phải là dòng đầu tiên của cụm tiêu đề/phụ đề đứng trước nó.
   * Nếu chèn chữ ký ngay trước dòng ghi chú, tiêu đề phụ lục sẽ bị kẹt lại ở
   * phần Quyết định chính, và các bước xử lý sau có thể làm mất bảng dữ liệu.
   */
  if (isAttachmentNoteStartLine(getText(attachmentStart))) {
    const headingStart = findAttachmentHeadingGroupStartBeforeNote(blocks, startIndex);
    if (headingStart) return headingStart;
  }

  return attachmentStart;
};


const getBodySectPr = (body: Element): Element | null => {
  const children = Array.from(body.childNodes);

  for (let i = children.length - 1; i >= 0; i--) {
    const node = children[i];
    if (node.nodeType !== 1) continue;

    const el = node as Element;
    if (getLocalName(el) === 'sectPr') return el;
  }

  return null;
};

const extractBodyBlocksFrom = (
  doc: Document,
  body: Element,
  start: Element
): DocumentFragment => {
  const fragment = doc.createDocumentFragment();

  let node: ChildNode | null = start;

  while (node) {
    const next = node.nextSibling;

    if (node.nodeType === 1 && getLocalName(node as Element) === 'sectPr') {
      break;
    }

    fragment.appendChild(node);
    node = next;
  }

  return fragment;
};

const insertBeforeSectPrOrAppendToBody = (body: Element, node: Node): void => {
  const sectPr = getBodySectPr(body);

  if (sectPr) {
    body.insertBefore(node, sectPr);
  } else {
    body.appendChild(node);
  }
};

export const insertQuyetDinhNTSignatureBlock = (
  doc: Document,
  options: any,
  docType: string
): boolean => {
  if (!isQuyetDinhNT(options, docType)) return false;

  const body = getBody(doc);
  if (!body) return false;

  /**
   * Bản v6: bảo toàn nguyên khối "văn bản ban hành kèm theo".
   *
   * Nguyên nhân các bản trước vẫn mất bảng: nếu chỉ insertBefore vào giữa tài liệu,
   * các bước xử lý/cleaner khác trong pipeline vẫn có thể coi phần phía sau chữ ký
   * là phần thừa và loại bỏ. Vì vậy bản này làm theo cách an toàn hơn:
   *
   * 1. Xác định mốc đầu của văn bản kèm theo.
   * 2. Tách TOÀN BỘ các block từ mốc đó đến trước sectPr ra DocumentFragment.
   *    Việc tách này giữ nguyên XML gốc của tiêu đề, ghi chú, bảng, định dạng bảng.
   * 3. Chèn chữ ký + ngắt trang + header phụ lục.
   * 4. Gắn nguyên fragment văn bản kèm theo ngay sau header.
   *
   * Kết quả: không có removeChild kiểu "dọn rác" nào áp dụng riêng cho bảng;
   * bảng được di chuyển nguyên khối nên không thể bị xóa do quét thiếu/quét gần.
   */
  const detectedAttachmentStart =
    findAttachmentStartAfterMainDecisionEnding(doc) ||
    findQuyetDinhNTAttachmentStart(doc);

  if (detectedAttachmentStart) {
    const attachmentStart = getAttachmentInsertionPoint(doc, detectedAttachmentStart);
    const signatureBlock = createQuyetDinhNTSignatureBlock(doc, options, docType);
    const pageBreakBeforeAttachment = createPageBreakParagraph(doc);
    const attachmentHeader = createQuyetDinhNTAttachmentStandardHeader(doc, options);

    const attachmentFragment = extractBodyBlocksFrom(doc, body, attachmentStart);

    insertBeforeSectPrOrAppendToBody(body, signatureBlock);
    insertBeforeSectPrOrAppendToBody(body, pageBreakBeforeAttachment);
    insertBeforeSectPrOrAppendToBody(body, attachmentHeader);
    insertBeforeSectPrOrAppendToBody(body, attachmentFragment);

    normalizeQuyetDinhNTMainHeadingSpacing(doc);

    return true;
  }

  const signatureBlock = createQuyetDinhNTSignatureBlock(doc, options, docType);
  insertBeforeSectPrOrAppend(doc, signatureBlock);

  normalizeQuyetDinhNTMainHeadingSpacing(doc);

  return true;
};