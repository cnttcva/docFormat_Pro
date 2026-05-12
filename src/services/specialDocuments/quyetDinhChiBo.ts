import {
  W_NS,
  getOrCreate,
  setAttr,
  forceBoldNode,
  forceParagraphBold
} from '../docUtils';

const HARD_CHI_BO_AUTHORITY_COMMAND_TEXT = 'CẤP ỦY CHI BỘ QUYẾT ĐỊNH';
const HARD_CHI_BO_AUTHORITY_COMMAND_TEXT_NORMALIZED = 'CAP UY CHI BO QUYET DINH';

const normalizeForDetect = (value: string): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Đđ]/g, match => (match === 'Đ' ? 'D' : 'd'))
    .replace(/[\u00A0\t\r\n]+/g, ' ')
    .replace(/[-_]+/g, match => (match.includes('-') ? '-' : ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const normalizeText = (value: string): string => {
  return String(value || '')
    .normalize('NFC')
    .replace(/[\u00A0\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const stripLeadingBulletForDetect = (text: string): string => {
  return normalizeForDetect(text)
    .replace(/^[-+*•–—\s]+/, '')
    .trim();
};

const toUpperVietnamese = (value: string): string => {
  return normalizeText(value).toUpperCase();
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

const isParagraph = (el: Element): boolean => getLocalName(el) === 'p';
const isTable = (el: Element): boolean => getLocalName(el) === 'tbl';
const isSectPr = (el: Element): boolean => getLocalName(el) === 'sectPr';

const isEmptyLine = (text: string): boolean => normalizeText(text).length === 0;

const isDecorativeLine = (text: string): boolean => {
  const t = normalizeForDetect(text).replace(/\s+/g, '');
  return /^[*._\-–—=]+$/.test(t);
};

const isPageNumberLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^[0-9]{1,3}$/.test(t);
};

const isSchoolLevelPartyOrganization = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.startsWith('DANG UY TRUONG') ||
    t.startsWith('DANG BO TRUONG') ||
    t.includes('DANG UY TRUONG PTTH') ||
    t.includes('DANG UY TRUONG THPT') ||
    t.includes('DANG BO TRUONG PTTH') ||
    t.includes('DANG BO TRUONG THPT')
  );
};

const isDangUySchoolDecision = (
  options: any,
  doc: Document,
  docType: string = ''
): boolean => {
  const type = normalizeForDetect(docType || '');
  const headerType = normalizeForDetect(String(options?.headerType || ''));
  const specialType = normalizeForDetect(String(options?.specialDocumentType || ''));
  const templateType = normalizeForDetect(String(options?.templateType || ''));
  const optionDocType = normalizeForDetect(String(options?.docType || ''));

  if (
    options?.isDangUySchoolDecision === true ||
    options?.isPartySchoolDecision === true ||
    headerType.includes('DANG UY TRUONG') ||
    headerType.includes('DANG BO TRUONG') ||
    specialType.includes('DANG UY TRUONG') ||
    specialType.includes('DANG BO TRUONG') ||
    templateType.includes('DANG UY TRUONG') ||
    templateType.includes('DANG BO TRUONG') ||
    optionDocType.includes('DANG UY TRUONG') ||
    optionDocType.includes('DANG BO TRUONG') ||
    type.includes('DANG UY TRUONG') ||
    type.includes('DANG BO TRUONG')
  ) {
    return true;
  }

  const body = getBody(doc);
  if (!body) return false;

  const sampleText = getDirectBodyBlocks(body)
    .slice(0, 50)
    .map(block => getText(block))
    .join(' ');

  const t = normalizeForDetect(sampleText);
  return (
    isSchoolLevelPartyOrganization(sampleText) ||
    t.includes('TRUONG PTTH') ||
    t.includes('TRUONG THPT')
  );
};

const isQuyetDinhChiBo = (
  options: any,
  docType: string,
  doc?: Document
): boolean => {
  const type = normalizeForDetect(docType || '');
  const headerType = normalizeForDetect(String(options?.headerType || ''));
  const specialType = normalizeForDetect(String(options?.specialDocumentType || ''));
  const templateType = normalizeForDetect(String(options?.templateType || ''));

  if (
    options?.isDecision === true &&
    (
      options?.isChiBoDecision === true ||
      options?.isPartyDecision === true ||
      specialType.includes('CHI BO') ||
      specialType.includes('CAP UY CHI BO') ||
      templateType.includes('CHI BO') ||
      headerType.includes('CHI BO') ||
      headerType.includes('DANG') ||
      type.includes('CHI BO') ||
      type.includes('CAP UY CHI BO') ||
      type.includes('DANG')
    )
  ) {
    return true;
  }

  if (
    options?.isChiBoDecision === true ||
    options?.isPartyDecision === true ||
    options?.isDangUySchoolDecision === true ||
    options?.isPartySchoolDecision === true ||
    specialType.includes('CHI BO') ||
    specialType.includes('CAP UY CHI BO') ||
    specialType.includes('DANG UY TRUONG') ||
    specialType.includes('DANG BO TRUONG') ||
    templateType.includes('CHI BO') ||
    templateType.includes('DANG UY TRUONG') ||
    templateType.includes('DANG BO TRUONG') ||
    headerType.includes('CHI BO') ||
    headerType.includes('DANG UY TRUONG') ||
    headerType.includes('DANG BO TRUONG') ||
    (
      type.includes('QUYET DINH') &&
      (
        type.includes('CHI BO') ||
        type.includes('CAP UY CHI BO') ||
        type.includes('DANG') ||
        type.includes('DANG BO') ||
        type.includes('DANG UY TRUONG') ||
        type.includes('DANG BO TRUONG')
      )
    )
  ) {
    return true;
  }

  if (doc) {
    const allText = normalizeForDetect(doc.documentElement?.textContent || '');
    if (
      allText.includes('CHI BO QUYET DINH') ||
      allText.includes('CAP UY CHI BO') ||
      allText.includes('CHI UY CHI BO') ||
      (
        allText.includes('DANG CONG SAN VIET NAM') &&
        allText.includes('CHI BO') &&
        allText.includes('QUYET DINH')
      )
    ) {
      return true;
    }

    if (isDangUySchoolDecision(options, doc, docType)) {
      return true;
    }
  }

  return false;
};

const isMainDecisionTitleLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t === 'QUYET DINH' || t === 'QUYET DINH:' || t === 'QUYET DINH.';
};

const isDecisionLegalBasisLine = (text: string): boolean => {
  const t = stripLeadingBulletForDetect(text);

  return (
    t.startsWith('CAN CU') ||
    t.startsWith('XET') ||
    t.startsWith('THEO') ||
    t.startsWith('THUC HIEN')
  );
};

const isArticleLine = (text: string): boolean => {
  const t = stripLeadingBulletForDetect(text);
  return /^DIEU\s+\d+[\.:]/.test(t) || /^DIEU\s+\d+\s+/.test(t);
};

const getArticleNumber = (text: string): number | null => {
  const t = stripLeadingBulletForDetect(text);
  const match = t.match(/^DIEU\s+(\d+)/);
  if (!match?.[1]) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const isDecisionSummaryLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t.startsWith('V/V') || t.startsWith('VE VIEC') || t.startsWith('BAN HANH');
};

const isNoiNhanLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return t === 'NOI NHAN:' || t === 'NOI NHAN' || t.startsWith('NOI NHAN:');
};

const isSignerLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('BI THU') ||
    t.includes('PHO BI THU') ||
    t.includes('CHI UY') ||
    t.startsWith('TM.') ||
    t.startsWith('T/M ')
  );
};

const isReceiverItemLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  return raw.startsWith('-') || raw.startsWith('+') || t.startsWith('LUU:');
};

const isSchoolPartyAuthorityLine = (text: string): boolean => {
  return isSchoolLevelPartyOrganization(text);
};

const isDecisionAuthorityLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t === HARD_CHI_BO_AUTHORITY_COMMAND_TEXT_NORMALIZED ||
    t === 'CAP UY CHI BO' ||
    t === 'CAP UY CHI BO QUYET DINH' ||
    t.startsWith('CAP UY CHI BO') ||
    t.startsWith('CHI UY') ||
    t.startsWith('BAN CHI UY') ||
    t.startsWith('CHI BO') ||
    t.startsWith('DANG UY TRUONG') ||
    t.startsWith('DANG BO TRUONG')
  );
};

const isPartyHeaderLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('DANG CONG SAN VIET NAM') ||
    t.includes('DANG BO') ||
    t.includes('CHI BO') ||
    t.includes('DANG UY')
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

const isMainDecisionEndingText = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('CAN CU QUYET DINH THI HANH') ||
    t.includes('CAN CU QUYET DINH NAY THI HANH') ||
    t.includes('CHIU TRACH NHIEM THI HANH QUYET DINH NAY') ||
    t.includes('CHIU TRACH NHIEM THI HANH QUYET DINH') ||
    t.includes('CHIU TRACH NHIEM THI HANH') ||
    t.includes('QUYET DINH NAY CO HIEU LUC') ||
    t.includes('CO HIEU LUC KE TU NGAY KY') ||
    t.includes('CO HIEU LUC TU NGAY KY') ||
    t.includes('KE TU NGAY KY') ||
    t.includes('THI HANH QUYET DINH NAY') ||
    t.includes('THI HANH QUYET DINH')
  );
};

const isOrphanEffectiveLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t === 'QUYET DINH CO HIEU LUC KE TU NGAY KY./.' ||
    t === 'QUYET DINH CO HIEU LUC KE TU NGAY KY' ||
    t.startsWith('CO HIEU LUC KE TU NGAY KY') ||
    t.startsWith('CO HIEU LUC TU NGAY KY') ||
    t.startsWith('QUYET DINH CO HIEU LUC') ||
    t.startsWith('QUYET DINH NAY CO HIEU LUC')
  );
};

const isAttachmentNoteStartLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(text);

  return (
    raw.includes('(') &&
    t.includes('BAN HANH KEM THEO') &&
    t.includes('QUYET DINH')
  );
};

const isMainDecisionAttachmentNoteLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(raw);

  return (
    raw.startsWith('(') &&
    raw.endsWith(')') &&
    (
      t.includes('CO BAN QUY CHE KEM THEO') ||
      t.includes('CO QUY CHE KEM THEO') ||
      t.includes('CO BAN QUY DINH KEM THEO') ||
      t.includes('CO QUY DINH KEM THEO') ||
      t.includes('CO PHU LUC KEM THEO')
    )
  );
};

const isAttachmentTitleLine = (text: string): boolean => {
  const t = normalizeForDetect(text);

  if (!t) return false;
  if (isArticleLine(text)) return false;
  if (isDecisionLegalBasisLine(text)) return false;

  const titles = [
    'QUY CHE',
    'QUY DINH',
    'DANH SACH',
    'PHU LUC',
    'KE HOACH',
    'CHUONG TRINH',
    'BAO CAO',
    'NGHI QUYET',
    'NOI QUY'
  ];

  return titles.some(title => t === title || t.startsWith(`${title} `));
};

