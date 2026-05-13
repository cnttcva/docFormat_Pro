// File: src/services/docx/docSection.ts
import { W_NS, TWIPS_PER_CM, getNodes, getOrCreate, setAttr } from '../docUtils';

const getLocalName = (node: Node): string => {
  const name = (node as Element).localName || node.nodeName || '';
  return name.includes(':') ? name.split(':').pop() || name : name;
};

const getAttrVal = (el: Element | null | undefined, localName: string): string => {
  if (!el) return '';

  return (
    el.getAttributeNS(W_NS, localName) ||
    el.getAttribute(`w:${localName}`) ||
    el.getAttribute(localName) ||
    ''
  );
};

export const parseCmValue = (value: any, fallback: number): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return fallback;
};

export const getMarginCm = (
  opts: any,
  key: 'top' | 'bottom' | 'left' | 'right',
  fallback: number
): number => {
  return parseCmValue(
    opts?.margins?.[key] ??
      opts?.margin?.[key] ??
      opts?.pageMargins?.[key] ??
      opts?.page?.margins?.[key] ??
      opts?.page?.margin?.[key] ??
      opts?.page?.[key] ??
      opts?.[key],
    fallback
  );
};

export const cmToTwips = (cm: number): string => {
  return String(Math.round(cm * TWIPS_PER_CM));
};

const applyPortraitA4MarginsToSectPr = (sectPr: Element, opts: any): void => {
  const pgSz = getOrCreate(sectPr, 'w:pgSz');
  setAttr(pgSz, 'w', '11906');
  setAttr(pgSz, 'h', '16838');
  setAttr(pgSz, 'orient', 'portrait');

  const pgMar = getOrCreate(sectPr, 'w:pgMar');
  setAttr(pgMar, 'top', cmToTwips(getMarginCm(opts, 'top', 2)));
  setAttr(pgMar, 'bottom', cmToTwips(getMarginCm(opts, 'bottom', 2)));
  setAttr(pgMar, 'left', cmToTwips(getMarginCm(opts, 'left', 3)));
  setAttr(pgMar, 'right', cmToTwips(getMarginCm(opts, 'right', 1.5)));
  setAttr(pgMar, 'header', '708');
  setAttr(pgMar, 'footer', '708');
  setAttr(pgMar, 'gutter', '0');

  const cols = getOrCreate(sectPr, 'w:cols');
  setAttr(cols, 'space', '708');

  const docGrid = getOrCreate(sectPr, 'w:docGrid');
  setAttr(docGrid, 'linePitch', '360');
};

export const forceFinalPageMargins = (doc: Document, opts: any): void => {
  const currentBody = getNodes(doc, 'body')[0];
  if (!currentBody) return;

  let sectPrs = getNodes(doc, 'sectPr');

  if (sectPrs.length === 0) {
    const sectPr = doc.createElementNS(W_NS, 'w:sectPr');
    currentBody.appendChild(sectPr);
    sectPrs = [sectPr];
  }

  // Ép tất cả section hiện có về A4 dọc/lề chuẩn.
  // Nếu tài liệu có phần kèm theo landscape, docxService.ts sẽ gán lại landscape cho section cuối sau đó.
  sectPrs.forEach(sectPr => {
    applyPortraitA4MarginsToSectPr(sectPr, opts);
  });

  // Đảm bảo body luôn có sectPr cuối cùng.
  const hasBodyLevelSectPr = sectPrs.some(sectPr => sectPr.parentNode === currentBody);

  if (!hasBodyLevelSectPr) {
    const finalSectPr = doc.createElementNS(W_NS, 'w:sectPr');
    currentBody.appendChild(finalSectPr);
    applyPortraitA4MarginsToSectPr(finalSectPr, opts);
  }

  // Sửa lỗi Word tạo khoảng trắng/trang trắng do section break ẩn ở giữa văn bản.
  removeEmptyNonPageSectionParagraphs(doc);
};

export const removeChildrenByLocalName = (el: Element, names: string[]): void => {
  const wanted = new Set(names);

  Array.from(el.childNodes).forEach(child => {
    if (child.nodeType !== 1) return;

    const local = getLocalName(child);
    if (wanted.has(local)) {
      el.removeChild(child);
    }
  });
};

