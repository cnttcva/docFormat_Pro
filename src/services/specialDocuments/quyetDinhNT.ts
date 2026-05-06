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
  return t === 'QUYET DINH' || t === 'QUYET DINH:';
};

const isMainDecisionCommandLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t === 'QUYET DINH:' || t === 'QUYET DINH';
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

  return raw.includes('(') && t.includes('BAN HANH KEM THEO');
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

const findPreviousAttachmentTitle = (blocks: Element[], index: number): Element | null => {
  const from = Math.max(0, index - 8);

  for (let i = index - 1; i >= from; i--) {
    const text = getText(blocks[i]);

    if (isAttachmentTitleLine(text)) return blocks[i];

    if (isMainDecisionArticleLine(text)) return null;
    if (isMainDecisionCommandLine(text)) return null;
    if (isDecisionLegalBasisLine(text)) return null;
  }

  return null;
};

const findPreviousAttachmentStartCandidate = (blocks: Element[], index: number): Element | null => {
  const from = Math.max(0, index - 12);

  for (let i = index - 1; i >= from; i--) {
    const text = getText(blocks[i]);

    if (isAttachmentTitleLine(text)) return blocks[i];

    if (isMainDecisionArticleLine(text)) return null;
    if (isMainDecisionCommandLine(text)) return null;
    if (isDecisionLegalBasisLine(text)) return null;
  }

  return blocks[index] || null;
};

export const findQuyetDinhNTAttachmentStart = (doc: Document): Element | null => {
  const body = getBody(doc);
  if (!body) return null;

  const blocks = getDirectBodyBlocks(body);

  let mainDecisionTitleIndex = -1;
  let mainDecisionCommandIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const text = getText(blocks[i]);

    if (!text) continue;

    const t = normalizeForDetect(text);

    if (mainDecisionTitleIndex < 0 && (t === 'QUYET DINH' || t === 'QUYET DINH:')) {
      mainDecisionTitleIndex = i;
      continue;
    }

    if (
      mainDecisionTitleIndex >= 0 &&
      mainDecisionCommandIndex < 0 &&
      (t === 'QUYET DINH:' || t === 'QUYET DINH')
    ) {
      mainDecisionCommandIndex = i;
      continue;
    }
  }

  const scanStart = mainDecisionTitleIndex >= 0 ? mainDecisionTitleIndex + 1 : 0;

  for (let i = scanStart; i < blocks.length; i++) {
    const text = getText(blocks[i]);

    if (!text) continue;

    if (isAttachmentTitleLine(text)) {
      return blocks[i];
    }
  }

  for (let i = scanStart; i < blocks.length; i++) {
    const text = getText(blocks[i]);

    if (!text) continue;

    if (isAttachmentNoteStartLine(text)) {
      const previousTitle = findPreviousAttachmentTitle(blocks, i);
      if (previousTitle) return previousTitle;

      return blocks[i];
    }
  }

  const chapterScanStart =
    mainDecisionCommandIndex >= 0
      ? mainDecisionCommandIndex + 1
      : scanStart;

  for (let i = chapterScanStart; i < blocks.length; i++) {
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

    if (isAttachmentTitleLine(text)) break;

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

    if (isAttachmentTitleLine(text)) break;

    toRemove.push(block);
  }

  toRemove.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
};

export const cleanQuyetDinhNTAttachmentHeader = (
  doc: Document,
  attachmentStart: Element
): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  const toRemove: Element[] = [];

  for (let i = startIndex - 1; i >= 0; i--) {
    const block = blocks[i];
    const text = getText(block);

    if (isMainDecisionArticleLine(text)) break;
    if (isMainDecisionCommandLine(text)) break;
    if (isDecisionLegalBasisLine(text)) break;
    if (isDecisionAuthorityLine(text)) break;
    if (isNoiNhanLine(text)) break;
    if (isSignerLine(text)) break;

    if (isAttachmentHeaderBlock(block)) {
      toRemove.push(block);
      continue;
    }

    if (!isEmptyLine(text)) break;
  }

  toRemove.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
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

  const tabs = Array.from(pPr.getElementsByTagNameNS(W_NS, 'tabs'));
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