const isLikelyGenericAttachmentTitleBlock = (block: Element): boolean => {
  if (!isParagraph(block)) return false;

  const raw = getText(block);
  const t = normalizeForDetect(raw);

  if (!raw) return false;
  if (raw.length < 5 || raw.length > 220) return false;
  if (isMainDecisionTitleLine(raw)) return false;
  if (isArticleLine(raw)) return false;
  if (isNoiNhanLine(raw)) return false;
  if (isSignerLine(raw)) return false;
  if (isDateLine(raw)) return false;
  if (isPartyHeaderLine(raw)) return false;
  if (t.startsWith('V/V') || t.startsWith('VE VIEC')) return false;

  const letters = raw.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  const isMostlyUppercase =
    letters.length >= 4 &&
    letters === letters.toUpperCase();

  return isAttachmentTitleLine(raw) || isMostlyUppercase;
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
  if (!isTable(block)) return false;

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

const getBodySectPr = (body: Element): Element | null => {
  const children = Array.from(body.childNodes);

  for (let i = children.length - 1; i >= 0; i--) {
    const node = children[i];
    if (node.nodeType !== 1) continue;

    const el = node as Element;
    if (isSectPr(el)) return el;
  }

  return null;
};

const insertBeforeSectPrOrAppendToBody = (body: Element, node: Node): void => {
  const sectPr = getBodySectPr(body);

  if (sectPr) {
    body.insertBefore(node, sectPr);
  } else {
    body.appendChild(node);
  }
};

const insertBeforeSectPrOrAppend = (doc: Document, el: Element): void => {
  const body = getBody(doc);
  if (!body) return;

  insertBeforeSectPrOrAppendToBody(body, el);
};

const removeNodeIfChildOf = (parent: Element, node: Node | null | undefined): void => {
  if (node && node.parentNode === parent) {
    parent.removeChild(node);
  }
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

const clearParagraphContentKeepPPr = (p: Element): Element => {
  let pPr = Array.from(p.childNodes).find(
    node => node.nodeType === 1 && getLocalName(node as Element) === 'pPr'
  ) as Element | undefined;

  if (!pPr) {
    pPr = p.ownerDocument.createElementNS(W_NS, 'w:pPr');
  }

  while (p.firstChild) {
    p.removeChild(p.firstChild);
  }

  p.appendChild(pPr);
  return pPr;
};

const hardResetParagraphAsSingleRun = (
  doc: Document,
  p: Element,
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right' | 'both';
    size?: number;
    before?: string;
    after?: string;
    line?: string;
    firstLine?: string;
    left?: string;
    hanging?: string;
  } = {}
): void => {
  const cleanText = normalizeText(text);
  const pPr = clearParagraphContentKeepPPr(p);

  const jc = getOrCreate(pPr, 'w:jc');
  setAttr(jc, 'val', options.align || 'both');

  const ind = getOrCreate(pPr, 'w:ind');
  setAttr(ind, 'left', options.left || '0');
  setAttr(ind, 'right', '0');

  if (options.hanging) {
    setAttr(ind, 'hanging', options.hanging);
  } else {
    setAttr(ind, 'firstLine', options.firstLine || '0');
    ind.removeAttribute('w:hanging');
  }

  setParagraphSpacing(
    p,
    options.before ?? '0',
    options.after ?? '0',
    options.line ?? '240'
  );

  if (options.bold) {
    forceParagraphBold(pPr);
  }

  const r = doc.createElementNS(W_NS, 'w:r');
  const rPr = getOrCreate(r, 'w:rPr');

  const sizeVal = String((options.size || 14) * 2);
  const sz = getOrCreate(rPr, 'w:sz');
  setAttr(sz, 'val', sizeVal);

  const szCs = getOrCreate(rPr, 'w:szCs');
  setAttr(szCs, 'val', sizeVal);

  if (options.bold) {
    forceBoldNode(rPr);
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

  const t = doc.createElementNS(W_NS, 'w:t');
  t.textContent = cleanText;
  r.appendChild(t);
  p.appendChild(r);
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
    before?: string;
    after?: string;
    line?: string;
  } = {}
): Element => {
  const p = doc.createElementNS(W_NS, 'w:p');
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

  setParagraphSpacing(
    p,
    options.before ?? '0',
    options.after ?? '0',
    options.line ?? '240'
  );

  const r = doc.createElementNS(W_NS, 'w:r');
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

  const t = doc.createElementNS(W_NS, 'w:t');
  t.textContent = text;
  r.appendChild(t);

  return p;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .replace(',', '.')
    .replace(/[^\d.\-]/g, '')
    .trim();

  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toTwipsFromCm = (cm: number): string => {
  return String(Math.round(cm * 567));
};

const resolveBodyFontSize = (options: any): number => {
  const size = [
    options?.fontSize,
    options?.paragraphFontSize,
    options?.bodyFontSize,
    options?.contentFontSize,
    options?.defaultFontSize,
    options?.mainFontSize
  ]
    .map(toNumber)
    .find(value => value !== null && value > 0);

  return size && size > 0 ? size : 14;
};

const resolveBodyLineTwips = (options: any): string => {
  const lineTwips = [
    options?.paragraphLineTwips,
    options?.bodyLineTwips,
    options?.lineTwips
  ]
    .map(toNumber)
    .find(value => value !== null && value > 0);

  if (lineTwips && lineTwips > 0) {
    return String(Math.round(lineTwips));
  }

  const lineMultiple = [
    options?.lineSpacing,
    options?.paragraphLineSpacing,
    options?.bodyLineSpacing,
    options?.lines
  ]
    .map(toNumber)
    .find(value => value !== null && value > 0);

  const effective = lineMultiple && lineMultiple > 0 ? lineMultiple : 1.15;
  return String(Math.round(effective * 240));
};

const resolveBodyFirstLineTwips = (options: any): string => {
  const twipsDirect = [
    options?.firstLineTwips,
    options?.paragraphFirstLineTwips,
    options?.bodyFirstLineTwips
  ]
    .map(toNumber)
    .find(value => value !== null && value > 0);

  if (twipsDirect && twipsDirect > 0) {
    return String(Math.round(twipsDirect));
  }

  const fromUi = [
    options?.firstLineIndentCm,
    options?.paragraphFirstLineIndentCm,
    options?.bodyFirstLineIndentCm,
    options?.firstLineIndent,
    options?.paragraphFirstLineIndent,
    options?.indentFirstLine,
    options?.firstLine
  ]
    .map(toNumber)
    .find(value => value !== null && value > 0);

  if (fromUi && fromUi > 0) {
    if (fromUi > 100) {
      return String(Math.round(fromUi));
    }
    return toTwipsFromCm(fromUi);
  }

  return '720';
};

const getBodyFormatSpec = (options: any): {
  size: number;
  line: string;
  firstLine: string;
} => {
  return {
    size: resolveBodyFontSize(options),
    line: resolveBodyLineTwips(options),
    firstLine: resolveBodyFirstLineTwips(options)
  };
};

const createPageBreakParagraph = (doc: Document): Element => {
  const p = doc.createElementNS(W_NS, 'w:p');
  const pPr = getOrCreate(p, 'w:pPr');

  setParagraphSpacing(p, '0', '0', '240');

  const r = doc.createElementNS(W_NS, 'w:r');
  const br = doc.createElementNS(W_NS, 'w:br');
  setAttr(br, 'type', 'page');

  r.appendChild(br);
  p.appendChild(r);

  return p;
};

const createLineTable = (
  doc: Document,
  widthTwips: string,
  borderSize: string = '6'
): Element => {
  const tbl = doc.createElementNS(W_NS, 'w:tbl');
  const tblPr = getOrCreate(tbl, 'w:tblPr');

  const jcTbl = getOrCreate(tblPr, 'w:jc');
  setAttr(jcTbl, 'val', 'center');

  const tblW = getOrCreate(tblPr, 'w:tblW');
  setAttr(tblW, 'w', widthTwips);
  setAttr(tblW, 'type', 'dxa');

  const tblLayout = getOrCreate(tblPr, 'w:tblLayout');
  setAttr(tblLayout, 'type', 'fixed');

  const tblGrid = getOrCreate(tbl, 'w:tblGrid');
  const gridCol = doc.createElementNS(W_NS, 'w:gridCol');
  setAttr(gridCol, 'w', widthTwips);
  tblGrid.appendChild(gridCol);

  const tr = doc.createElementNS(W_NS, 'w:tr');
  tbl.appendChild(tr);

  const tc = doc.createElementNS(W_NS, 'w:tc');
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

  const p = doc.createElementNS(W_NS, 'w:p');
  tc.appendChild(p);
  setParagraphSpacing(p, '0', '0', '24');

  return tbl;
};

const createTwoColumnHeaderTable = (
  doc: Document,
  leftLines: string[],
  rightLines: string[]
): Element => {
  const tbl = doc.createElementNS(W_NS, 'w:tbl');
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

  const col1 = doc.createElementNS(W_NS, 'w:gridCol');
  setAttr(col1, 'w', '4600');
  tblGrid.appendChild(col1);

  const col2 = doc.createElementNS(W_NS, 'w:gridCol');
  setAttr(col2, 'w', '4750');
  tblGrid.appendChild(col2);

  const tr = doc.createElementNS(W_NS, 'w:tr');
  tbl.appendChild(tr);

  const createCell = (width: string): Element => {
    const tc = doc.createElementNS(W_NS, 'w:tc');
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

  const tc1 = createCell('4600');
  const tc2 = createCell('4750');

  tr.appendChild(tc1);
  tr.appendChild(tc2);

  leftLines.forEach((line, index) => {
    tc1.appendChild(createP(doc, line, {
      bold: index !== 0,
      align: 'center',
      size: 13,
      before: '0',
      after: '0'
    }));
  });

  tc1.appendChild(createP(doc, '*', {
    bold: true,
    align: 'center',
    size: 13,
    before: '0',
    after: '0'
  }));

  rightLines.forEach((line, index) => {
    tc2.appendChild(createP(doc, line, {
      bold: true,
      align: 'center',
      size: 15,
      before: '0',
      after: '0'
    }));

    if (index === rightLines.length - 1) {
      tc2.appendChild(createLineTable(doc, '3600', '4'));
    }
  });

  return tbl;
};

const normalizeParentPartyBodyLine = (value: string): string => {
  const clean = toUpperVietnamese(value)
    .replace(/\s+/g, ' ')
    .trim();

  return clean
    .replace(/^ĐẢNG\s+ỦY\s+(XÃ|PHƯỜNG|THỊ TRẤN)\s+/i, 'ĐẢNG BỘ $1 ')
    .replace(/^ĐẢNG\s+UỶ\s+(XÃ|PHƯỜNG|THỊ TRẤN)\s+/i, 'ĐẢNG BỘ $1 ')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitChiBoHeaderLines = (chiBoText: string): string[] => {
  const clean = toUpperVietnamese(chiBoText)
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return [];

  const schoolPrefixMatch = clean.match(
    /^(CHI BỘ\s+TRƯỜNG\s+(?:THCS|THPT|PTTH|TH\s*&\s*THCS|TH\s*-\s*THCS|TIỂU HỌC|TH|MẦM NON|MN|TRUNG HỌC CƠ SỞ|TRUNG HỌC PHỔ THÔNG))\s+(.+)$/i
  );

  if (schoolPrefixMatch?.[1] && schoolPrefixMatch?.[2]) {
    return [
      schoolPrefixMatch[1].replace(/\s+/g, ' ').trim().toUpperCase(),
      schoolPrefixMatch[2].replace(/\s+/g, ' ').trim().toUpperCase()
    ];
  }

  const normalized = normalizeForDetect(clean);
  if (normalized.length <= 34) return [clean];

  const words = clean.split(' ');
  if (words.length >= 4) {
    const properName = words.slice(-3).join(' ');
    const prefix = words.slice(0, -3).join(' ');
    return [prefix, properName].filter(Boolean);
  }

  return [clean];
};

export const createQuyetDinhChiBoAttachmentStandardHeader = (
  doc: Document,
  options: any
): Element => {
  const org = options?.partyOrgInfo || options?.orgInfo || {};

  const dangBo = normalizeParentPartyBodyLine(String(
    org.dangBo ||
    org.governingPartyBody ||
    org.dangUyTruong ||
    'ĐẢNG BỘ XÃ EA KAR'
  ));

  const chiBo = String(
    org.chiBo ||
    org.partyCellName ||
    org.partyUnitName ||
    'CHI BỘ TRƯỜNG THCS CHU VĂN AN'
  ).toUpperCase();

  return createTwoColumnHeaderTable(
    doc,
    [dangBo, ...splitChiBoHeaderLines(chiBo)],
    ['ĐẢNG CỘNG SẢN VIỆT NAM']
  );
};

const cleanSignerTitle = (title: string): string => {
  const t = normalizeForDetect(title || '');

  if (!t) return '';
  if (t.includes('PHO BI THU')) return 'PHÓ BÍ THƯ';
  if (t.includes('BI THU')) return 'BÍ THƯ';
  if (t.includes('CHI UY VIEN')) return 'CHI ỦY VIÊN';

  return normalizeText(title).toUpperCase();
};

const cleanSignerName = (name: string): string => {
  if (!name) return '';

  return normalizeText(name)
    .replace(/[\.,;]+$/, '')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getMainDecisionExecutionArticleNumber = (doc: Document): string => {
  const body = getBody(doc);
  if (!body) return '2';

  const blocks = getDirectBodyBlocks(body);
  let commandSeen = false;
  let lastArticleNumber = '2';
  let foundExecutionArticle = '';

  for (const block of blocks) {
    const text = getText(block);
    if (!text) continue;

    if (!commandSeen && isDecisionAuthorityLine(text)) {
      commandSeen = true;
      continue;
    }

    if (!commandSeen) continue;
    if (isNoiNhanLine(text) || isSignerLine(text)) break;
    if (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text)) break;

    const articleNo = getArticleNumber(text);
    if (articleNo !== null) {
      lastArticleNumber = String(articleNo);
    }

    const t = normalizeForDetect(text);
    if (
      t.includes('CHIU TRACH NHIEM THI HANH') ||
      t.includes('CAN CU QUYET DINH NAY THI HANH')
    ) {
      foundExecutionArticle = String(articleNo || lastArticleNumber);
    }
  }

  return foundExecutionArticle || lastArticleNumber;
};

const hasAutoArticleReceiver = (receivers: unknown[]): boolean => {
  return receivers.some(item => {
    const t = normalizeForDetect(String(item || ''));
    return t.includes('NHU DIEU');
  });
};

const getQuyetDinhChiBoReceivers = (
  options: any,
  doc: Document,
  forcedArticleNumber?: string
): string[] => {
  const optionReceivers = Array.isArray(options?.receivers)
    ? options.receivers.map((item: unknown) => String(item || '')).filter(Boolean)
    : [];

  if (optionReceivers.length > 0 && !hasAutoArticleReceiver(optionReceivers)) {
    return optionReceivers;
  }

  const executionArticleNumber =
    forcedArticleNumber || getMainDecisionExecutionArticleNumber(doc);

  return [
    '- Đảng ủy (để báo cáo)',
    '- UBKT Đảng ủy (để báo cáo)',
    `- Như Điều ${executionArticleNumber} (thực hiện)`,
    '- Lưu Chi bộ'
  ];
};

const normalizeReceiverEnd = (text: string, index: number, total: number): string => {
  const cleanText = normalizeText(text).replace(/[\.,;]+$/, '');
  if (!cleanText) return cleanText;

  return index === total - 1 ? `${cleanText}.` : `${cleanText};`;
};

export const createQuyetDinhChiBoSignatureBlock = (
  doc: Document,
  options: any,
  _docType: string
): Element => {
  const tbl = doc.createElementNS(W_NS, 'w:tbl');
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

  const col1 = doc.createElementNS(W_NS, 'w:gridCol');
  setAttr(col1, 'w', '3800');
  tblGrid.appendChild(col1);

  const col2 = doc.createElementNS(W_NS, 'w:gridCol');
  setAttr(col2, 'w', '5550');
  tblGrid.appendChild(col2);

  const tr = doc.createElementNS(W_NS, 'w:tr');
  tbl.appendChild(tr);

  const createCell = (width: string): Element => {
    const tc = doc.createElementNS(W_NS, 'w:tc');
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
  const tc2 = createCell('5550');

  tr.appendChild(tc1);
  tr.appendChild(tc2);

  tc1.appendChild(createP(doc, 'Nơi nhận:', {
    underline: true,
    align: 'left',
    size: 14,
    before: '240'
  }));

  const receivers = getQuyetDinhChiBoReceivers(
    options,
    doc,
    String(options?.receiverArticleNumber || '')
  );

  receivers.forEach((receiver, index) => {
    tc1.appendChild(createP(doc, normalizeReceiverEnd(receiver, index, receivers.length), {
      align: 'left',
      size: 12,
      left: '340',
      hanging: '340'
    }));
  });

  const signerTitle = cleanSignerTitle(options?.signerTitle) || 'BÍ THƯ';
  const signerName = cleanSignerName(options?.signerName);
  const signerAuthority = isDangUySchoolDecision(options, doc, _docType) ? 'T/M ĐẢNG ỦY' : 'T/M CHI BỘ';

  tc2.appendChild(createP(doc, signerAuthority, {
    bold: true,
    align: 'center',
    size: 14,
    before: '240'
  }));

  tc2.appendChild(createP(doc, signerTitle, {
    bold: true,
    align: 'center',
    size: 14
  }));

  for (let i = 0; i < 4; i++) {
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

const normalizeMainDecisionTitleAndSummary = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  let titleIndex = -1;
  let firstLegalIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (titleIndex < 0 && isMainDecisionTitleLine(text)) {
      titleIndex = i;
      continue;
    }

    if (titleIndex >= 0 && isDecisionLegalBasisLine(text)) {
      firstLegalIndex = i;
      break;
    }
  }

  if (titleIndex < 0 || firstLegalIndex < 0) return;

  const titleBlock = blocks[titleIndex];
  hardResetParagraphAsSingleRun(doc, titleBlock, 'QUYẾT ĐỊNH', {
    bold: true,
    align: 'center',
    size: 15,
    before: '240',
    after: '0',
    line: '240',
    firstLine: '0',
    left: '0'
  });

  const summaryBlocks: Element[] = [];
  const decorativeBlocks: Element[] = [];

  for (let i = titleIndex + 1; i < firstLegalIndex; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text || isEmptyLine(text)) continue;

    if (isDecorativeLine(text)) {
      decorativeBlocks.push(block);
      continue;
    }

    summaryBlocks.push(block);
  }

  summaryBlocks.forEach((block, index) => {
    hardResetParagraphAsSingleRun(doc, block, getText(block), {
      bold: true,
      align: 'center',
      size: 14,
      before: '0',
      after: index === summaryBlocks.length - 1 ? '0' : '0',
      line: '240',
      firstLine: '0',
      left: '0'
    });
  });

  decorativeBlocks.forEach(block => removeNodeIfChildOf(body, block));

  const freshBlocks = getDirectBodyBlocks(body);
  const freshFirstLegal = freshBlocks.find(block => isParagraph(block) && isDecisionLegalBasisLine(getText(block)));
  if (!freshFirstLegal) return;

  const separator = createP(doc, '-----', {
    align: 'center',
    size: 14,
    before: '0',
    after: '120',
    firstLine: '0',
    left: '0'
  });

  body.insertBefore(separator, freshFirstLegal);
};

const ensureLeadingDash = (text: string): string => {
  const clean = normalizeText(text);
  if (/^[-+*•–—]\s*/.test(clean)) {
    return clean.replace(/^[-+*•–—]\s*/, '- ');
  }

  return `- ${clean}`;
};

const normalizeLegalBasisPunctuation = (text: string, isLastLegalLine: boolean): string => {
  const clean = ensureLeadingDash(text).replace(/[\.,;]+$/, '').trim();
  return `${clean}${isLastLegalLine ? ',' : ';'}`;
};

const normalizeLegalBasisLines = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const legalIndexes: number[] = [];
  let titleSeen = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (!titleSeen && isMainDecisionTitleLine(text)) {
      titleSeen = true;
      continue;
    }

    if (!titleSeen) continue;

    if (isDecisionLegalBasisLine(text)) {
      legalIndexes.push(i);
      continue;
    }

    if (legalIndexes.length > 0 && (isDecisionAuthorityLine(text) || isArticleLine(text))) {
      break;
    }
  }

  legalIndexes.forEach((blockIndex, index) => {
    const block = blocks[blockIndex];
    const isLast = index === legalIndexes.length - 1;
    const normalized = normalizeLegalBasisPunctuation(getText(block), isLast);

    hardResetParagraphAsSingleRun(doc, block, normalized, {
      align: 'both',
      size: 14,
      before: '0',
      after: '120',
      line: '240',
      firstLine: '720',
      left: '0'
    });
  });
};

const cleanupAuthorityLineForSchoolParty = (text: string): string => {
  const cleaned = normalizeText(text)
    .replace(/\bQUYẾT\s*ĐỊNH\b/giu, '')
    .replace(/\bQUYET\s*DINH\b/giu, '')
    .replace(/\s+/g, ' ')
    .trim();

  return toUpperVietnamese(cleaned);
};

const getDangUySchoolAuthorityText = (
  options: any,
  detectedText: string
): string => {
  if (detectedText) {
    return cleanupAuthorityLineForSchoolParty(detectedText);
  }

  const org = options?.partyOrgInfo || options?.orgInfo || {};

  const fromOptions = String(
    options?.partyAuthorityText ||
    options?.authorityLineText ||
    org.dangUyTruong ||
    org.partySchoolCommittee ||
    org.schoolPartyCommitteeName ||
    org.dangBoTruong ||
    'ĐẢNG ỦY TRƯỜNG PTTH'
  );

  return toUpperVietnamese(fromOptions);
};

const normalizeAuthorityCommandZone = (
  doc: Document,
  options: any,
  docType: string
): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  let firstDecisionTitleIndex = -1;
  let lastLegalBasisIndex = -1;
  let firstArticleIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (firstDecisionTitleIndex < 0 && isMainDecisionTitleLine(text)) {
      firstDecisionTitleIndex = i;
      continue;
    }

    if (firstDecisionTitleIndex < 0) continue;

    if (isDecisionLegalBasisLine(text)) {
      lastLegalBasisIndex = i;
      continue;
    }

    if (lastLegalBasisIndex >= 0 && isArticleLine(text)) {
      firstArticleIndex = i;
      break;
    }
  }

  if (lastLegalBasisIndex < 0 || firstArticleIndex < 0) return;

  const zoneBlocks = blocks
    .slice(lastLegalBasisIndex + 1, firstArticleIndex)
    .filter(block => isParagraph(block));

  const meaningfulZoneBlocks = zoneBlocks.filter(block => {
    const text = getText(block);
    return text && !isEmptyLine(text) && !isDecorativeLine(text);
  });

  const isSchoolParty =
    isDangUySchoolDecision(options, doc, docType) ||
    meaningfulZoneBlocks.some(block => isSchoolPartyAuthorityLine(getText(block)));

  const insertBeforeBlock = blocks[firstArticleIndex];

  if (isSchoolParty) {
    const schoolAuthorityBlock = meaningfulZoneBlocks.find(block => {
      const text = getText(block);
      const t = normalizeForDetect(text);

      return (
        isSchoolPartyAuthorityLine(text) ||
        t.includes('DANG UY TRUONG') ||
        t.includes('DANG BO TRUONG')
      );
    });

    const detectedSchoolAuthorityText = schoolAuthorityBlock
      ? cleanupAuthorityLineForSchoolParty(getText(schoolAuthorityBlock))
      : '';

    const authorityText = getDangUySchoolAuthorityText(options, detectedSchoolAuthorityText);

    const p1 = createP(doc, authorityText, {
      bold: true,
      align: 'center',
      size: 14,
      firstLine: '0',
      left: '0',
      before: '360',
      after: '0'
    });

    const p2 = createP(doc, 'QUYẾT ĐỊNH', {
      bold: false,
      align: 'center',
      size: 14,
      firstLine: '0',
      left: '0',
      before: '0',
      after: '240'
    });

    body.insertBefore(p1, insertBeforeBlock);
    body.insertBefore(p2, insertBeforeBlock);
  } else {
    const hardParagraph = createP(doc, HARD_CHI_BO_AUTHORITY_COMMAND_TEXT, {
      bold: true,
      align: 'center',
      size: 14,
      firstLine: '0',
      left: '0',
      before: '240',
      after: '240'
    });

    body.insertBefore(hardParagraph, insertBeforeBlock);
  }

  zoneBlocks.forEach(block => removeNodeIfChildOf(body, block));
};