export const normalizeSectPrChildOrder = (sectPr: Element): void => {
  const order = [
    'headerReference',
    'footerReference',
    'footnotePr',
    'endnotePr',
    'type',
    'pgSz',
    'pgMar',
    'paperSrc',
    'pgBorders',
    'lnNumType',
    'pgNumType',
    'cols',
    'formProt',
    'vAlign',
    'noEndnote',
    'titlePg',
    'textDirection',
    'bidi',
    'rtlGutter',
    'docGrid',
    'printerSettings',
    'sectPrChange'
  ];

  const children = Array.from(sectPr.childNodes).filter(
    child => child.nodeType === 1
  ) as Element[];

  if (children.length <= 1) return;

  const orderIndex = (el: Element): number => {
    const local = getLocalName(el);
    const idx = order.indexOf(local);
    return idx >= 0 ? idx : 999;
  };

  const sorted = children
    .map((el, index) => ({ el, index }))
    .sort((a, b) => {
      const diff = orderIndex(a.el) - orderIndex(b.el);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(item => item.el);

  sorted.forEach(child => sectPr.appendChild(child));
};

export const ensureDefaultHeaderReferenceFirst = (
  docRef: Document,
  sectPr: Element
): void => {
  removeChildrenByLocalName(sectPr, ['headerReference']);

  const headerRef = docRef.createElementNS(W_NS, 'w:headerReference');
  setAttr(headerRef, 'type', 'default');
  headerRef.setAttributeNS(
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'r:id',
    'rIdCustomHdr'
  );

  if (sectPr.firstChild) sectPr.insertBefore(headerRef, sectPr.firstChild);
  else sectPr.appendChild(headerRef);

  normalizeSectPrChildOrder(sectPr);
};

export const ensureFinalBodySectPr = (
  docRef: Document,
  targetBody: Element
): Element => {
  const directSectPr = Array.from(targetBody.childNodes).find(
    child => child.nodeType === 1 && getLocalName(child) === 'sectPr'
  ) as Element | undefined;

  if (directSectPr) return directSectPr;

  const sectPr = docRef.createElementNS(W_NS, 'w:sectPr');
  targetBody.appendChild(sectPr);
  return sectPr;
};

const hasMeaningfulText = (p: Element): boolean => {
  const textNodes = Array.from(p.getElementsByTagNameNS(W_NS, 't'));

  return textNodes.some(t => {
    const value = t.textContent || '';
    return value.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, '').length > 0;
  });
};

const hasVisualOrProtectedContent = (p: Element): boolean => {
  if (p.getElementsByTagNameNS(W_NS, 'drawing').length > 0) return true;
  if (p.getElementsByTagNameNS(W_NS, 'pict').length > 0) return true;
  if (p.getElementsByTagNameNS(W_NS, 'object').length > 0) return true;

  const brs = Array.from(p.getElementsByTagNameNS(W_NS, 'br'));
  return brs.some(br => getAttrVal(br, 'type') === 'page');
};

const getDirectParagraphSectPr = (p: Element): Element | null => {
  const pPr = Array.from(p.childNodes).find(
    child => child.nodeType === 1 && getLocalName(child) === 'pPr'
  ) as Element | undefined;

  if (!pPr) return null;

  const sectPr = Array.from(pPr.childNodes).find(
    child => child.nodeType === 1 && getLocalName(child) === 'sectPr'
  ) as Element | undefined;

  return sectPr || null;
};

const isLandscapeSectPr = (sectPr: Element): boolean => {
  const pgSz = Array.from(sectPr.getElementsByTagNameNS(W_NS, 'pgSz'))[0];
  if (!pgSz) return false;

  const orient = getAttrVal(pgSz, 'orient');
  const width = Number(getAttrVal(pgSz, 'w') || '0');
  const height = Number(getAttrVal(pgSz, 'h') || '0');

  return orient === 'landscape' || (width > 0 && height > 0 && width > height);
};

const isExplicitPhysicalPageSectionBreak = (sectPr: Element): boolean => {
  const type = Array.from(sectPr.getElementsByTagNameNS(W_NS, 'type'))[0];
  const value = getAttrVal(type, 'val');

  return value === 'nextPage' || value === 'oddPage' || value === 'evenPage';
};

const isFinalBodyParagraph = (body: Element, p: Element): boolean => {
  const bodyElements = Array.from(body.childNodes).filter(
    (node): node is Element => node.nodeType === 1
  );

  for (let i = bodyElements.length - 1; i >= 0; i--) {
    const el = bodyElements[i];
    if (getLocalName(el) === 'sectPr') continue;
    return el === p;
  }

  return false;
};

/**
 * Xóa section break ẩn dư thừa ở giữa thân văn bản.
 *
 * Lỗi thực tế:
 * - Word hiểu paragraph-level w:sectPr không có w:type là section break kiểu next page.
 * - Giao diện preview/HTML thường bỏ qua nên nhìn không có khoảng trắng.
 * - Khi tải file về mở bằng Word, Word render đúng section break nên tự tạo vùng trắng lớn.
 *
 * Nguyên tắc:
 * - Không đụng section landscape.
 * - Không đụng section break có type nextPage/oddPage/evenPage rõ ràng.
 * - Không xóa section cuối tài liệu.
 * - Với paragraph rỗng chỉ chứa sectPr dư thừa: xóa cả paragraph.
 * - Với paragraph có chữ nhưng chứa sectPr dư thừa: xóa riêng sectPr khỏi pPr.
 */
export const removeEmptyNonPageSectionParagraphs = (doc: Document): number => {
  const body = getNodes(doc, 'body')[0];
  if (!body) return 0;

  const bodyChildren = Array.from(body.childNodes).filter(
    (node): node is Element => node.nodeType === 1
  );

  let removed = 0;

  for (const el of bodyChildren) {
    if (getLocalName(el) !== 'p') continue;

    const sectPr = getDirectParagraphSectPr(el);
    if (!sectPr) continue;

    if (isFinalBodyParagraph(body, el)) continue;
    if (isLandscapeSectPr(sectPr)) continue;
    if (isExplicitPhysicalPageSectionBreak(sectPr)) continue;

    const pPr = Array.from(el.childNodes).find(
      child => child.nodeType === 1 && getLocalName(child) === 'pPr'
    ) as Element | undefined;

    if (!pPr) continue;

    if (!hasMeaningfulText(el) && !hasVisualOrProtectedContent(el)) {
      el.parentNode?.removeChild(el);
      removed += 1;
      continue;
    }

    pPr.removeChild(sectPr);
    removed += 1;
  }

  return removed;
};