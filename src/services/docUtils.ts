import { HeaderType } from '../types';

export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const TWIPS_PER_CM = 567;
export const TWIPS_PER_PT = 20;

export const DOC_TYPE_KEYWORDS = [
  "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "CHỈ THỊ", "KẾT LUẬN", "QUY CHẾ", "QUY ĐỊNH", 
  "HƯỚNG DẪN", "BÁO CÁO", "KẾ HOẠCH", "CHƯƠNG TRÌNH", "THÔNG BÁO", "THÔNG TRI", 
  "CÔNG VĂN", "TỜ TRÌNH", "BIÊN BẢN", "PHƯƠNG ÁN", "ĐỀ ÁN", "DỰ ÁN", 
  "HỢP ĐỒNG", "BẢN THỎA THUẬN", "GIẤY ỦY QUYỀN", "GIẤY MỜI", "GIẤY GIỚI THIỆU", "GIẤY NGHỈ PHÉP"
];

export const ACRONYMS_LIST = [
  "UBND", "THCS", "THPT", "BGDĐT", "SGDĐT", "PGDĐT", "ĐTN", "CĐ", "ĐCS", "VN", 
  "GDĐT", "CNTT", "KHTN", "KHXH", "GDCD", "TDTT", "BCH", "CSCS", "CMHS", "ĐĐ", 
  "BĐD", "STT", "GV", "HS", "SKKN",
  "NQ", "QĐ", "CT", "KL", "QC", "QYĐ", "HD", "BC", "KH", "CTR", "TB", "TTR", "CV", "BB",
  "PA", "ĐA", "DA", "HĐ", "BTT", "GUQ", "GM", "GGT", "GNP"
];

export const DEFAULT_OPTIONS: any = {
  headerType: HeaderType.NONE,
  removeNumbering: false,
  margins: { top: 2, bottom: 2, left: 3, right: 1.5 },
  font: { family: "Times New Roman", sizeNormal: 14, sizeTable: 13 },
  paragraph: { lineSpacing: 1.15, after: 6, indent: 1.27 },
  table: { rowHeight: 0.8 },
  isCongVan: false,
  congVanSummary: "",
  approverTitle: "",
  approverName: "",
  isDraft: false 
};

export const setAttr = (el: Element, name: string, value: string) => {
    try { el.setAttributeNS(W_NS, `w:${name}`, value); } catch(e) {}
    el.setAttribute(`w:${name}`, value);
};

export const getNodes = (parent: Element | Document, tagName: string): Element[] => {
    let els = Array.from(parent.getElementsByTagName(`w:${tagName}`));
    if (els.length === 0) els = Array.from(parent.getElementsByTagNameNS(W_NS, tagName));
    if (els.length === 0) els = Array.from(parent.getElementsByTagName(tagName));
    return els;
};

export const getOrCreate = (parent: Element, tagName: string): Element => {
    let child = getNodes(parent, tagName.replace("w:", ""))[0];
    if (!child) {
        child = parent.ownerDocument.createElementNS(W_NS, tagName);
        if (tagName.endsWith("Pr") && parent.firstChild) {
            parent.insertBefore(child, parent.firstChild);
        } else {
            parent.appendChild(child);
        }
    }
    return child;
};

export const forceBoldNode = (rPr: Element) => {
    const b = getOrCreate(rPr, "w:b");
    b.removeAttributeNS(W_NS, "val"); b.removeAttribute("w:val");
    const bCs = getOrCreate(rPr, "w:bCs");
    bCs.removeAttributeNS(W_NS, "val"); bCs.removeAttribute("w:val");
};

export const removeBoldNode = (rPr: Element) => {
    const bNodes = getNodes(rPr, "b");
    bNodes.forEach(b => rPr.removeChild(b));
    const bCsNodes = getNodes(rPr, "bCs");
    bCsNodes.forEach(bCs => rPr.removeChild(bCs));
};

export const forceParagraphBold = (pPr: Element) => {
    const rPr = getOrCreate(pPr, "w:rPr");
    forceBoldNode(rPr);
};

export const smartNormalizeText = (text: string): string => {
    let t = text.trim();
    if (!t) return "";
    const lowerRegex = /[a-zàáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽềềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỷỹỵ]/;
    const specialRegex = /[0-9\-\/]/;
    t = t.split(/\s+/).map(word => {
        if (lowerRegex.test(word) || specialRegex.test(word)) return word;
        return word.replace(/[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỶỸỴ]+/g, (match) => {
            if (ACRONYMS_LIST.includes(match)) return match;
            return match.toLowerCase();
        });
    }).join(' ');
    if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
    return t;
};

export const normalizeSummary = (text: string): string => {
    let summary = text.trim();
    if (!summary) return "";
    summary = summary.replace(/^[:-]\s*/, '').trim();
    summary = smartNormalizeText(summary);
    summary = summary.replace(/(^|\s)(?:-|–)?\s*tháng\s+(\d{1,2})(?:\/|-)(\d{4})/gi, (match, prefix, m, y) => {
        return `${prefix}tháng ${m.padStart(2, '0')} năm ${y}`;
    });
    const currentYear = new Date().getFullYear();
    summary = summary.replace(/(^|\s)(?:-|–)?\s*tháng\s+(\d{1,2})\b(?!\s*năm|\/|-)/gi, (match, prefix, m) => {
        return `${prefix}tháng ${m.padStart(2, '0')} năm ${currentYear}`;
    });
    return summary.trim();
};