const getMaxArticleNumberBeforeIndex = (blocks: Element[], endIndex: number): number => {
  let max = 0;

  for (let i = 0; i < endIndex; i++) {
    const text = getText(blocks[i]);
    const articleNo = getArticleNumber(text);
    if (articleNo !== null && articleNo > max) {
      max = articleNo;
    }
  }

  return max;
};

const normalizeEffectText = (text: string): string => {
  const t = normalizeForDetect(text);

  if (t.includes('CO HIEU LUC KE TU NGAY KY') || t.includes('CO HIEU LUC TU NGAY KY')) {
    return 'Quyết định này có hiệu lực kể từ ngày ký./.';
  }

  return normalizeText(text)
    .replace(/^QUYẾT\s*ĐỊNH\s*/i, 'Quyết định này ')
    .replace(/^QUYET\s*DINH\s*/i, 'Quyết định này ')
    .trim();
};

const normalizeOrphanEffectiveArticle = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  let blocks = getDirectBodyBlocks(body);
  let commandSeen = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (!commandSeen && isDecisionAuthorityLine(text)) {
      commandSeen = true;
      continue;
    }

    if (!commandSeen) continue;

    if (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text)) {
      break;
    }

    const next = blocks[i + 1];
    const nextText = next && isParagraph(next) ? getText(next) : '';

    if (isMainDecisionTitleLine(text) && nextText && isOrphanEffectiveLine(nextText)) {
      const nextArticleNumber = getMaxArticleNumberBeforeIndex(blocks, i) + 1;
      const articleText = `Điều ${nextArticleNumber}. ${normalizeEffectText(nextText)}`;

      hardResetParagraphAsSingleRun(doc, block, articleText, {
        bold: false,
        align: 'both',
        size: 14,
        before: '0',
        after: '0',
        firstLine: '720',
        left: '0'
      });

      removeNodeIfChildOf(body, next);
      blocks = getDirectBodyBlocks(body);
      return;
    }

    if (isOrphanEffectiveLine(text) && !isArticleLine(text)) {
      const nextArticleNumber = getMaxArticleNumberBeforeIndex(blocks, i) + 1;
      const articleText = `Điều ${nextArticleNumber}. ${normalizeEffectText(text)}`;

      hardResetParagraphAsSingleRun(doc, block, articleText, {
        bold: false,
        align: 'both',
        size: 14,
        before: '0',
        after: '0',
        firstLine: '720',
        left: '0'
      });

      return;
    }
  }
};

