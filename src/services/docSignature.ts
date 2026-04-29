// File: src/services/docSignature.ts
import { HeaderType } from '../types';
import {
  W_NS,
  getNodes,
  getOrCreate,
  setAttr,
  forceBoldNode,
  forceParagraphBold,
  removeBoldNode
} from './docUtils';

export const formatSmartDepartmentName = (fullName: string, maxLength: number = 26): string[] => {
  if (!fullName) return [''];

  if (fullName.length <= maxLength) {
    return [fullName.trim()];
  }

  const splitKeywords = [
    'TH - THCS',
    'THCS',
    'THPT',
    'TH',
    'TIỂU HỌC',
    'TRUNG HỌC CƠ SỞ',
    'TRUNG HỌC PHỔ THÔNG',
    'MẦM NON',
    'MẪU GIÁO'
  ];

  const upperFullName = fullName.toUpperCase();

  for (const keyword of splitKeywords) {
    const index = upperFullName.indexOf(keyword);

    if (index !== -1) {
      const splitPoint = index + keyword.length;
      const part1 = fullName.substring(0, splitPoint).trim();
      const part2 = fullName.substring(splitPoint).trim();

      if (part2.length > 0) {
        return [part1, part2];
      }
    }
  }

  return [fullName.trim()];
};

const normalizeText = (value: string) => {
  return String(value || '').normalize('NFC').trim();
};

const cleanSignerTitle = (title: string): string => {
  if (!title) return '';

  const cleaned = title
    .normalize('NFC')
    .replace(/[\.\,\;]+$/, '')
    .trim()
    .toUpperCase();

  if (cleaned.includes('TỔ TRƯỞNG')) return 'TỔ TRƯỞNG';
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

const formatCongVanSummary = (summary?: string) => {
  const raw = normalizeText(summary || '');

  if (!raw) return [];

  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const cleaned = line.replace(/^v\/v[:：]?\s*/i, '').trim();
      return index === 0 ? `V/v ${cleaned}` : cleaned;
    });
};

const normalizeReceiverEnd = (text: string, index: number, total: number, isParty: boolean) => {
  let cleanText = normalizeText(text);

  if (!cleanText) return cleanText;

  if (isParty) {
    cleanText = cleanText
      .replace(/\btpt\b/ig, 'TPT')
      .replace(/\bhscb\b/ig, 'HSCB')
      .replace(/\bbt\b/ig, 'BT')
      .replace(/[\.\,\;]+$/, '');

    return index === total - 1 ? `${cleanText}.` : `${cleanText},`;
  }

  cleanText = cleanText.replace(/[\.\,\;]+$/, '');

  const lower = cleanText.toLowerCase();

  if (lower.includes('lưu') || lower.includes('vt')) {
    return `${cleanText}.`;
  }

  return index === total - 1 ? `${cleanText}.` : `${cleanText};`;
};