const removeDecorativeBlocksBetweenAttachmentNoteAndContent = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const attachmentStart = findQuyetDinhNTAttachmentStart(doc);
  if (!attachmentStart) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  let noteStarted = false;
  let noteEnded = false;
  const toRemove: Element[] = [];

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);
    const raw = normalizeText(text);
    const local = getLocalName(block);

    if (!noteStarted && isAttachmentNoteStartLine(text)) {
      noteStarted = true;
      noteEnded = raw.includes(')');
      continue;
    }

    if (noteStarted && !noteEnded) {
      if (raw.includes(')')) {
        noteEnded = true;
      }
      continue;
    }

    if (noteStarted && noteEnded) {
      if (isArticleLine(text) || isChapterLine(text)) {
        break;
      }

      if (
        isEmptyLine(text) ||
        (isDecorativeLine(text) && !isShortUnderlineParagraph(block)) ||
        (local === 'tbl' && isEmptyLine(text))
      ) {
        toRemove.push(block);
      }
    }
  }

  toRemove.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
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
      setParagraphSpacing(authorityBlock, '360', '0', '240');
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
      if (isArticleLine(text) || isChapterLine(text) || isAttachmentTitleLine(text)) {
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

  removeDecorativeBlocksBetweenAttachmentNoteAndContent(doc);

  attachmentStart = findQuyetDinhNTAttachmentStart(doc);
  if (!attachmentStart) return;

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

    if (isAttachmentTitleLine(text)) {
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

    const startsAttachmentNote =
      rawText.includes('(') &&
      normalizeForDetect(rawText).includes('BAN HANH KEM THEO');

    const endsAttachmentNote = rawText.includes(')');

    if (startsAttachmentNote || inParenthesizedAttachmentNote) {
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

const getQuyetDinhNTReceivers = (): string[] => {
  return [
    '- UBND xã Ea Kar',
    '- Phòng Văn hoá - Xã hội (b/c)',
    '- Lãnh đạo trường',
    '- Các Tổ chuyên môn',
    '- Các bộ phận liên quan',
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

  const receivers = getQuyetDinhNTReceivers();

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

export const insertQuyetDinhNTSignatureBlock = (
  doc: Document,
  options: any,
  docType: string
): boolean => {
  if (!isQuyetDinhNT(options, docType)) return false;

  const body = getBody(doc);
  if (!body) return false;

  const initialAttachmentStart = findQuyetDinhNTAttachmentStart(doc);

  if (initialAttachmentStart) {
    removeOldMainDecisionSignatureBeforeAttachment(doc, initialAttachmentStart);

    const attachmentAfterSignatureClean = findQuyetDinhNTAttachmentStart(doc);
    if (!attachmentAfterSignatureClean) return false;

    cleanQuyetDinhNTAttachmentHeader(doc, attachmentAfterSignatureClean);

    const attachmentAfterHeaderClean = findQuyetDinhNTAttachmentStart(doc);
    if (!attachmentAfterHeaderClean) return false;

    const signatureBlock = createQuyetDinhNTSignatureBlock(doc, options, docType);
    const pageBreakBeforeAttachment = createPageBreakParagraph(doc);
    const attachmentHeader = createQuyetDinhNTAttachmentStandardHeader(doc, options);

    body.insertBefore(signatureBlock, attachmentAfterHeaderClean);
    body.insertBefore(pageBreakBeforeAttachment, attachmentAfterHeaderClean);
    body.insertBefore(attachmentHeader, attachmentAfterHeaderClean);

    normalizeQuyetDinhNTAttachmentHeadings(doc);
    normalizeAttachmentUnderlineSpacing(doc);
    normalizeQuyetDinhNTMainHeadingSpacing(doc);

    return true;
  }

  const signatureBlock = createQuyetDinhNTSignatureBlock(doc, options, docType);
  insertBeforeSectPrOrAppend(doc, signatureBlock);

  normalizeQuyetDinhNTMainHeadingSpacing(doc);

  return true;
};