const findMainDecisionEndingIndex = (doc: Document): number => {
  const body = getBody(doc);
  if (!body) return -1;

  const blocks = getDirectBodyBlocks(body);
  let commandSeen = false;
  let lastArticleIndex = -1;
  let lastEndingIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (!commandSeen && isDecisionAuthorityLine(text)) {
      commandSeen = true;
      continue;
    }

    if (!commandSeen) continue;

    if (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text)) {
      break;
    }

    if (isArticleLine(text)) {
      lastArticleIndex = i;
    }

    if (isMainDecisionEndingText(text)) {
      lastEndingIndex = i;
    }
  }

  return lastEndingIndex >= 0 ? lastEndingIndex : lastArticleIndex;
};

const findAttachmentStartAfterDecisionEnding = (doc: Document): Element | null => {
  const body = getBody(doc);
  if (!body) return null;

  const blocks = getDirectBodyBlocks(body);
  const endingIndex = findMainDecisionEndingIndex(doc);

  if (endingIndex < 0) return null;

  for (let i = endingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    const text = getText(block);

    if (isSectPr(block)) break;
    if (!text || isEmptyLine(text) || isDecorativeLine(text) || isPageNumberLine(text)) continue;
    if (isNoiNhanLine(text) || isSignerLine(text) || isReceiverItemLine(text)) continue;

    if (isParagraph(block)) {
      if (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text) || isLikelyGenericAttachmentTitleBlock(block)) {
        return block;
      }
    }

    if (isTable(block) && isLikelyDataTableBlock(block)) {
      return block;
    }
  }

  return null;
};

export const findQuyetDinhChiBoAttachmentStart = (doc: Document): Element | null => {
  return findAttachmentStartAfterDecisionEnding(doc);
};

const extractBodyBlocksFrom = (
  doc: Document,
  _body: Element,
  start: Element
): DocumentFragment => {
  const fragment = doc.createDocumentFragment();

  let node: ChildNode | null = start;

  while (node) {
    const next = node.nextSibling;

    if (node.nodeType === 1 && isSectPr(node as Element)) {
      break;
    }

    fragment.appendChild(node);
    node = next;
  }

  return fragment;
};

const removeExistingSignatureAndReceivers = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  let blocks = getDirectBodyBlocks(body);

  blocks.forEach(block => {
    if (!isTable(block)) return;
    const text = normalizeForDetect(getText(block));
    if (text.includes('NOI NHAN') || text.includes('T/M CHI BO') || text.includes('TM. CHI BO')) {
      removeNodeIfChildOf(body, block);
    }
  });

  blocks = getDirectBodyBlocks(body);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!isNoiNhanLine(text) && !normalizeForDetect(text).includes('T/M CHI BO')) continue;

    let endExclusive = blocks.length;

    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j];
      if (isSectPr(next)) {
        endExclusive = j;
        break;
      }

      const nextText = getText(next);
      if (isAttachmentTitleLine(nextText) || isAttachmentNoteStartLine(nextText)) {
        endExclusive = j;
        break;
      }
    }

    for (let j = i; j < endExclusive; j++) {
      removeNodeIfChildOf(body, blocks[j]);
    }

    break;
  }
};

const isChapterLine = (text: string): boolean => {
  const t = normalizeForDetect(text);
  return /^CHUONG\s+[IVXLCDM0-9]+/.test(t);
};

const isLikelyChapterTitleLine = (text: string): boolean => {
  const raw = normalizeText(text);
  const t = normalizeForDetect(raw);

  if (!raw) return false;
  if (isChapterLine(raw)) return false;
  if (isArticleLine(raw)) return false;
  if (isAttachmentTitleLine(raw)) return false;
  if (isAttachmentNoteStartLine(raw)) return false;
  if (isNoiNhanLine(raw)) return false;
  if (isSignerLine(raw)) return false;
  if (t.length > 220) return false;

  const letters = raw.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  const isMostlyUppercase = letters.length >= 4 && letters === letters.toUpperCase();

  const looksLikeShortTitle =
    raw.length >= 6 &&
    raw.length <= 180 &&
    !/[.;:]$/.test(raw) &&
    !/^[-+*•–—]/.test(raw) &&
    !t.startsWith('CAN CU') &&
    !t.startsWith('XET') &&
    !t.startsWith('THEO') &&
    !t.startsWith('THUC HIEN');

  return isMostlyUppercase || looksLikeShortTitle;
};

const isAttachmentRegulationEndingText = (text: string): boolean => {
  const t = normalizeForDetect(text);

  return (
    t.includes('QUY CHE NAY CO HIEU LUC KE TU NGAY KY') ||
    t.includes('QUY DINH NAY CO HIEU LUC KE TU NGAY KY') ||
    t.includes('NOI QUY NAY CO HIEU LUC KE TU NGAY KY') ||
    t.includes('CO HIEU LUC KE TU NGAY KY./.') ||
    t.includes('CO HIEU LUC KE TU NGAY KY') ||
    t.includes('CHIU TRACH NHIEM THI HANH QUY CHE NAY') ||
    t.includes('CHIU TRACH NHIEM THI HANH QUY DINH NAY') ||
    t.includes('CHIU TRACH NHIEM THI HANH NOI QUY NAY')
  );
};

const normalizeAttachmentRegulationEndingSentence = (text: string): string => {
  const t = normalizeForDetect(text);

  if (t.includes('QUY DINH NAY CO HIEU LUC KE TU NGAY KY')) {
    return 'Quy định này có hiệu lực kể từ ngày ký./.';
  }

  if (t.includes('NOI QUY NAY CO HIEU LUC KE TU NGAY KY')) {
    return 'Nội quy này có hiệu lực kể từ ngày ký./.';
  }

  if (t.includes('QUY CHE NAY CO HIEU LUC KE TU NGAY KY')) {
    return 'Quy chế này có hiệu lực kể từ ngày ký./.';
  }

  return normalizeText(text)
    .replace(/\s+\/\.\s*$/, './.')
    .replace(/\s+\.\s*$/, '.')
    .replace(/\s+/g, ' ')
    .trim();
};

const findAttachmentEndingIndex = (doc: Document, attachmentStart: Element | null): number => {
  const body = getBody(doc);
  if (!body || !attachmentStart) return -1;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return -1;

  let lastArticleIndex = -1;

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (isSectPr(block)) break;

    const text = getText(block);
    if (!text) continue;

    if (isNoiNhanLine(text) || isSignerLine(text)) break;

    if (isArticleLine(text)) {
      lastArticleIndex = i;
    }

    if (isAttachmentRegulationEndingText(text)) {
      return i;
    }
  }

  return lastArticleIndex;
};

const findNextMeaningfulBlockIndex = (blocks: Element[], fromIndex: number): number => {
  for (let i = fromIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (isSectPr(block)) return i;

    const text = getText(block);
    if (!text || isEmptyLine(text) || isDecorativeLine(text) || isPageNumberLine(text)) {
      continue;
    }

    return i;
  }

  return -1;
};

const isSignatureBlockLike = (block: Element): boolean => {
  const t = normalizeForDetect(getText(block));

  return (
    t.includes('NOI NHAN') ||
    t.includes('T/M CHI BO') ||
    t.includes('TM. CHI BO') ||
    t.includes('T/M DANG UY') ||
    t.includes('TM. DANG UY') ||
    t === 'BI THU' ||
    t === 'PHO BI THU' ||
    t.includes('BI THU')
  );
};