export const createHeaderTemplate = (doc: Document, options: any): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const org = options.orgInfo || {
    governingBody: 'UBND XÃ EA KAR',
    orgName: 'TRƯỜNG THCS CHU VĂN AN',
    partyUpper: 'ĐẢNG BỘ XÃ EA KAR',
    partyCell: 'CHI BỘ TRƯỜNG THCS CHU VĂN AN',
    location: 'Ea Kar',
    departmentName: 'TỔ CHUYÊN MÔN'
  };

  const createStyledP = (
    text: string,
    isBold: boolean,
    isItalic: boolean,
    customSize?: number
  ): Element => {
    const p = createElement('w:p');
    const pPr = getOrCreate(p, 'w:pPr');

    const jc = getOrCreate(pPr, 'w:jc');
    setAttr(jc, 'val', 'center');

    const ind = getOrCreate(pPr, 'w:ind');
    setAttr(ind, 'left', '0');
    setAttr(ind, 'right', '0');
    setAttr(ind, 'firstLine', '0');
    ind.removeAttributeNS(W_NS, 'hanging');
    ind.removeAttribute('w:hanging');

    const spacing = getOrCreate(pPr, 'w:spacing');
    setAttr(spacing, 'before', '0');
    setAttr(spacing, 'after', '0');
    setAttr(spacing, 'line', '240');
    setAttr(spacing, 'lineRule', 'auto');

    const r = createElement('w:r');
    p.appendChild(r);

    const rPr = getOrCreate(r, 'w:rPr');
    const sizeToUse = customSize ? customSize * 2 : options.font.sizeTable * 2;

    const sz = getOrCreate(rPr, 'w:sz');
    setAttr(sz, 'val', String(sizeToUse));

    const szCs = getOrCreate(rPr, 'w:szCs');
    setAttr(szCs, 'val', String(sizeToUse));

    if (isBold) forceBoldNode(rPr);

    if (isItalic) {
      const i = getOrCreate(rPr, 'w:i');
      setAttr(i, 'val', 'true');

      const iCs = getOrCreate(rPr, 'w:iCs');
      setAttr(iCs, 'val', 'true');
    }

    const t = createElement('w:t');
    t.textContent = text;
    r.appendChild(t);

    if (isBold) forceParagraphBold(pPr);

    return p;
  };

  const createMottoP = (text: string, isBold: boolean, customSize?: number): Element => {
    const p = createElement('w:p');
    const pPr = getOrCreate(p, 'w:pPr');

    const jc = getOrCreate(pPr, 'w:jc');
    setAttr(jc, 'val', 'center');

    const ind = getOrCreate(pPr, 'w:ind');
    setAttr(ind, 'left', '0');
    setAttr(ind, 'right', '0');
    setAttr(ind, 'firstLine', '0');

    const spacing = getOrCreate(pPr, 'w:spacing');
    setAttr(spacing, 'before', '0');
    setAttr(spacing, 'after', '0');
    setAttr(spacing, 'line', '240');
    setAttr(spacing, 'lineRule', 'auto');

    const r = createElement('w:r');
    p.appendChild(r);

    const rPr = getOrCreate(r, 'w:rPr');
    const sizeToUse = customSize ? customSize * 2 : options.font.sizeTable * 2;

    const sz = getOrCreate(rPr, 'w:sz');
    setAttr(sz, 'val', String(sizeToUse));

    const szCs = getOrCreate(rPr, 'w:szCs');
    setAttr(szCs, 'val', String(sizeToUse));

    if (isBold) forceBoldNode(rPr);

    const t = createElement('w:t');
    t.textContent = text;
    r.appendChild(t);

    if (isBold) forceParagraphBold(pPr);

    return p;
  };

  const appendSmartLines = (
    tc: Element,
    text: string,
    isBold: boolean,
    isItalic: boolean = false,
    customSize?: number
  ) => {
    const lines = formatSmartDepartmentName(String(text || '').toUpperCase());
    lines.forEach(line => tc.appendChild(createStyledP(line, isBold, isItalic, customSize)));
  };

  const appendSafeTable = (tc: Element, tbl: Element) => {
    tc.appendChild(tbl);

    const p = createElement('w:p');
    const pPr = getOrCreate(p, 'w:pPr');
    const spacing = getOrCreate(pPr, 'w:spacing');

    setAttr(spacing, 'before', '0');
    setAttr(spacing, 'after', '0');
    setAttr(spacing, 'line', '2');
    setAttr(spacing, 'lineRule', 'exact');

    tc.appendChild(p);
  };

  const createShortLineTable = (): Element => {
    const tbl = createElement('w:tbl');
    const tblPr = getOrCreate(tbl, 'w:tblPr');

    const jcTbl = getOrCreate(tblPr, 'w:jc');
    setAttr(jcTbl, 'val', 'center');

    const tblW = getOrCreate(tblPr, 'w:tblW');
    setAttr(tblW, 'w', '1000');
    setAttr(tblW, 'type', 'dxa');

    const tblLayout = getOrCreate(tblPr, 'w:tblLayout');
    setAttr(tblLayout, 'type', 'fixed');

    const tblGrid = getOrCreate(tbl, 'w:tblGrid');
    const gridCol = createElement('w:gridCol');
    setAttr(gridCol, 'w', '1000');
    tblGrid.appendChild(gridCol);

    const tr = createElement('w:tr');
    tbl.appendChild(tr);

    const tc = createElement('w:tc');
    tr.appendChild(tc);

    const tcPr = getOrCreate(tc, 'w:tcPr');

    const tcW = getOrCreate(tcPr, 'w:tcW');
    setAttr(tcW, 'w', '1000');
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
    setAttr(top, 'sz', '4');
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

  const createMottoLineTable = (widthTwips: string): Element => {
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
    setAttr(top, 'sz', '6');
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

  const tc1 = createElement('w:tc');
  tr.appendChild(tc1);

  const tc1Pr = getOrCreate(tc1, 'w:tcPr');
  const tc1W = getOrCreate(tc1Pr, 'w:tcW');
  setAttr(tc1W, 'w', '3800');
  setAttr(tc1W, 'type', 'dxa');

  const tc1Mar = getOrCreate(tc1Pr, 'w:tcMar');
  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const mar = getOrCreate(tc1Mar, `w:${side}`);
    setAttr(mar, 'w', '0');
    setAttr(mar, 'type', 'dxa');
  });

  const tc2 = createElement('w:tc');
  tr.appendChild(tc2);

  const tc2Pr = getOrCreate(tc2, 'w:tcPr');
  const tc2W = getOrCreate(tc2Pr, 'w:tcW');
  setAttr(tc2W, 'w', '5550');
  setAttr(tc2W, 'type', 'dxa');

  const tc2Mar = getOrCreate(tc2Pr, 'w:tcMar');
  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const mar = getOrCreate(tc2Mar, `w:${side}`);
    setAttr(mar, 'w', '0');
    setAttr(mar, 'type', 'dxa');
  });

  const docDate = options.documentDate ? new Date(options.documentDate) : new Date();
  const day = String(docDate.getDate());
  const month = String(docDate.getMonth() + 1);
  const year = docDate.getFullYear();
  const currentDateStr = `${org.location}, ngày ${day} tháng ${month} năm ${year}`;

  const congVanSummaryLines = formatCongVanSummary(options.congVanSummary);

  switch (options.headerType) {
    case HeaderType.PARTY: {
      let partySymbolStr = 'Số: ...-.../CB';

      if (options.docSymbol || options.docSuffix) {
        const symbol = options.docSymbol || '...';
        const suffix = options.docSuffix || 'CB';
        partySymbolStr = `Số: ...-${symbol}/${suffix}`;
      }

      appendSmartLines(tc1, org.partyUpper, false);
      appendSmartLines(tc1, org.partyCell, true);
      tc1.appendChild(createStyledP('*', false, false));
      tc1.appendChild(createStyledP(partySymbolStr, false, false));

      if (options.isCongVan && congVanSummaryLines.length > 0) {
        congVanSummaryLines.forEach(line => {
          tc1.appendChild(createStyledP(line, false, false, 12));
        });
      }

      tc2.appendChild(createMottoP('ĐẢNG CỘNG SẢN VIỆT NAM', true, 13));
      appendSafeTable(tc2, createMottoLineTable('3400'));
      tc2.appendChild(createStyledP('', false, false));
      tc2.appendChild(createStyledP(currentDateStr, false, true, 14));
      break;
    }

    case HeaderType.DEPARTMENT: {
      const deptName = org.departmentName || 'TỔ CHUYÊN MÔN';

      appendSmartLines(tc1, org.orgName, false);
      appendSmartLines(tc1, deptName, true);
      appendSafeTable(tc1, createShortLineTable());
      tc1.appendChild(createStyledP('', false, false));

      if (options.isCongVan && congVanSummaryLines.length > 0) {
        congVanSummaryLines.forEach(line => {
          tc1.appendChild(createStyledP(line, false, false, 12));
        });
      }

      tc2.appendChild(createStyledP('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', true, false, 13));
      tc2.appendChild(createMottoP('Độc lập - Tự do - Hạnh phúc', true, 13));
      appendSafeTable(tc2, createMottoLineTable('3200'));
      tc2.appendChild(createStyledP('', false, false));
      tc2.appendChild(createStyledP(currentDateStr, false, true, 14));
      break;
    }

    case HeaderType.SCHOOL:
    default: {
      let schoolSymbolStr = 'Số: .../...';

      if (options.docSymbol || options.docSuffix) {
        const symbol = options.docSymbol || '...';
        const suffix = options.docSuffix || '...';
        schoolSymbolStr = `Số: .../${symbol}-${suffix}`;
      }

      appendSmartLines(tc1, org.governingBody, false);
      appendSmartLines(tc1, org.orgName, true);
      appendSafeTable(tc1, createShortLineTable());
      tc1.appendChild(createStyledP('', false, false));
      tc1.appendChild(createStyledP(schoolSymbolStr, false, false));

      if (options.isCongVan && congVanSummaryLines.length > 0) {
        congVanSummaryLines.forEach(line => {
          tc1.appendChild(createStyledP(line, false, false, 12));
        });
      }

      tc2.appendChild(createStyledP('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', true, false, 13));
      tc2.appendChild(createMottoP('Độc lập - Tự do - Hạnh phúc', true, 13));
      appendSafeTable(tc2, createMottoLineTable('3200'));
      tc2.appendChild(createStyledP('', false, false));
      tc2.appendChild(createStyledP(currentDateStr, false, true, 14));
      break;
    }
  }

  return tbl;
};