export const cleanPunctuation = (text: string): string => {
    let t = text;
    t = t.replace(/\s+([,\.:;!?])/g, '$1');
    t = t.replace(/([,\.:;!?])([^\s\d\)"'”’])/g, '$1 $2');
    t = t.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return t;
};

export const isParagraphBold = (p: Element): boolean => {
    const runs = getNodes(p, "r");
    for (const r of runs) {
        const t = getNodes(r, "t")[0];
        if (t && t.textContent && t.textContent.trim().length > 0) {
            const rPr = getNodes(r, "rPr")[0];
            if (rPr) {
                const b = getNodes(rPr, "b")[0];
                if (b) {
                    const val = b.getAttributeNS(W_NS, "val") || b.getAttribute("w:val");
                    if (val !== "false" && val !== "0") return true;
                }
            }
        }
    }
    return false;
};

export const isTableParagraph = (p: Element): boolean => {
    let parent = p.parentNode;
    while(parent) {
      const nodeName = parent.nodeName;
      if (nodeName === 'w:tbl' || nodeName === 'tbl') return true;
      parent = parent.parentNode;
    }
    return false;
};

export const enforceSchema = (doc: Document) => {
    const schema: Record<string, string[]> = {
        "w:pPr": [ "w:pStyle", "w:keepNext", "w:keepLines", "w:pageBreakBefore", "w:framePr", "w:widowControl", "w:numPr", "w:suppressLineNumbers", "w:pBdr", "w:shd", "w:tabs", "w:suppressAutoHyphens", "w:kinsoku", "w:wordWrap", "w:overflowPunct", "w:topLinePunct", "w:autoSpaceDE", "w:autoSpaceDN", "w:bidi", "w:adjustRightInd", "w:snapToGrid", "w:spacing", "w:ind", "w:contextualSpacing", "w:mirrorIndents", "w:suppressOverlap", "w:jc", "w:textDirection", "w:textAlignment", "w:textboxTightWrap", "w:outlineLvl", "w:divId", "w:cnfStyle", "w:rPr", "w:sectPr", "w:pPrChange" ],
        "w:rPr": [ "w:rStyle", "w:rFonts", "w:b", "w:bCs", "w:i", "w:iCs", "w:caps", "w:smallCaps", "w:strike", "w:dstrike", "w:outline", "w:shadow", "w:emboss", "w:imprint", "w:noProof", "w:snapToGrid", "w:vanish", "w:webHidden", "w:color", "w:spacing", "w:w", "w:kern", "w:position", "w:sz", "w:szCs", "w:highlight", "w:u", "w:effect", "w:bdr", "w:shd", "w:fitText", "w:vertAlign", "w:rtl", "w:cs", "w:em", "w:lang", "w:eastAsianLayout", "w:specVanish", "w:oMath", "w:rPrChange" ],
        "w:tblPr": [ "w:tblStyle", "w:tblpPr", "w:tblOverlap", "w:bidiVisual", "w:tblStyleRowBandSize", "w:tblStyleColBandSize", "w:tblW", "w:jc", "w:tblCellSpacing", "w:tblInd", "w:tblBorders", "w:shd", "w:tblLayout", "w:tblCellMar", "w:tblLook", "w:tblCaption", "w:tblDescription", "w:tblPrChange" ],
        "w:sectPr": [ "w:headerReference", "w:footerReference", "w:footnotePr", "w:endnotePr", "w:type", "w:pgSz", "w:pgMar", "w:paperSrc", "w:bidi", "w:rtlGutter", "w:docGrid", "w:printerSettings", "w:titlePg", "w:textDirection", "w:sectPrChange" ]
    };
    Object.keys(schema).forEach(tagName => {
        let elements = Array.from(doc.getElementsByTagName(tagName));
        if (elements.length === 0) {
            const localName = tagName.split(":")[1];
            elements = Array.from(doc.getElementsByTagNameNS(W_NS, localName));
        }
        elements.forEach(el => {
            const order = schema[tagName];
            const elementsMap = new Map<string, Element[]>();
            const unknownElements: Element[] = [];
            Array.from(el.childNodes).forEach(child => {
                if (child.nodeType === 1) { 
                    const childName = child.nodeName.includes(":") ? child.nodeName : `w:${child.nodeName}`;
                    if (order.includes(childName)) {
                        if (!elementsMap.has(childName)) elementsMap.set(childName, []);
                        elementsMap.get(childName)!.push(child as Element);
                    } else { unknownElements.push(child as Element); }
                }
            });
            Array.from(el.childNodes).forEach(child => { if (child.nodeType === 1) el.removeChild(child); });
            order.forEach(childName => {
                if (elementsMap.has(childName)) elementsMap.get(childName)!.forEach(childEl => el.appendChild(childEl));
            });
            unknownElements.forEach(childEl => el.appendChild(childEl));
        });
    });
};