const getLastAttachmentArticleNumber = (
  doc: Document,
  attachmentStart: Element | null
): string => {
  const body = getBody(doc);
  if (!body || !attachmentStart) return '';

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return '';

  let last = '';

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (isSectPr(block)) break;

    const text = getText(block);
    if (!text) continue;
    if (isNoiNhanLine(text) || isSignerLine(text)) break;

    const articleNo = getArticleNumber(text);
    if (articleNo !== null) {
      last = String(articleNo);
    }
  }

  return last;
};

const insertAttachmentSignatureBlockIfNeeded = (
  doc: Document,
  options: any,
  docType: string,
  attachmentStart: Element | null
): void => {
  const body = getBody(doc);
  if (!body || !attachmentStart) return;

  const endingIndex = findAttachmentEndingIndex(doc, attachmentStart);
  if (endingIndex < 0) return;

  const blocks = getDirectBodyBlocks(body);
  const endingBlock = blocks[endingIndex];
  if (!endingBlock) return;

  const nextMeaningfulIndex = findNextMeaningfulBlockIndex(blocks, endingIndex + 1);

  if (nextMeaningfulIndex >= 0 && isSignatureBlockLike(blocks[nextMeaningfulIndex])) {
    const nextText = normalizeForDetect(getText(blocks[nextMeaningfulIndex]));

    if (
      nextText.includes('NOI NHAN') &&
      (
        nextText.includes('T/M CHI BO') ||
        nextText.includes('T/M DANG UY') ||
        nextText.includes('BI THU') ||
        nextText.includes('PHO BI THU')
      )
    ) {
      return;
    }

    for (let i = nextMeaningfulIndex; i < blocks.length; i++) {
      const block = blocks[i];
      if (isSectPr(block)) break;

      const text = getText(block);
      if (!text || isEmptyLine(text) || isSignatureBlockLike(block)) {
        if (block.parentNode === body) {
          body.removeChild(block);
        }
        continue;
      }

      break;
    }
  }

  const refreshedBlocks = getDirectBodyBlocks(body);
  const refreshedEndingBlock = refreshedBlocks.find(block => block === endingBlock) || endingBlock;
  const attachmentReceiverArticleNumber = getLastAttachmentArticleNumber(doc, attachmentStart);
  const signatureBlock = createQuyetDinhChiBoSignatureBlock(
    doc,
    {
      ...options,
      receiverArticleNumber: attachmentReceiverArticleNumber || undefined
    },
    docType
  );
  const nextSibling = refreshedEndingBlock.nextSibling;

  if (nextSibling) {
    body.insertBefore(signatureBlock, nextSibling);
  } else {
    insertBeforeSectPrOrAppendToBody(body, signatureBlock);
  }
};

const findLastAttachmentStartIndexForFinalFix = (blocks: Element[]): number => {
  let result = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    const t = normalizeForDetect(text);

    if (
      isAttachmentTitleLine(text) ||
      t === 'QUY CHE' ||
      t.startsWith('QUY CHE ') ||
      t === 'QUY DINH' ||
      t.startsWith('QUY DINH ') ||
      t === 'NOI QUY' ||
      t.startsWith('NOI QUY ')
    ) {
      result = i;
    }
  }

  return result;
};

const hasCompleteSignatureBlockFromIndex = (
  blocks: Element[],
  fromIndex: number
): boolean => {
  const scanText = blocks
    .slice(fromIndex, Math.min(blocks.length, fromIndex + 8))
    .map(block => normalizeForDetect(getText(block)))
    .join(' ');

  return (
    scanText.includes('NOI NHAN') &&
    (
      scanText.includes('T/M CHI BO') ||
      scanText.includes('TM. CHI BO') ||
      scanText.includes('T/M DANG UY') ||
      scanText.includes('TM. DANG UY')
    ) &&
    (
      scanText.includes('BI THU') ||
      scanText.includes('PHO BI THU')
    )
  );
};

const removeSignatureLikeBlocksAfterIndex = (
  body: Element,
  blocks: Element[],
  fromIndex: number
): void => {
  for (let i = fromIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (isSectPr(block)) break;

    const text = getText(block);
    if (!text || isEmptyLine(text) || isSignatureBlockLike(block)) {
      if (block.parentNode === body) {
        body.removeChild(block);
      }
      continue;
    }

    break;
  }
};

const normalizeAttachmentEndingAndEnsureSignature = (
  doc: Document,
  options: any,
  docType: string
): void => {
  const body = getBody(doc);
  if (!body) return;

  let blocks = getDirectBodyBlocks(body);
  const attachmentStartIndex = findLastAttachmentStartIndexForFinalFix(blocks);
  if (attachmentStartIndex < 0) return;

  const attachmentStart = blocks[attachmentStartIndex] || null;
  let endingBlock: Element | null = null;
  let endingIndex = -1;

  for (let i = attachmentStartIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (isSectPr(block)) break;

    const text = getText(block);
    if (!text) continue;

    if (isNoiNhanLine(text) || isSignerLine(text)) break;

    if (isAttachmentRegulationEndingText(text)) {
      endingBlock = block;
      endingIndex = i;
    }
  }

  if (!endingBlock || endingIndex < 0) return;

  hardResetParagraphAsSingleRun(doc, endingBlock, normalizeAttachmentRegulationEndingSentence(getText(endingBlock)), {
    bold: false,
    align: 'both',
    size: 14,
    before: '0',
    after: '240',
    line: '240',
    firstLine: '720',
    left: '0'
  });

  blocks = getDirectBodyBlocks(body);
  endingIndex = blocks.indexOf(endingBlock);
  if (endingIndex < 0) return;

  if (hasCompleteSignatureBlockFromIndex(blocks, endingIndex + 1)) {
    return;
  }

  removeSignatureLikeBlocksAfterIndex(body, blocks, endingIndex + 1);

  const attachmentReceiverArticleNumber = getLastAttachmentArticleNumber(doc, attachmentStart);
  const signatureBlock = createQuyetDinhChiBoSignatureBlock(
    doc,
    {
      ...options,
      receiverArticleNumber: attachmentReceiverArticleNumber || undefined
    },
    docType
  );
  const nextSibling = endingBlock.nextSibling;

  if (nextSibling) {
    body.insertBefore(signatureBlock, nextSibling);
  } else {
    insertBeforeSectPrOrAppendToBody(body, signatureBlock);
  }
};