export const createSignatureBlock = (doc: Document, options: any, docType: string): Element => {
  const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

  const org = options.orgInfo || {
    governingBody: 'UBND XÃ EA KAR',
    orgName: 'TRƯỜNG THCS CHU VĂN AN',
    partyUpper: 'ĐẢNG BỘ XÃ EA KAR',
    partyCell: 'CHI BỘ TRƯỜNG THCS CHU VĂN AN',
    location: 'Ea Kar',
    departmentName: 'TỔ CHUYÊN MÔN'
  };

  const createTightP = (
    text: string,
    isBold: boolean,
    isItalic: boolean,
    isUnderline: boolean,
    align: string,
    customSize?: number
  ) => {
    const p = createElement('w:p');
    const pPr = getOrCreate(p, 'w:pPr');

    const jc = getOrCreate(pPr, 'w:jc');
    setAttr(jc, 'val', align);

    const ind = getOrCreate(pPr, 'w:ind');
    setAttr(ind, 'left', '0');
    setAttr(ind, 'right', '0');
    setAttr(ind, 'firstLine', '0');

    const spacing = getOrCreate(pPr, 'w:spacing');
    setAttr(spacing, 'before', '0');
    setAttr(spacing, 'after', '0');
    setAttr(spacing, 'line', '240');
    setAttr(spacing, 'lineRule', 'auto');

    const r = createElement('w:r');
    p.appendChild(r);

    const rPr = getOrCreate(r, 'w:rPr');
    const sizeToUse = customSize ? customSize * 2 : options.font?.sizeTable * 2 || 26;

    const sz = getOrCreate(rPr, 'w:sz');
    setAttr(sz, 'val', String(sizeToUse));

    const szCs = getOrCreate(rPr, 'w:szCs');
    setAttr(szCs, 'val', String(sizeToUse));

    if (isBold) forceBoldNode(rPr);

    if (isItalic) {
      const i = getOrCreate(rPr, 'w:i');
      setAttr(i, 'val', 'true');

      const iCs = getOrCreate(rPr, 'w:iCs');
      setAttr(iCs, 'val', 'true');
    }

    if (isUnderline) {
      const u = getOrCreate(rPr, 'w:u');
      setAttr(u, 'val', 'single');
    }

    const t = createElement('w:t');
    t.textContent = text;
    r.appendChild(t);

    if (isBold) forceParagraphBold(pPr);

    return p;
  };

  const createReceiverP = (text: string, isHeader: boolean, isParty: boolean) => {
    const p = createElement('w:p');
    const pPr = getOrCreate(p, 'w:pPr');

    const jc = getOrCreate(pPr, 'w:jc');
    setAttr(jc, 'val', 'left');

    const ind = getOrCreate(pPr, 'w:ind');

    if (!isHeader) {
      setAttr(ind, 'left', '340');
      setAttr(ind, 'hanging', '340');
    } else {
      setAttr(ind, 'left', '0');
      setAttr(ind, 'hanging', '0');
    }

    const spacing = getOrCreate(pPr, 'w:spacing');
    setAttr(spacing, 'before', '0');
    setAttr(spacing, 'after', '0');
    setAttr(spacing, 'line', '240');
    setAttr(spacing, 'lineRule', 'auto');

    const r = createElement('w:r');
    p.appendChild(r);

    const rPr = getOrCreate(r, 'w:rPr');

    let sizeVal = '22';

    if (isParty) {
      sizeVal = isHeader ? '28' : '24';
    } else {
      sizeVal = isHeader ? '24' : '22';
    }

    const sz = getOrCreate(rPr, 'w:sz');
    setAttr(sz, 'val', sizeVal);

    const szCs = getOrCreate(rPr, 'w:szCs');
    setAttr(szCs, 'val', sizeVal);

    if (isHeader) {
      if (!isParty) {
        forceBoldNode(rPr);
        forceParagraphBold(pPr);

        const i = getOrCreate(rPr, 'w:i');
        setAttr(i, 'val', 'true');

        const iCs = getOrCreate(rPr, 'w:iCs');
        setAttr(iCs, 'val', 'true');
      } else {
        removeBoldNode(rPr);

        const iEl = getNodes(rPr, 'i')[0];
        if (iEl) rPr.removeChild(iEl);

        const iCsEl = getNodes(rPr, 'iCs')[0];
        if (iCsEl) rPr.removeChild(iCsEl);

        const u = getOrCreate(rPr, 'w:u');
        setAttr(u, 'val', 'single');
      }
    }

    const t = createElement('w:t');
    t.textContent = text;
    r.appendChild(t);

    return p;
  };

  const appendReceivers = (tc: Element, receivers: string[], isParty: boolean) => {
    tc.appendChild(createReceiverP('Nơi nhận:', true, isParty));

    receivers.forEach((txt, index) => {
      const normalized = normalizeReceiverEnd(txt, index, receivers.length, isParty);
      tc.appendChild(createReceiverP(normalized, false, isParty));
    });
  };

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

  const isMinutes = (docType && docType.toUpperCase().includes('BIÊN BẢN')) || options.isMinutes === true;

  const w1 = isMinutes ? '4675' : '3800';
  const w2 = isMinutes ? '4675' : '5550';

  const col1 = createElement('w:gridCol');
  setAttr(col1, 'w', w1);
  tblGrid.appendChild(col1);

  const col2 = createElement('w:gridCol');
  setAttr(col2, 'w', w2);
  tblGrid.appendChild(col2);

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

  const addBlankLines = (tc: Element, count: number) => {
    for (let i = 0; i < count; i++) {
      tc.appendChild(createTightP('', false, false, false, 'center', 14));
    }
  };

  const signerTitle = cleanSignerTitle(options.signerTitle);
  const signerName = cleanSignerName(options.signerName);
  const presiderName = cleanSignerName(options.presiderName);
  const secretaryName = cleanSignerName(options.secretaryName);

  const getBlankLinesForStamp = (title: string): number => {
    const t = title.toUpperCase();

    if (
      ['HIỆU TRƯỞNG', 'CHỦ TỊCH', 'GIÁM ĐỐC', 'TRƯỞNG PHÒNG', 'BÍ THƯ', 'TRƯỞNG BAN', 'CHỦ TỌA']
        .some(k => t.includes(k))
    ) {
      return 5;
    }

    return 3;
  };

  if (isMinutes) {
    const signTr = createElement('w:tr');
    tbl.appendChild(signTr);

    const tcSecretary = createCell(w1);
    signTr.appendChild(tcSecretary);

    const tcPresider = createCell(w2);
    signTr.appendChild(tcPresider);

    tcSecretary.appendChild(createTightP('THƯ KÝ', true, false, false, 'center', 14));
    addBlankLines(tcSecretary, 3);
    if (secretaryName) {
      tcSecretary.appendChild(createTightP(secretaryName, true, false, false, 'center', 14));
    }

    tcPresider.appendChild(createTightP('CHỦ TỌA', true, false, false, 'center', 14));
    addBlankLines(tcPresider, getBlankLinesForStamp('CHỦ TỌA'));
    if (presiderName) {
      tcPresider.appendChild(createTightP(presiderName, true, false, false, 'center', 14));
    }

    const receiverTr = createElement('w:tr');
    tbl.appendChild(receiverTr);

    const receiverTc = createCell(w1);
    receiverTr.appendChild(receiverTc);

    const emptyTc = createCell(w2);
    receiverTr.appendChild(emptyTc);
    emptyTc.appendChild(createTightP('', false, false, false, 'center', 12));

    const minutesReceivers = options.extractedReceivers || [
      '- Như thành phần tham dự',
      '- Lưu: VT, Hồ sơ'
    ];

    appendReceivers(receiverTc, minutesReceivers, false);

    return tbl;
  }

  const tr = createElement('w:tr');
  tbl.appendChild(tr);

  const tc1 = createCell(w1);
  tr.appendChild(tc1);

  const tc2 = createCell(w2);
  tr.appendChild(tc2);

  const isParty = options.headerType === HeaderType.PARTY;
  const isDecision = options.isDecision === true || docType?.toUpperCase?.().includes('QUYẾT ĐỊNH');

  switch (options.headerType) {
    case HeaderType.PARTY: {
      const partyReceiversRaw =
        options.extractedReceivers ||
        (isDecision
          ? [
              `- ${org.partyUpper} (để báo cáo)`,
              '- UBKT Đảng ủy (để báo cáo)',
              '- Như điều thi hành (thực hiện)',
              '- Lưu Chi bộ & HSKT'
            ]
          : [
              `- ${org.partyUpper} (b/c)`,
              `- Chi ủy và Lãnh đạo ${org.orgName}`,
              '- BT Chi Đoàn, TPT Đội',
              '- Đảng viên (t/h)',
              '- Lưu HSCB'
            ]);

      appendReceivers(tc1, partyReceiversRaw, true);

      if (isDecision) {
        tc2.appendChild(createTightP('T/M CHI BỘ', true, false, false, 'center', 14));
        const sTitleParty = signerTitle || 'BÍ THƯ';
        tc2.appendChild(createTightP(sTitleParty, true, false, false, 'center', 14));
        addBlankLines(tc2, getBlankLinesForStamp(sTitleParty));
        if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, 'center', 14));
      } else {
        tc2.appendChild(createTightP('T/M CHI BỘ', true, false, false, 'center', 14));
        const sTitleParty = signerTitle || 'BÍ THƯ';
        tc2.appendChild(createTightP(sTitleParty, true, false, false, 'center', 14));
        addBlankLines(tc2, getBlankLinesForStamp(sTitleParty));
        if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, 'center', 14));
      }

      break;
    }

    case HeaderType.DEPARTMENT: {
      const approverTitle = cleanSignerTitle(options.approverTitle);
      const approverName = cleanSignerName(options.approverName);

      if (approverTitle || approverName) {
        const actualApprTitle = approverTitle || 'HIỆU TRƯỞNG';

        tc1.appendChild(createTightP('DUYỆT CỦA HIỆU TRƯỞNG', true, false, false, 'center', 14));

        if (actualApprTitle.includes('PHÓ')) {
          tc1.appendChild(createTightP('KT. HIỆU TRƯỞNG', true, false, false, 'center', 14));
          tc1.appendChild(createTightP('PHÓ HIỆU TRƯỞNG', true, false, false, 'center', 14));
          addBlankLines(tc1, 4);
        } else {
          addBlankLines(tc1, 5);
        }

        if (approverName) {
          tc1.appendChild(createTightP(approverName, true, false, false, 'center', 14));
        }

        tc1.appendChild(createTightP('', false, false, false, 'center', 14));
      }

      const depReceivers = options.extractedReceivers || [
        `- Lãnh đạo ${org.orgName} (b/c)`,
        '- Thành viên Tổ (t/h)',
        '- Lưu HSTCM'
      ];

      appendReceivers(tc1, depReceivers, false);

      const sTitleDep = signerTitle || 'TỔ TRƯỞNG';
      tc2.appendChild(createTightP(sTitleDep.toUpperCase(), true, false, false, 'center', 14));
      addBlankLines(tc2, getBlankLinesForStamp(sTitleDep));
      if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, 'center', 14));

      break;
    }

    case HeaderType.SCHOOL:
    default: {
      const schoolReceivers =
        options.extractedReceivers ||
        (isDecision
          ? [
              '- Như các điều thi hành',
              `- ${org.governingBody}`,
              '- Lưu: VT'
            ]
          : [
              `- ${org.governingBody} (b/c)`,
              `- Lãnh đạo ${org.orgName} (b/c)`,
              '- Cấp ủy chi bộ (b/c)',
              '- Các tổ chuyên môn, Văn phòng (t/h)',
              '- Giáo viên, nhân viên (t/h)',
              '- Lưu VT, EDOC'
            ]);

      appendReceivers(tc1, schoolReceivers, false);

      const sTitleSchool = signerTitle || 'HIỆU TRƯỞNG';

      if (sTitleSchool.includes('PHÓ')) {
        const baseTitle = sTitleSchool.replace('PHÓ ', '');
        tc2.appendChild(createTightP(`KT. ${baseTitle}`, true, false, false, 'center', 14));
        tc2.appendChild(createTightP(sTitleSchool, true, false, false, 'center', 14));
        addBlankLines(tc2, Math.max(3, getBlankLinesForStamp(sTitleSchool) - 1));
      } else {
        tc2.appendChild(createTightP(sTitleSchool, true, false, false, 'center', 14));
        addBlankLines(tc2, getBlankLinesForStamp(sTitleSchool));
      }

      if (signerName) {
        tc2.appendChild(createTightP(signerName, true, false, false, 'center', 14));
      }

      break;
    }
  }

  return tbl;
};