const normalizeAttachmentHeadings = (doc: Document, attachmentStart: Element | null): void => {
  if (!attachmentStart) return;

  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  let inParenthesizedAttachmentNote = false;
  let lastAttachmentNoteParagraph: Element | null = null;

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    const rawText = normalizeText(text);

    if (!text) continue;

    if (isAttachmentTitleLine(text)) {
      hardResetParagraphAsSingleRun(doc, block, toUpperVietnamese(text), {
        bold: true,
        align: 'center',
        size: 14,
        before: '360',
        after: '0',
        line: '240',
        firstLine: '0',
        left: '0'
      });

      inParenthesizedAttachmentNote = false;
      lastAttachmentNoteParagraph = null;
      continue;
    }

    const startsAttachmentNote = isAttachmentNoteStartLine(rawText);
    const endsAttachmentNote = rawText.includes(')');

    if (startsAttachmentNote || inParenthesizedAttachmentNote) {
      hardResetParagraphAsSingleRun(doc, block, text, {
        italic: true,
        align: 'center',
        size: 13,
        before: '0',
        after: endsAttachmentNote ? '240' : '0',
        line: '240',
        firstLine: '0',
        left: '0'
      });

      lastAttachmentNoteParagraph = block;
      inParenthesizedAttachmentNote = !endsAttachmentNote;
      continue;
    }

    if (isChapterLine(text)) {
      hardResetParagraphAsSingleRun(doc, block, text, {
        bold: true,
        align: 'center',
        size: 14,
        before: '360',
        after: '0',
        line: '240',
        firstLine: '0',
        left: '0'
      });

      let titleEndIndex = i;
      let scannedTitleLines = 0;

      for (let j = i + 1; j < blocks.length; j++) {
        const candidate = blocks[j];
        if (!isParagraph(candidate)) break;

        const candidateText = getText(candidate);

        if (!candidateText || isEmptyLine(candidateText) || isDecorativeLine(candidateText)) {
          continue;
        }

        if (isArticleLine(candidateText)) break;
        if (isChapterLine(candidateText)) break;
        if (isNoiNhanLine(candidateText)) break;

        const ct = normalizeForDetect(candidateText);
        const isActualSignerLine =
          ct.startsWith('T/M ') ||
          ct.startsWith('TM.') ||
          (candidateText.length < 20 && (ct === 'BI THU' || ct === 'PHO BI THU' || ct === 'CHI UY VIEN'));
        if (isActualSignerLine) break;

        if (isAttachmentTitleLine(candidateText)) break;
        if (isAttachmentNoteStartLine(candidateText)) break;
        if (isDecisionLegalBasisLine(candidateText)) break;

        scannedTitleLines += 1;
        if (scannedTitleLines > 4) break;

        titleEndIndex = j;
      }

      for (let j = i + 1; j <= titleEndIndex; j++) {
        const titleBlock = blocks[j];
        if (!isParagraph(titleBlock)) continue;

        const titleText = getText(titleBlock);
        if (!titleText || isEmptyLine(titleText) || isDecorativeLine(titleText)) continue;

        const nextMeaningfulIndex = findNextMeaningfulBlockIndex(blocks, j + 1);
        const nextMeaningfulText = nextMeaningfulIndex >= 0 ? getText(blocks[nextMeaningfulIndex]) : '';
        const isLastTitleLine = j === titleEndIndex;
        const afterTwips = isLastTitleLine && isArticleLine(nextMeaningfulText) ? '120' : '0';

        hardResetParagraphAsSingleRun(doc, titleBlock, toUpperVietnamese(titleText), {
          bold: true,
          align: 'center',
          size: 14,
          before: '0',
          after: afterTwips,
          line: '240',
          firstLine: '0',
          left: '0'
        });
      }

      i = titleEndIndex;
      continue;
    }

    if (isAttachmentRegulationEndingText(text)) {
      hardResetParagraphAsSingleRun(doc, block, normalizeAttachmentRegulationEndingSentence(text), {
        bold: false,
        align: 'both',
        size: 14,
        before: '0',
        after: '240',
        line: '240',
        firstLine: '720',
        left: '0'
      });
      continue;
    }

    if (isLikelyGenericAttachmentTitleBlock(block)) {
      hardResetParagraphAsSingleRun(doc, block, toUpperVietnamese(text), {
        bold: true,
        align: 'center',
        size: 14,
        before: '240',
        after: '120',
        line: '240',
        firstLine: '0',
        left: '0'
      });

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

const normalizeAttachmentMainTitleCluster = (
  doc: Document,
  attachmentStart: Element | null
): void => {
  if (!attachmentStart) return;

  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  let titleStarted = false;

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text || isEmptyLine(text)) continue;

    if (!titleStarted && isAttachmentTitleLine(text)) {
      titleStarted = true;

      hardResetParagraphAsSingleRun(doc, block, toUpperVietnamese(text), {
        bold: true,
        align: 'center',
        size: 14,
        before: '360',
        after: '0',
        line: '240',
        firstLine: '0',
        left: '0'
      });

      continue;
    }

    if (!titleStarted) continue;

    if (
      isDecorativeLine(text) ||
      isAttachmentNoteStartLine(text) ||
      isChapterLine(text) ||
      isArticleLine(text) ||
      isNoiNhanLine(text) ||
      isSignerLine(text)
    ) {
      break;
    }

    hardResetParagraphAsSingleRun(doc, block, toUpperVietnamese(text), {
      bold: true,
      align: 'center',
      size: 14,
      before: '0',
      after: '0',
      line: '240',
      firstLine: '0',
      left: '0'
    });
  }
};

const normalizeArticlePrefixSpacing = (text: string): string => {
  return normalizeText(text)
    .replace(/^(Đi[êề]\u0300?u\s+\d+[\.:])\s*/iu, '$1 ')
    .replace(/^(Điều\s+\d+[\.:])\s*/iu, '$1 ')
    .replace(/^(Điều\s+\d+[\.:])\s*/iu, '$1 ')
    .replace(/^(Dieu\s+\d+[\.:])\s*/iu, '$1 ');
};

const normalizeAttachmentChapterTitlesHard = (
  doc: Document,
  attachmentStart: Element | null,
  options: any
): void => {
  if (!attachmentStart) return;

  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  const startIndex = blocks.indexOf(attachmentStart);
  if (startIndex < 0) return;

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (!isChapterLine(text)) continue;

    hardResetParagraphAsSingleRun(doc, block, text, {
      bold: true,
      align: 'center',
      size: 14,
      before: '360',
      after: '0',
      line: '240',
      firstLine: '0',
      left: '0'
    });

    const titleIndexes: number[] = [];
    let articleIndex = -1;

    for (let j = i + 1; j < blocks.length; j++) {
      const candidate = blocks[j];
      if (!isParagraph(candidate)) break;

      const candidateText = getText(candidate);

      if (!candidateText || isEmptyLine(candidateText) || isDecorativeLine(candidateText)) {
        continue;
      }

      if (isArticleLine(candidateText)) {
        articleIndex = j;
        break;
      }

      const ct = normalizeForDetect(candidateText);
      const isActualSignerLine =
        ct.startsWith('T/M ') ||
        ct.startsWith('TM.') ||
        (candidateText.length < 20 && (ct === 'BI THU' || ct === 'PHO BI THU' || ct === 'CHI UY VIEN'));

      if (
        isChapterLine(candidateText) ||
        isNoiNhanLine(candidateText) ||
        isActualSignerLine ||
        isAttachmentTitleLine(candidateText) ||
        isAttachmentNoteStartLine(candidateText) ||
        isDecisionLegalBasisLine(candidateText)
      ) {
        break;
      }

      titleIndexes.push(j);
      if (titleIndexes.length >= 6) break;
    }

    titleIndexes.forEach((titleIndex, position) => {
      const titleBlock = blocks[titleIndex];
      const titleText = getText(titleBlock);
      if (!titleText) return;

      const isLastTitleLine = position === titleIndexes.length - 1;

      hardResetParagraphAsSingleRun(doc, titleBlock, toUpperVietnamese(titleText), {
        bold: true,
        align: 'center',
        size: 14,
        before: '0',
        after: isLastTitleLine ? '120' : '0',
        line: '240',
        firstLine: '0',
        left: '0'
      });
    });

    if (articleIndex >= 0) {
      const articleBlock = blocks[articleIndex];
      const articleText = normalizeArticlePrefixSpacing(getText(articleBlock));

      formatArticleParagraph(doc, articleBlock, articleText, options);

      i = articleIndex;
    } else if (titleIndexes.length > 0) {
      i = titleIndexes[titleIndexes.length - 1];
    }
  }
};

const normalizeAllChapterTitlesInBody = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const containers: Element[] = [body];
  const cells = Array.from(body.getElementsByTagNameNS(W_NS, 'tc')) as Element[];
  containers.push(...cells);

  for (const container of containers) {
    const blocks = Array.from(container.childNodes).filter(
      n => n.nodeType === 1
    ) as Element[];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!isParagraph(block)) continue;

      const text = getText(block);
      if (!text || !isChapterLine(text)) continue;

      hardResetParagraphAsSingleRun(doc, block, toUpperVietnamese(text), {
        bold: true,
        align: 'center',
        size: 14,
        before: '360',
        after: '0',
        line: '240',
        firstLine: '0',
        left: '0'
      });

      const titleIndexes: number[] = [];
      let articleIndex = -1;

      for (let j = i + 1; j < blocks.length; j++) {
        const candidate = blocks[j];
        if (!isParagraph(candidate)) break;

        const candidateText = getText(candidate);

        if (!candidateText || isEmptyLine(candidateText) || isDecorativeLine(candidateText)) {
          continue;
        }

        if (isArticleLine(candidateText)) {
          articleIndex = j;
          break;
        }

        const ct = normalizeForDetect(candidateText);
        const isActualSignerLine =
          ct.startsWith('T/M ') ||
          ct.startsWith('TM.') ||
          (candidateText.length < 20 && (ct === 'BI THU' || ct === 'PHO BI THU' || ct === 'CHI UY VIEN'));

        if (
          isChapterLine(candidateText) ||
          isNoiNhanLine(candidateText) ||
          isActualSignerLine ||
          isAttachmentTitleLine(candidateText) ||
          isAttachmentNoteStartLine(candidateText) ||
          isDecisionLegalBasisLine(candidateText) ||
          isMainDecisionTitleLine(candidateText) ||
          isDecisionAuthorityLine(candidateText)
        ) {
          break;
        }

        titleIndexes.push(j);
        if (titleIndexes.length >= 6) break;
      }

      titleIndexes.forEach((titleIndex, position) => {
        const titleBlock = blocks[titleIndex];
        const titleText = getText(titleBlock);
        if (!titleText) return;

        const isLastTitleLine = position === titleIndexes.length - 1;

        hardResetParagraphAsSingleRun(doc, titleBlock, toUpperVietnamese(titleText), {
          bold: true,
          align: 'center',
          size: 14,
          before: '0',
          after: isLastTitleLine ? '120' : '0',
          line: '240',
          firstLine: '0',
          left: '0'
        });
      });

      if (articleIndex >= 0) {
        i = articleIndex - 1;
      } else if (titleIndexes.length > 0) {
        i = titleIndexes[titleIndexes.length - 1];
      }
    }
  }
};

const forceCenterAllChapterTitlesFinal = (doc: Document): void => {
  const body = getBody(doc);
  if (!body) return;

  const containers: Element[] = [body];
  const cells = Array.from(body.getElementsByTagNameNS(W_NS, 'tc')) as Element[];
  containers.push(...cells);

  const forceCenterParagraph = (p: Element, upperText: string, afterTwips: string): void => {
    const pPr = getOrCreate(p, 'w:pPr');

    const jc = getOrCreate(pPr, 'w:jc');
    setAttr(jc, 'val', 'center');

    const ind = getOrCreate(pPr, 'w:ind');
    setAttr(ind, 'left', '0');
    setAttr(ind, 'right', '0');
    setAttr(ind, 'firstLine', '0');
    ind.removeAttribute('w:hanging');

    hardResetParagraphAsSingleRun(doc, p, upperText, {
      bold: true,
      align: 'center',
      size: 14,
      before: '0',
      after: afterTwips,
      line: '240',
      firstLine: '0',
      left: '0'
    });
  };

  for (const container of containers) {
    const blocks = Array.from(container.childNodes).filter(
      n => n.nodeType === 1
    ) as Element[];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!isParagraph(block)) continue;

      const text = getText(block);
      if (!text || !isChapterLine(text)) continue;

      forceCenterParagraph(block, toUpperVietnamese(text), '0');

      const titleCandidates: Element[] = [];

      for (let j = i + 1; j < blocks.length; j++) {
        const candidate = blocks[j];
        if (!isParagraph(candidate)) break;

        const candidateText = getText(candidate);

        if (!candidateText || isEmptyLine(candidateText) || isDecorativeLine(candidateText)) {
          continue;
        }

        if (isArticleLine(candidateText)) break;
        if (isChapterLine(candidateText)) break;
        if (isNoiNhanLine(candidateText)) break;

        const ct = normalizeForDetect(candidateText);
        const isActualSignerLine =
          ct.startsWith('T/M ') ||
          ct.startsWith('TM.') ||
          (candidateText.length < 20 && (ct === 'BI THU' || ct === 'PHO BI THU' || ct === 'CHI UY VIEN'));
        if (isActualSignerLine) break;

        if (isAttachmentTitleLine(candidateText)) break;
        if (isAttachmentNoteStartLine(candidateText)) break;
        if (isDecisionLegalBasisLine(candidateText)) break;
        if (isMainDecisionTitleLine(candidateText)) break;
        if (isDecisionAuthorityLine(candidateText)) break;

        titleCandidates.push(candidate);
      }

      titleCandidates.forEach((cand, idx) => {
        const isLast = idx === titleCandidates.length - 1;
        forceCenterParagraph(cand, toUpperVietnamese(getText(cand)), isLast ? '120' : '0');
      });
    }
  }
};

const formatAllArticleParagraphsInBody = (doc: Document, options: any): void => {
  const body = getBody(doc);
  if (!body) return;

  const allParagraphs = Array.from(body.getElementsByTagNameNS(W_NS, 'p')) as Element[];

  for (const p of allParagraphs) {
    const text = getText(p);
    if (!text || !isArticleLine(text)) continue;
    formatArticleParagraph(doc, p, normalizeArticlePrefixSpacing(text), options);
  }
};

const normalizeDecisionBodyArticleParagraphs = (doc: Document, options: any): void => {
  const body = getBody(doc);
  if (!body) return;

  const blocks = getDirectBodyBlocks(body);
  let commandSeen = false;

  for (const block of blocks) {
    if (!isParagraph(block)) continue;

    const text = getText(block);
    if (!text) continue;

    if (!commandSeen && isDecisionAuthorityLine(text)) {
      commandSeen = true;
      continue;
    }

    if (!commandSeen) continue;
    if (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text)) break;
    if (isNoiNhanLine(text) || isSignerLine(text)) break;

    if (isMainDecisionAttachmentNoteLine(text)) {
      hardResetParagraphAsSingleRun(doc, block, text, {
        italic: true,
        align: 'center',
        size: 13,
        before: '0',
        after: '120',
        line: '240',
        firstLine: '0',
        left: '0'
      });
      continue;
    }

    if (isArticleLine(text)) {
      formatArticleParagraph(doc, block, normalizeArticlePrefixSpacing(text), options);
    }
  }
};

const formatArticleParagraph = (
  doc: Document,
  p: Element,
  fullText: string,
  options: any
): void => {
  const cleanText = normalizeText(fullText);
  const bodyFormat = getBodyFormatSpec(options);

  const match = cleanText.match(/^(Điều\s+\d+\s*[.:])\s*(.*)$/iu) ||
                cleanText.match(/^(Điều\s+\d+)\s+(.+)$/iu);

  const articlePrefix = match ? match[1].trim() : cleanText;
  const articleBody = match ? match[2].trim() : '';

  const pPr = clearParagraphContentKeepPPr(p);

  const jc = getOrCreate(pPr, 'w:jc');
  setAttr(jc, 'val', 'both');

  const ind = getOrCreate(pPr, 'w:ind');
  setAttr(ind, 'left', '0');
  setAttr(ind, 'right', '0');
  setAttr(ind, 'firstLine', bodyFormat.firstLine);
  ind.removeAttribute('w:hanging');

  setParagraphSpacing(p, '0', '0', bodyFormat.line);

  const pPrRPr = Array.from(pPr.childNodes).find(
    n => n.nodeType === 1 && getLocalName(n as Element) === 'rPr'
  ) as Element | undefined;
  if (pPrRPr) {
    const bs = Array.from(pPrRPr.childNodes).filter(
      n => n.nodeType === 1 && (getLocalName(n as Element) === 'b' || getLocalName(n as Element) === 'bCs')
    );
    bs.forEach(b => pPrRPr.removeChild(b));
  }

  const createRun = (text: string, bold: boolean): Element => {
    const r = doc.createElementNS(W_NS, 'w:r');
    const rPr = getOrCreate(r, 'w:rPr');

    const sizeVal = String(Math.round(bodyFormat.size * 2));
    const sz = getOrCreate(rPr, 'w:sz');
    setAttr(sz, 'val', sizeVal);
    const szCs = getOrCreate(rPr, 'w:szCs');
    setAttr(szCs, 'val', sizeVal);

    if (bold) {
      forceBoldNode(rPr);
    }

    const t = doc.createElementNS(W_NS, 'w:t');
    setAttr(t, 'space' as any, 'preserve');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = text;
    r.appendChild(t);
    return r;
  };

  p.appendChild(createRun(articlePrefix, true));
  if (articleBody) {
    p.appendChild(createRun(' ' + articleBody, false));
  }
};

export const insertQuyetDinhChiBoSignatureBlock = (
  doc: Document,
  options: any,
  docType: string
): boolean => {
  if (!isQuyetDinhChiBo(options, docType, doc)) return false;

  const body = getBody(doc);
  if (!body) return false;

  normalizeMainDecisionTitleAndSummary(doc);
  normalizeLegalBasisLines(doc);
  normalizeAuthorityCommandZone(doc, options, docType);
  normalizeOrphanEffectiveArticle(doc);
  normalizeDecisionBodyArticleParagraphs(doc, options);
  normalizeAllChapterTitlesInBody(doc);
  removeExistingSignatureAndReceivers(doc);

  const detectedAttachmentStart = findAttachmentStartAfterDecisionEnding(doc);

  if (detectedAttachmentStart) {
    normalizeAttachmentHeadings(doc, detectedAttachmentStart);
    normalizeAttachmentMainTitleCluster(doc, detectedAttachmentStart);
    normalizeAttachmentChapterTitlesHard(doc, detectedAttachmentStart, options);

    const attachmentFragment = extractBodyBlocksFrom(doc, body, detectedAttachmentStart);

    const signatureBlock = createQuyetDinhChiBoSignatureBlock(doc, options, docType);
    const pageBreakBeforeAttachment = createPageBreakParagraph(doc);
    const attachmentHeader = createQuyetDinhChiBoAttachmentStandardHeader(doc, options);

    insertBeforeSectPrOrAppendToBody(body, signatureBlock);
    insertBeforeSectPrOrAppendToBody(body, pageBreakBeforeAttachment);
    insertBeforeSectPrOrAppendToBody(body, attachmentHeader);
    insertBeforeSectPrOrAppendToBody(body, attachmentFragment);

    const refreshedBlocks = getDirectBodyBlocks(body);
    const refreshedAttachmentStart = refreshedBlocks.find(block => {
      const text = getText(block);
      return isParagraph(block) && (isAttachmentTitleLine(text) || isAttachmentNoteStartLine(text));
    }) || null;

    normalizeAttachmentHeadings(doc, refreshedAttachmentStart);
    normalizeAttachmentMainTitleCluster(doc, refreshedAttachmentStart);
    normalizeAttachmentChapterTitlesHard(doc, refreshedAttachmentStart, options);
    normalizeAllChapterTitlesInBody(doc);
    insertAttachmentSignatureBlockIfNeeded(doc, options, docType, refreshedAttachmentStart);
    normalizeAttachmentEndingAndEnsureSignature(doc, options, docType);
    forceCenterAllChapterTitlesFinal(doc);
    formatAllArticleParagraphsInBody(doc, options);

    return true;
  }

  const signatureBlock = createQuyetDinhChiBoSignatureBlock(doc, options, docType);
  insertBeforeSectPrOrAppend(doc, signatureBlock);
  normalizeAllChapterTitlesInBody(doc);
  normalizeAttachmentEndingAndEnsureSignature(doc, options, docType);
  forceCenterAllChapterTitlesFinal(doc);
  formatAllArticleParagraphsInBody(doc, options);

  return true;
};