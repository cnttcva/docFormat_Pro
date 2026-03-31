import JSZip from 'jszip';
import { ProcessResult, DocxOptions, HeaderType } from '../types';

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TWIPS_PER_CM = 567;
const TWIPS_PER_PT = 20;

const DOC_TYPE_KEYWORDS = [
  "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "CHỈ THỊ", "KẾT LUẬN", "QUY CHẾ", "QUY ĐỊNH", 
  "HƯỚNG DẪN", "BÁO CÁO", "KẾ HOẠCH", "CHƯƠNG TRÌNH", "THÔNG BÁO", "THÔNG TRI", 
  "CÔNG VĂN", "TỜ TRÌNH", "BIÊN BẢN", "PHƯƠNG ÁN", "ĐỀ ÁN", "DỰ ÁN", 
  "HỢP ĐỒNG", "BẢN THỎA THUẬN", "GIẤY ỦY QUYỀN", "GIẤY MỜI", "GIẤY GIỚI THIỆU", "GIẤY NGHỈ PHÉP"
];

const DEFAULT_OPTIONS: any = {
  headerType: HeaderType.NONE,
  removeNumbering: false,
  margins: { top: 2, bottom: 2, left: 3, right: 1.5 },
  font: { family: "Times New Roman", sizeNormal: 14, sizeTable: 13 },
  paragraph: { lineSpacing: 1.15, after: 6, indent: 1.27 },
  table: { rowHeight: 0.8 },
  isCongVan: false,
  congVanSummary: ""
};

const ACRONYMS_LIST = [
  "UBND", "THCS", "THPT", "BGDĐT", "SGDĐT", "PGDĐT", "ĐTN", "CĐ", "ĐCS", "VN", 
  "GDĐT", "CNTT", "KHTN", "KHXH", "GDCD", "TDTT", "BCH", "CSCS", "CMHS", "ĐĐ", 
  "BĐD", "STT", "GV", "HS", "SKKN",
  "NQ", "QĐ", "CT", "KL", "QC", "QYĐ", "HD", "BC", "KH", "CTR", "TB", "TTR", "CV", "BB",
  "PA", "ĐA", "DA", "HĐ", "BTT", "GUQ", "GM", "GGT", "GNP"
];

const setAttr = (el: Element, name: string, value: string) => {
    el.setAttributeNS(W_NS, `w:${name}`, value);
};

const smartNormalizeText = (text: string): string => {
    let t = text.trim();
    if (!t) return "";
    const lowerRegex = /[a-zàáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽềềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỷỹỵ]/;
    const specialRegex = /[0-9\-\/]/;
    
    t = t.split(/\s+/).map(word => {
        if (lowerRegex.test(word) || specialRegex.test(word)) {
            return word;
        }
        return word.replace(/[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỶỸỴ]+/g, (match) => {
            if (ACRONYMS_LIST.includes(match)) return match;
            return match.toLowerCase();
        });
    }).join(' ');

    if (t.length > 0) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    return t;
};

const normalizeTableHeader = (text: string): string => {
    let t = text.trim();
    if (!t) return "";
    t = t.toLowerCase();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    ACRONYMS_LIST.forEach(acro => {
        const regex = new RegExp(`\\b${acro.toLowerCase()}\\b`, 'gi');
        t = t.replace(regex, acro);
    });
    return t;
};

const normalizeSummary = (text: string): string => {
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

const isParagraphBold = (p: Element): boolean => {
    const runs = Array.from(p.getElementsByTagNameNS(W_NS, "r"));
    for (const r of runs) {
        const t = r.getElementsByTagNameNS(W_NS, "t")[0];
        if (t && t.textContent && t.textContent.trim().length > 0) {
            const rPr = r.getElementsByTagNameNS(W_NS, "rPr")[0];
            if (rPr) {
                const b = rPr.getElementsByTagNameNS(W_NS, "b")[0];
                if (b) {
                    const val = b.getAttributeNS(W_NS, "val") || b.getAttribute("w:val");
                    if (val !== "false" && val !== "0") return true;
                }
            }
        }
    }
    return false;
};

const enforceSchema = (doc: Document) => {
    const schema: Record<string, string[]> = {
        "w:pPr": [
            "w:pStyle", "w:keepNext", "w:keepLines", "w:pageBreakBefore", "w:framePr", "w:widowControl", 
            "w:numPr", "w:suppressLineNumbers", "w:pBdr", "w:shd", "w:tabs", "w:suppressAutoHyphens", 
            "w:kinsoku", "w:wordWrap", "w:overflowPunct", "w:topLinePunct", "w:autoSpaceDE", "w:autoSpaceDN", 
            "w:bidi", "w:adjustRightInd", "w:snapToGrid", "w:spacing", "w:ind", "w:contextualSpacing", 
            "w:mirrorIndents", "w:suppressOverlap", "w:jc", "w:textDirection", "w:textAlignment", 
            "w:textboxTightWrap", "w:outlineLvl", "w:divId", "w:cnfStyle", "w:rPr", "w:sectPr", "w:pPrChange"
        ],
        "w:rPr": [
            "w:rStyle", "w:rFonts", "w:b", "w:bCs", "w:i", "w:iCs", "w:caps", "w:smallCaps", "w:strike", 
            "w:dstrike", "w:outline", "w:shadow", "w:emboss", "w:imprint", "w:noProof", "w:snapToGrid", 
            "w:vanish", "w:webHidden", "w:color", "w:spacing", "w:w", "w:kern", "w:position", "w:sz", "w:szCs", 
            "w:highlight", "w:u", "w:effect", "w:bdr", "w:shd", "w:fitText", "w:vertAlign", "w:rtl", "w:cs", 
            "w:em", "w:lang", "w:eastAsianLayout", "w:specVanish", "w:oMath", "w:rPrChange"
        ],
        "w:tblPr": [
            "w:tblStyle", "w:tblpPr", "w:tblOverlap", "w:bidiVisual", "w:tblStyleRowBandSize", 
            "w:tblStyleColBandSize", "w:tblW", "w:jc", "w:tblCellSpacing", "w:tblInd", "w:tblBorders", 
            "w:shd", "w:tblLayout", "w:tblCellMar", "w:tblLook", "w:tblCaption", "w:tblDescription", "w:tblPrChange"
        ],
        "w:sectPr": [
            "w:headerReference", "w:footerReference", "w:footnotePr", "w:endnotePr",
            "w:type", "w:pgSz", "w:pgMar", "w:paperSrc", "w:bidi", "w:rtlGutter",
            "w:docGrid", "w:printerSettings", "w:titlePg", "w:textDirection", "w:sectPrChange"
        ]
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
                    } else {
                        unknownElements.push(child as Element);
                    }
                }
            });

            Array.from(el.childNodes).forEach(child => {
                if (child.nodeType === 1) el.removeChild(child);
            });

            order.forEach(childName => {
                if (elementsMap.has(childName)) {
                    elementsMap.get(childName)!.forEach(childEl => el.appendChild(childEl));
                }
            });

            unknownElements.forEach(childEl => el.appendChild(childEl));
        });
    });
};

export const processDocx = async (file: File, options: any = DEFAULT_OPTIONS): Promise<ProcessResult> => {
  const logs: string[] = [];
  try {
    logs.push(`Loading file: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlPath = "word/document.xml";
    const docXmlContent = await zip.file(docXmlPath)?.async("string");

    if (!docXmlContent) throw new Error("Invalid DOCX: missing word/document.xml");

    const parser = new DOMParser();
    const doc = parser.parseFromString(docXmlContent, "application/xml");
    const body = doc.getElementsByTagNameNS(W_NS, "body")[0] || doc.getElementsByTagName("w:body")[0];
    
    const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);
    const getOrCreate = (parent: Element, tagName: string): Element => {
      let child = parent.getElementsByTagName(tagName)[0];
      if (!child) {
          const localName = tagName.includes(":") ? tagName.split(":")[1] : tagName;
          child = parent.getElementsByTagNameNS(W_NS, localName)[0];
      }
      if (!child) {
        child = doc.createElementNS(W_NS, tagName);
        if (tagName.endsWith("Pr") && parent.firstChild) {
            parent.insertBefore(child, parent.firstChild);
        } else {
            parent.appendChild(child);
        }
      }
      return child;
    };

    const isTableParagraph = (p: Element): boolean => {
      let parent = p.parentNode;
      while(parent) {
        if (parent.nodeName === 'w:tbl' || parent.nodeName === 'tbl') return true;
        parent = parent.parentNode;
      }
      return false;
    };

    const paragraphsForCleaning = Array.from(doc.getElementsByTagName("w:p"));
    if (paragraphsForCleaning.length === 0) paragraphsForCleaning.push(...Array.from(doc.getElementsByTagNameNS(W_NS, "p")));

    for (const p of paragraphsForCleaning) {
        const textNodes = Array.from(p.getElementsByTagName("w:t"));
        if (textNodes.length === 0) textNodes.push(...Array.from(p.getElementsByTagNameNS(W_NS, "t")));
        
        if (textNodes.length > 0) {
            const firstNode = textNodes[0];
            if (firstNode.textContent) firstNode.textContent = firstNode.textContent.trimStart();
            const lastNode = textNodes[textNodes.length - 1];
            if (lastNode.textContent) lastNode.textContent = lastNode.textContent.trimEnd();
        }
    }

    if (options.removeNumbering) {
        const allParagraphs = Array.from(doc.getElementsByTagNameNS(W_NS, "p"));
        for (const p of allParagraphs) {
            const pPr = p.getElementsByTagNameNS(W_NS, "pPr")[0] || p.getElementsByTagName("w:pPr")[0];
            if (pPr) {
                const numPr = pPr.getElementsByTagNameNS(W_NS, "numPr")[0] || pPr.getElementsByTagName("w:numPr")[0];
                if (numPr) pPr.removeChild(numPr);
                const pStyle = getOrCreate(pPr, "w:pStyle");
                setAttr(pStyle, "val", "Normal");
            }
            const firstRun = p.getElementsByTagNameNS(W_NS, "r")[0] || p.getElementsByTagName("w:r")[0];
            if (firstRun) {
                const firstText = firstRun.getElementsByTagNameNS(W_NS, "t")[0] || firstRun.getElementsByTagName("w:t")[0];
                if (firstText && firstText.textContent) {
                    const bulletRegex = /^[\s]*([•\-\–\—\*]|(\d+\.))[\s]+/;
                    if (bulletRegex.test(firstText.textContent)) {
                        firstText.textContent = firstText.textContent.replace(bulletRegex, "").trimStart();
                    }
                }
            }
        }
    }

    let sectPrsDoc = Array.from(doc.getElementsByTagName("w:sectPr"));
    if (sectPrsDoc.length === 0) sectPrsDoc = Array.from(doc.getElementsByTagNameNS(W_NS, "sectPr"));

    for (const sectPr of sectPrsDoc) {
        let pgSz = Array.from(sectPr.childNodes).find(n => n.nodeType === 1 && (n as Element).localName === "pgSz") as Element;
        if (!pgSz) {
            pgSz = doc.createElementNS(W_NS, "w:pgSz");
            if (sectPr.firstChild) sectPr.insertBefore(pgSz, sectPr.firstChild);
            else sectPr.appendChild(pgSz);
        }
        
        const orient = pgSz.getAttributeNS(W_NS, "orient") || pgSz.getAttribute("w:orient");
        const wStr = pgSz.getAttributeNS(W_NS, "w") || pgSz.getAttribute("w:w");
        const hStr = pgSz.getAttributeNS(W_NS, "h") || pgSz.getAttribute("w:h");
        
        const w = parseInt(wStr || "0");
        const h = parseInt(hStr || "0");
        const isLandscape = orient === "landscape" || w > h;

        if (isLandscape) {
            setAttr(pgSz, "w", "16838"); 
            setAttr(pgSz, "h", "11906");
            setAttr(pgSz, "orient", "landscape");
        } else {
            setAttr(pgSz, "w", "11906"); 
            setAttr(pgSz, "h", "16838");
            pgSz.removeAttributeNS(W_NS, "orient");
            pgSz.removeAttribute("w:orient");
        }

        let pgMar = Array.from(sectPr.childNodes).find(n => n.nodeType === 1 && (n as Element).localName === "pgMar") as Element;
        if (!pgMar) {
            pgMar = doc.createElementNS(W_NS, "w:pgMar");
            sectPr.insertBefore(pgMar, pgSz.nextSibling); 
        }
        
        setAttr(pgMar, "top", String(Math.round(options.margins.top * TWIPS_PER_CM)));
        setAttr(pgMar, "bottom", String(Math.round(options.margins.bottom * TWIPS_PER_CM)));
        setAttr(pgMar, "left", String(Math.round(options.margins.left * TWIPS_PER_CM)));
        setAttr(pgMar, "right", String(Math.round(options.margins.right * TWIPS_PER_CM)));
    }

    const rebuildParagraph = (p: Element, text: string, isBold: boolean, fontSize: string, isTitle: boolean) => {
        Array.from(p.childNodes).forEach(child => {
            const localName = child.nodeName.includes(":") ? child.nodeName.split(":")[1] : child.nodeName;
            if (localName !== "pPr") p.removeChild(child);
        });
        const r = doc.createElementNS(W_NS, "w:r");
        const rPr = doc.createElementNS(W_NS, "w:rPr");
        r.appendChild(rPr); 
        const pPr = getOrCreate(p, "w:pPr");
        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");
        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        ind.removeAttributeNS(W_NS, "hanging");
        ind.removeAttribute("w:hanging");
        
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", isTitle ? "480" : "0");
        setAttr(spacing, "after", "0"); 
        setAttr(spacing, "line", "240");
        setAttr(spacing, "lineRule", "auto");
        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", options.font.family);
        setAttr(rFonts, "hAnsi", options.font.family);
        setAttr(rFonts, "cs", options.font.family);
        setAttr(rFonts, "eastAsia", options.font.family);
        const b = getOrCreate(rPr, "w:b");
        setAttr(b, "val", isBold ? "true" : "false"); 
        const iEl = getOrCreate(rPr, "w:i");
        setAttr(iEl, "val", "false");
        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", fontSize);
        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", fontSize);
        const t = doc.createElementNS(W_NS, "w:t");
        t.textContent = text;
        r.appendChild(t);
        p.appendChild(r);
    };

    const createTitleUnderlineFrag = (protectedElements: Set<Element>, lineTables: Set<Element>): DocumentFragment => {
        const frag = doc.createDocumentFragment();
        const tbl = doc.createElementNS(W_NS, "w:tbl");
        lineTables.add(tbl); 
        const tblPr = doc.createElementNS(W_NS, "w:tblPr");
        tbl.appendChild(tblPr);
        const jcTbl = doc.createElementNS(W_NS, "w:jc");
        setAttr(jcTbl, "val", "center");
        tblPr.appendChild(jcTbl);
        
        const tblW = doc.createElementNS(W_NS, "w:tblW");
        setAttr(tblW, "w", "1500");
        setAttr(tblW, "type", "dxa");
        tblPr.appendChild(tblW); 
        
        const tblLayout = doc.createElementNS(W_NS, "w:tblLayout");
        setAttr(tblLayout, "type", "fixed");
        tblPr.appendChild(tblLayout);
        
        const tblGrid = doc.createElementNS(W_NS, "w:tblGrid");
        const gridCol = doc.createElementNS(W_NS, "w:gridCol");
        setAttr(gridCol, "w", "1500");
        tblGrid.appendChild(gridCol);
        tbl.appendChild(tblGrid);
        
        const tr = doc.createElementNS(W_NS, "w:tr");
        tbl.appendChild(tr);
        const trPr = doc.createElementNS(W_NS, "w:trPr");
        const trHeight = doc.createElementNS(W_NS, "w:trHeight");
        setAttr(trHeight, "val", String(Math.round(0.1 * TWIPS_PER_CM)));
        setAttr(trHeight, "hRule", "exact");
        trPr.appendChild(trHeight);
        tr.appendChild(trPr);
        
        const tc = doc.createElementNS(W_NS, "w:tc");
        tr.appendChild(tc);
        const tcPr = doc.createElementNS(W_NS, "w:tcPr");
        tc.appendChild(tcPr);
        const tcW = doc.createElementNS(W_NS, "w:tcW");
        setAttr(tcW, "w", "1500");
        setAttr(tcW, "type", "dxa");
        tcPr.appendChild(tcW);
        
        const tcMar = doc.createElementNS(W_NS, "w:tcMar");
        ["top", "bottom", "left", "right"].forEach(side => {
            const mar = doc.createElementNS(W_NS, `w:${side}`);
            setAttr(mar, "w", "0");
            setAttr(mar, "type", "dxa");
            tcMar.appendChild(mar);
        });
        tcPr.appendChild(tcMar);

        const tcBorders = doc.createElementNS(W_NS, "w:tcBorders");
        const top = doc.createElementNS(W_NS, "w:top");
        setAttr(top, "val", "single");
        setAttr(top, "sz", "6"); 
        setAttr(top, "space", "0");
        setAttr(top, "color", "000000");
        tcBorders.appendChild(top);
        tcPr.appendChild(tcBorders);
        
        const p = doc.createElementNS(W_NS, "w:p");
        const pPr = doc.createElementNS(W_NS, "w:pPr");
        p.appendChild(pPr);
        const spacing = doc.createElementNS(W_NS, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "120"); // Lớp đệm 6pt mượt mà phía dưới
        setAttr(spacing, "line", "24"); 
        setAttr(spacing, "lineRule", "exact");
        pPr.appendChild(spacing);
        tc.appendChild(p);
        protectedElements.add(p);
        frag.appendChild(tbl);
        return frag;
    };

    const createPartyDashLine = (protectedElements: Set<Element>): Element => {
        const p = doc.createElementNS(W_NS, "w:p");
        const pPr = getOrCreate(p, "w:pPr");
        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");
        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        ind.removeAttributeNS(W_NS, "hanging");
        ind.removeAttribute("w:hanging");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "120"); // Lớp đệm 6pt
        setAttr(spacing, "line", "240"); 
        setAttr(spacing, "lineRule", "auto");
        const r = doc.createElementNS(W_NS, "w:r");
        const rPr = getOrCreate(r, "w:rPr");
        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", options.font.family);
        setAttr(rFonts, "hAnsi", options.font.family);
        setAttr(rFonts, "cs", options.font.family);
        setAttr(rFonts, "eastAsia", options.font.family);
        const b = getOrCreate(rPr, "w:b");
        setAttr(b, "val", "false"); 
        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", String(options.font.sizeNormal * 2));
        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", String(options.font.sizeNormal * 2));
        const t = doc.createElementNS(W_NS, "w:t");
        t.textContent = "-----";
        r.appendChild(t);
        p.appendChild(r);
        protectedElements.add(p);
        return p;
    };

    const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
    if (paragraphs.length === 0) paragraphs.push(...Array.from(doc.getElementsByTagNameNS(W_NS, "p")));
    
    let detectedDocType = ""; 
    const docTypeElements = new Set<Element>();
    const abstractElements = new Set<Element>();
    const protectedElements = new Set<Element>();
    const lineTables = new Set<Element>();

    const limit = Math.min(paragraphs.length, 20); 
    
    for (let i = 0; i < limit; i++) {
        const p = paragraphs[i];
        if (isTableParagraph(p)) continue;
        const text = p.textContent?.trim() || "";
        if (!text) continue;

        if (options.isCongVan) {
            const upperText = text.toUpperCase();
            if (upperText === "CÔNG VĂN" || upperText.startsWith("V/V") || upperText.startsWith("VỀ VIỆC") || upperText.startsWith("TRÍCH YẾU")) {
                abstractElements.add(p);
                p.parentNode?.removeChild(p);
            }
            continue; 
        }

        const cleanText = text.toUpperCase().replace(/^[^A-ZÀ-Ỹ]+/, '');
        const matchedKeyword = DOC_TYPE_KEYWORDS.find(k => cleanText.startsWith(k));

        if (matchedKeyword) {
            docTypeElements.add(p);
            detectedDocType = matchedKeyword; 
            
            const summaryParagraphs: Element[] = [];
            const originalUpper = text.toUpperCase();
            const keywordIndex = originalUpper.indexOf(matchedKeyword);
            const remainingText = text.slice(keywordIndex + matchedKeyword.length).trim();
            
            rebuildParagraph(p, matchedKeyword, true, "28", true); 

            if (remainingText.length > 3) {
                const newP = doc.createElementNS(W_NS, "w:p");
                if (p.nextSibling) p.parentNode?.insertBefore(newP, p.nextSibling);
                else p.parentNode?.appendChild(newP);
                summaryParagraphs.push(newP);
                rebuildParagraph(newP, normalizeSummary(remainingText), true, String(options.font.sizeNormal * 2), false); 
            }

            let linesCaptured = 0;
            let currentIndex = i + 1; 
            let hasFoundBoldSummary = false; 

            while (currentIndex < paragraphs.length && linesCaptured < 8) { 
                const tempP = paragraphs[currentIndex];
                if (isTableParagraph(tempP)) break;
                const tempText = tempP.textContent?.trim() || "";

                if (tempText.length > 0) {
                    const upperText = tempText.toUpperCase();
                    
                    if (upperText.startsWith("CĂN CỨ") || upperText.startsWith("XÉT") || upperText.startsWith("THEO") || upperText.startsWith("KÍNH GỬI") || upperText.startsWith("HÔM NAY") || upperText.startsWith("THỜI GIAN:") || upperText.startsWith("ĐỒNG KÍNH GỬI")) break;
                    
                    if (upperText.startsWith("HIỆU TRƯỞNG") || upperText.startsWith("GIÁM ĐỐC") || upperText.startsWith("CHỦ TỊCH") || upperText.startsWith("QUYẾT ĐỊNH")) {
                        break;
                    }
                    
                    if (/^([IVXLCDM]+|[0-9]+)[\.\)]\s/.test(tempText)) break;
                    if (tempText.length > 250) break; 

                    const isBold = isParagraphBold(tempP);
                    
                    if (hasFoundBoldSummary && !isBold) break;
                    if (isBold) hasFoundBoldSummary = true;
                    if (!hasFoundBoldSummary && linesCaptured >= 3) break;

                    summaryParagraphs.push(tempP);
                    rebuildParagraph(tempP, normalizeSummary(tempText), true, String(options.font.sizeNormal * 2), false); 
                    linesCaptured++;
                } else {
                    abstractElements.add(tempP);
                }
                currentIndex++;
            }

            summaryParagraphs.forEach(sp => abstractElements.add(sp));

            // PHỤC HỒI ĐƯỜNG KẺ NGANG TRỞ LẠI & DỌN DẸP KHOẢNG TRỐNG
            if (!options.isCongVan) {
                const targetNode = summaryParagraphs.length > 0 ? summaryParagraphs[summaryParagraphs.length - 1] : p;
                
                // --- TÍNH NĂNG BẮN TỈA: XÓA DÒNG TRỐNG THỪA NGAY DƯỚI TRÍCH YẾU ---
                let nextNode = targetNode.nextSibling;
                while (nextNode && (nextNode.nodeName === "w:p" || nextNode.nodeName === "p")) {
                    const el = nextNode as Element;
                    const textNodes = Array.from(el.getElementsByTagName("w:t")).concat(Array.from(el.getElementsByTagNameNS(W_NS, "t")));
                    const text = textNodes.map(n => n.textContent || "").join("").trim();
                    
                    const hasDrawing = el.getElementsByTagName("w:drawing").length > 0 || el.getElementsByTagNameNS(W_NS, "drawing").length > 0;
                    const hasPict = el.getElementsByTagName("w:pict").length > 0 || el.getElementsByTagNameNS(W_NS, "pict").length > 0;
                    const hasObject = el.getElementsByTagName("w:object").length > 0 || el.getElementsByTagNameNS(W_NS, "object").length > 0;
                    const hasSectPr = el.getElementsByTagName("w:sectPr").length > 0 || el.getElementsByTagNameNS(W_NS, "sectPr").length > 0;
                    
                    let hasPageBreak = false;
                    const brs = Array.from(el.getElementsByTagName("w:br")).concat(Array.from(el.getElementsByTagNameNS(W_NS, "br")));
                    for (const br of brs) {
                        if (br.getAttribute("w:type") === "page" || br.getAttributeNS(W_NS, "type") === "page") {
                            hasPageBreak = true;
                            break;
                        }
                    }
                    
                    if (text.length === 0 && !hasDrawing && !hasPict && !hasObject && !hasSectPr && !hasPageBreak) {
                        const toDelete = nextNode;
                        nextNode = nextNode.nextSibling; // Chuyển sang soi dòng kế tiếp
                        toDelete.parentNode?.removeChild(toDelete); // Tiêu diệt dòng trống
                    } else {
                        break; // Có chữ hoặc ảnh thì ngừng xóa
                    }
                }
                // -------------------------------------------------------------

                if (options.headerType === HeaderType.PARTY) {
                    const dashP = createPartyDashLine(protectedElements);
                    if (nextNode) targetNode.parentNode?.insertBefore(dashP, nextNode);
                    else targetNode.parentNode?.appendChild(dashP);
                } else {
                    const underlineFrag = createTitleUnderlineFrag(protectedElements, lineTables);
                    if (nextNode) targetNode.parentNode?.insertBefore(underlineFrag, nextNode);
                    else targetNode.parentNode?.appendChild(underlineFrag);
                }
            }
            break; 
        }
    }

    const finalParagraphs = Array.from(doc.getElementsByTagName("w:p"));
    if (finalParagraphs.length === 0) finalParagraphs.push(...Array.from(doc.getElementsByTagNameNS(W_NS, "p")));

    let inKinhGuiBlock = false;
    let addSpaceBeforeMainContent = false;
    let isBodyArea = true; 

    for (const p of finalParagraphs) {
      if (docTypeElements.has(p) || abstractElements.has(p) || protectedElements.has(p)) continue; 
      
      const pText = p.textContent || "";
      const trimmedPText = pText.trim();
      const upperText = trimmedPText.toUpperCase();

      // CẢM BIẾN CHỮ KÝ (Khóa phần đuôi không dọn rác)
      if (isBodyArea && trimmedPText.length > 0) {
          if (
              upperText.startsWith("NƠI NHẬN:") || 
              upperText === "NƠI NHẬN" ||
              (trimmedPText.length < 40 && (
                  upperText.includes("HIỆU TRƯỞNG") ||
                  upperText.includes("GIÁM ĐỐC") ||
                  upperText.includes("CHỦ TỊCH") ||
                  upperText.includes("BÍ THƯ") ||
                  upperText.includes("BỘ TRƯỞNG") ||
                  upperText.startsWith("KT. ") ||
                  upperText.startsWith("TM. ") ||
                  upperText.startsWith("T/M ") ||
                  upperText === "THỦ TRƯỞNG ĐƠN VỊ" ||
                  upperText === "CHỦ TỌA" ||
                  upperText === "THƯ KÝ" ||
                  upperText === "NGƯỜI LẬP" ||
                  upperText === "NGƯỜI VIẾT"
              ))
          ) {
              isBodyArea = false; 
          }
      }

      const isTable = isTableParagraph(p);

      // CẢM BIẾN DỌN RÁC PHẦN THÂN
      if (isBodyArea && trimmedPText.length === 0 && !isTable) {
          const hasDrawing = p.getElementsByTagName("w:drawing").length > 0 || p.getElementsByTagNameNS(W_NS, "drawing").length > 0;
          const hasPict = p.getElementsByTagName("w:pict").length > 0 || p.getElementsByTagNameNS(W_NS, "pict").length > 0;
          const hasObject = p.getElementsByTagName("w:object").length > 0 || p.getElementsByTagNameNS(W_NS, "object").length > 0;
          const hasSectPr = p.getElementsByTagName("w:sectPr").length > 0 || p.getElementsByTagNameNS(W_NS, "sectPr").length > 0;
          
          let hasPageBreak = false;
          const brs = Array.from(p.getElementsByTagName("w:br")).concat(Array.from(p.getElementsByTagNameNS(W_NS, "br")));
          for (const br of brs) {
              if (br.getAttribute("w:type") === "page" || br.getAttributeNS(W_NS, "type") === "page") {
                  hasPageBreak = true;
                  break;
              }
          }
          
          const hasContent = hasDrawing || hasPict || hasObject || hasSectPr || hasPageBreak;
          
          if (!hasContent) {
              p.parentNode?.removeChild(p);
              continue; 
          }
      }

      if (isTable) continue; 

      const pPr = getOrCreate(p, "w:pPr");

      if (options.isCongVan) {
          if (upperText.startsWith("KÍNH GỬI:") || upperText === "KÍNH GỬI") {
              inKinhGuiBlock = true;
              const jc = getOrCreate(pPr, "w:jc");
              setAttr(jc, "val", "left");
              const ind = getOrCreate(pPr, "w:ind");
              setAttr(ind, "left", "2160"); 
              setAttr(ind, "right", "0");
              setAttr(ind, "firstLine", "0");
              ind.removeAttributeNS(W_NS, "hanging");
              ind.removeAttribute("w:hanging");

              const spacing = getOrCreate(pPr, "w:spacing");
              setAttr(spacing, "before", "240"); 
              setAttr(spacing, "after", "0");

              const targetSize = options.font.sizeNormal * 2;
              const runs = Array.from(p.getElementsByTagName("w:r"));
              if (runs.length === 0) runs.push(...Array.from(p.getElementsByTagNameNS(W_NS, "r")));
              
              for (const r of runs) {
                  const rPr = getOrCreate(r, "w:rPr");
                  const b = getOrCreate(rPr, "w:b");
                  setAttr(b, "val", "true"); 
                  
                  const iEl = rPr.getElementsByTagName("w:i")[0] || rPr.getElementsByTagNameNS(W_NS, "i")[0];
                  if (iEl) setAttr(iEl, "val", "false"); 
                  
                  const sz = getOrCreate(rPr, "w:sz");
                  setAttr(sz, "val", String(targetSize));
                  const szCs = getOrCreate(rPr, "w:szCs");
                  setAttr(szCs, "val", String(targetSize));
              }
              continue; 
          }

          if (inKinhGuiBlock) {
              if (trimmedPText.startsWith("-") || trimmedPText.startsWith("+")) {
                  const jc = getOrCreate(pPr, "w:jc");
                  setAttr(jc, "val", "left");
                  const ind = getOrCreate(pPr, "w:ind");
                  setAttr(ind, "left", "2880");
                  setAttr(ind, "right", "0");
                  setAttr(ind, "firstLine", "0");
                  ind.removeAttributeNS(W_NS, "hanging");
                  ind.removeAttribute("w:hanging");

                  const spacing = getOrCreate(pPr, "w:spacing");
                  setAttr(spacing, "before", "0");
                  setAttr(spacing, "after", "0");

                  const targetSize = options.font.sizeNormal * 2;
                  const runs = Array.from(p.getElementsByTagName("w:r"));
                  if (runs.length === 0) runs.push(...Array.from(p.getElementsByTagNameNS(W_NS, "r")));
                  
                  for (const r of runs) {
                      const rPr = getOrCreate(r, "w:rPr");
                      const b = getOrCreate(rPr, "w:b");
                      setAttr(b, "val", "true"); 
                      
                      const iEl = rPr.getElementsByTagName("w:i")[0] || rPr.getElementsByTagNameNS(W_NS, "i")[0];
                      if (iEl) setAttr(iEl, "val", "false");
                      
                      const sz = getOrCreate(rPr, "w:sz");
                      setAttr(sz, "val", String(targetSize));
                      const szCs = getOrCreate(rPr, "w:szCs");
                      setAttr(szCs, "val", String(targetSize));
                  }
                  continue;
              } else if (trimmedPText.length > 0) {
                  inKinhGuiBlock = false;
                  addSpaceBeforeMainContent = true;
              }
          }
      }

      let isDecisionSpecialLine = false;
      if (detectedDocType === "QUYẾT ĐỊNH" && trimmedPText.length > 0) {
          if (upperText === "QUYẾT ĐỊNH:" || upperText === "QUYẾT ĐỊNH") {
              isDecisionSpecialLine = true;
          } 
          else if (trimmedPText === upperText && trimmedPText.length < 150 && /[A-ZÀ-Ỹ]/.test(upperText)) {
              isDecisionSpecialLine = true;
          }
      }

      if (isDecisionSpecialLine) {
        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "120");
        setAttr(spacing, "after", "120");
        setAttr(spacing, "line", "240"); 
        setAttr(spacing, "lineRule", "auto");
        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        ind.removeAttributeNS(W_NS, "hanging");
        ind.removeAttribute("w:hanging");

        const targetSize = options.font.sizeNormal * 2;
        const runs = Array.from(p.getElementsByTagNameNS(W_NS, "r"));
        for (const r of runs) {
            const rPr = getOrCreate(r, "w:rPr");
            const b = getOrCreate(rPr, "w:b");
            setAttr(b, "val", "true");
            const sz = getOrCreate(rPr, "w:sz");
            setAttr(sz, "val", String(targetSize));
            const szCs = getOrCreate(rPr, "w:szCs");
            setAttr(szCs, "val", String(targetSize));
        }
        continue; 
      }

      const lowerPText = trimmedPText.toLowerCase().replace(/^[\-\+*•\s]+/, '');
      const isBasisLine = lowerPText.startsWith("căn cứ") || lowerPText.startsWith("xét") || lowerPText.startsWith("theo");
      
      let isItalicBasis = false;
      if (isBasisLine) {
          if (detectedDocType === "QUYẾT ĐỊNH" || detectedDocType === "NGHỊ QUYẾT") {
              isItalicBasis = true; 
          }
      }

      const jc = getOrCreate(pPr, "w:jc");
      setAttr(jc, "val", "both");
      const spacing = getOrCreate(pPr, "w:spacing");
      
      if (addSpaceBeforeMainContent) {
          setAttr(spacing, "before", "240"); 
          addSpaceBeforeMainContent = false; 
      } else {
          setAttr(spacing, "before", "0");
      }

      setAttr(spacing, "after", String(Math.round(options.paragraph.after * TWIPS_PER_PT)));
      setAttr(spacing, "line", String(Math.round(options.paragraph.lineSpacing * 240))); 
      setAttr(spacing, "lineRule", "auto");
      const ind = getOrCreate(pPr, "w:ind");
      setAttr(ind, "left", "0");
      setAttr(ind, "right", "0");
      setAttr(ind, "firstLine", String(Math.round(options.paragraph.indent * TWIPS_PER_CM)));
      
      const targetSize = options.font.sizeNormal * 2;
      const runs = Array.from(p.getElementsByTagNameNS(W_NS, "r"));
      for (const r of runs) {
          const rPr = getOrCreate(r, "w:rPr");
          const sz = getOrCreate(rPr, "w:sz");
          setAttr(sz, "val", String(targetSize));
          const szCs = getOrCreate(rPr, "w:szCs");
          setAttr(szCs, "val", String(targetSize));

          if (isBasisLine) {
              const iEl = getOrCreate(rPr, "w:i");
              setAttr(iEl, "val", isItalicBasis ? "true" : "false");
              const iCsEl = getOrCreate(rPr, "w:iCs");
              setAttr(iCsEl, "val", isItalicBasis ? "true" : "false");
              
              const bEl = getOrCreate(rPr, "w:b");
              setAttr(bEl, "val", "false");
              const bCsEl = getOrCreate(rPr, "w:bCs");
              setAttr(bCsEl, "val", "false");
          }
      }
    }

    const tables = Array.from(doc.getElementsByTagName("w:tbl"));
    if (tables.length === 0) tables.push(...Array.from(doc.getElementsByTagNameNS(W_NS, "tbl")));

    for (const tbl of tables) {
        let sttColIndex = -1;

        const rows = Array.from(tbl.getElementsByTagName("w:tr"));
        for (let rIndex = 0; rIndex < rows.length; rIndex++) {
            const tr = rows[rIndex];
            const trPr = getOrCreate(tr, "w:trPr");

            let isHeaderRow = (rIndex === 0);
            if (!isHeaderRow && trPr.getElementsByTagName("w:tblHeader").length > 0) {
                isHeaderRow = true;
            }

            let trHeight = getOrCreate(trPr, "w:trHeight");
            setAttr(trHeight, "val", String(Math.round(options.table.rowHeight * TWIPS_PER_CM))); 
            setAttr(trHeight, "hRule", "atLeast"); 

            const cells = Array.from(tr.getElementsByTagName("w:tc"));
            let logicalColIndex = 0;

            for (const tc of cells) {
                const tcPr = getOrCreate(tc, "w:tcPr");
                const vAlign = getOrCreate(tcPr, "w:vAlign");
                setAttr(vAlign, "val", "center"); 
                
                const gridSpanEl = tcPr.getElementsByTagName("w:gridSpan")[0];
                const gridSpan = gridSpanEl ? parseInt(gridSpanEl.getAttribute("w:val") || "1") : 1;

                const tcParagraphs = Array.from(tc.getElementsByTagName("w:p"));
                
                if (isHeaderRow) {
                    const textNodes = Array.from(tc.getElementsByTagName("w:t"));
                    const rawText = textNodes.map(n => n.textContent || "").join("").trim();
                    const cleanText = rawText.toUpperCase().replace(/\./g, '');
                    if (cleanText === "STT" || cleanText === "SỐ TT") {
                        sttColIndex = logicalColIndex;
                    }
                }

                for (const p of tcParagraphs) {
                    const pPr = getOrCreate(p, "w:pPr");
                    const jc = getOrCreate(pPr, "w:jc");
                    
                    if (isHeaderRow || logicalColIndex === sttColIndex) {
                        setAttr(jc, "val", "center");
                    } else {
                        setAttr(jc, "val", "left");
                    }
                    
                    const ind = getOrCreate(pPr, "w:ind");
                    setAttr(ind, "left", "0");
                    setAttr(ind, "right", "0");
                    setAttr(ind, "firstLine", "0");
                    ind.removeAttribute("w:hanging");

                    const runs = Array.from(p.getElementsByTagName("w:r"));
                    
                    if (isHeaderRow) {
                        const textNodes = Array.from(p.getElementsByTagName("w:t"));
                        const rawText = textNodes.map(n => n.textContent || "").join("").trim();
                        
                        const isLayoutText = /CỘNG HÒA|ĐỘC LẬP|UBND|TRƯỜNG|MẪU|SỞ|PHÒNG/i.test(rawText);
                        const hasLetters = /[A-ZÀ-Ỹa-zà-ỹ]/.test(rawText);
                        
                        if (hasLetters && !isLayoutText && rawText.length < 100) {
                            const cleanT = normalizeTableHeader(rawText);
                            Array.from(p.childNodes).forEach(child => {
                                const localName = child.nodeName.includes(":") ? child.nodeName.split(":")[1] : child.nodeName;
                                if (localName !== "pPr") p.removeChild(child);
                            });
                            
                            const r = doc.createElementNS(W_NS, "w:r");
                            const rPr = doc.createElementNS(W_NS, "w:rPr");
                            r.appendChild(rPr);
                            
                            const b = doc.createElementNS(W_NS, "w:b");
                            setAttr(b, "val", "true"); 
                            rPr.appendChild(b);
                            
                            const targetSz = String(options.font.sizeTable * 2);
                            const sz = doc.createElementNS(W_NS, "w:sz");
                            setAttr(sz, "val", targetSz); 
                            rPr.appendChild(sz);
                            const szCs = doc.createElementNS(W_NS, "w:szCs");
                            setAttr(szCs, "val", targetSz);
                            rPr.appendChild(szCs);
                            
                            const t = doc.createElementNS(W_NS, "w:t");
                            t.textContent = cleanT;
                            r.appendChild(t);
                            p.appendChild(r);
                        } else {
                            for (const r of runs) {
                                const rPr = getOrCreate(r, "w:rPr");
                                const b = getOrCreate(rPr, "w:b");
                                setAttr(b, "val", "true");
                                const targetSz = String(options.font.sizeTable * 2);
                                const sz = getOrCreate(rPr, "w:sz");
                                setAttr(sz, "val", targetSz);
                                const szCs = getOrCreate(rPr, "w:szCs");
                                setAttr(szCs, "val", targetSz);
                            }
                        }
                    } else {
                        for (const r of runs) {
                            const rPr = getOrCreate(r, "w:rPr");
                            const targetSz = String(options.font.sizeTable * 2);
                            const sz = getOrCreate(rPr, "w:sz");
                            setAttr(sz, "val", targetSz); 
                            const szCs = getOrCreate(rPr, "w:szCs");
                            setAttr(szCs, "val", targetSz);
                        }
                    }
                }
                logicalColIndex += gridSpan;
            }
        }
    }
    
    if (options.headerType !== HeaderType.NONE && body) {
        const headerTable = createHeaderTemplate(doc, options);
        if (body.firstChild) body.insertBefore(headerTable, body.firstChild);
        else body.appendChild(headerTable);

        const sectPrs = Array.from(doc.getElementsByTagName("w:sectPr"));
        const lastSectPr = sectPrs.length > 0 ? sectPrs[sectPrs.length - 1] : null;
        
        const blankP = doc.createElementNS(W_NS, "w:p");
        const signatureBlock = createSignatureBlock(doc, options as any, detectedDocType);
        
        if (lastSectPr && lastSectPr.parentNode === body) {
            body.insertBefore(blankP, lastSectPr);
            body.insertBefore(signatureBlock, lastSectPr);
        } else {
            body.appendChild(blankP);
            body.appendChild(signatureBlock);
        }
    }

    const allRunsInDoc = Array.from(doc.getElementsByTagName("w:r"));
    for (const r of allRunsInDoc) { getOrCreate(r, "w:rPr"); }
    const allPPrsInDoc = Array.from(doc.getElementsByTagName("w:pPr"));
    for (const pPr of allPPrsInDoc) { getOrCreate(pPr, "w:rPr"); }

    const allRPrs = Array.from(doc.getElementsByTagName("w:rPr"));
    for (const rPr of allRPrs) {
        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", options.font.family);
        setAttr(rFonts, "hAnsi", options.font.family);
        setAttr(rFonts, "cs", options.font.family);
        setAttr(rFonts, "eastAsia", options.font.family);
        ["asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"].forEach(theme => {
            rFonts.removeAttributeNS(W_NS, theme);
            rFonts.removeAttribute(theme);
            rFonts.removeAttribute(`w:${theme}`);
        });
    }

    const serializer = new XMLSerializer();
    const modifyXmlFonts = async (filePath: string) => {
        const xmlContent = await zip.file(filePath)?.async("string");
        if (xmlContent) {
            const extDoc = parser.parseFromString(xmlContent, "application/xml");
            const getOrCreateExt = (parent: Element, tagName: string): Element => {
                const localName = tagName.includes(":") ? tagName.split(":")[1] : tagName;
                let child = parent.getElementsByTagName(tagName)[0];
                if (!child) {
                    child = extDoc.createElementNS(W_NS, tagName);
                    if (tagName.endsWith("Pr") && parent.firstChild) {
                        parent.insertBefore(child, parent.firstChild);
                    } else {
                        parent.appendChild(child);
                    }
                }
                return child;
            };
            
            const rPrsExt = Array.from(extDoc.getElementsByTagName("w:rPr"));
            for (const rPr of rPrsExt) {
                const rFonts = getOrCreateExt(rPr, "w:rFonts");
                setAttr(rFonts, "ascii", options.font.family);
                setAttr(rFonts, "hAnsi", options.font.family);
                setAttr(rFonts, "cs", options.font.family);
                setAttr(rFonts, "eastAsia", options.font.family);
                ["asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"].forEach(theme => {
                    rFonts.removeAttributeNS(W_NS, theme);
                    rFonts.removeAttribute(theme);
                    rFonts.removeAttribute(`w:${theme}`);
                });
            }
            enforceSchema(extDoc); 
            zip.file(filePath, serializer.serializeToString(extDoc));
        }
    };

    await modifyXmlFonts("word/styles.xml");
    await modifyXmlFonts("word/numbering.xml");

    const sectPrs = Array.from(doc.getElementsByTagName("w:sectPr"));
    for (const sPr of sectPrs) {
        let titlePg = sPr.getElementsByTagName("w:titlePg")[0];
        if (!titlePg) {
            titlePg = doc.createElementNS(W_NS, "w:titlePg");
            sPr.appendChild(titlePg);
        }
        
        const headerRefs = Array.from(sPr.getElementsByTagName("w:headerReference"));
        for (const hr of headerRefs) {
            if (hr.getAttribute("w:type") === "default") {
                sPr.removeChild(hr);
            }
        }
        const newHdrRef = doc.createElementNS(W_NS, "w:headerReference");
        setAttr(newHdrRef, "type", "default");
        newHdrRef.setAttribute("r:id", "rIdCustomHdr");
        sPr.appendChild(newHdrRef);
    }

    enforceSchema(doc);

    const fontSize = options.font.sizeTable * 2;
    const fontFamily = options.font.family;
    const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
                <w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr>
                <w:fldChar w:fldCharType="begin"/>
            </w:r>
            <w:r>
                <w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr>
                <w:instrText xml:space="preserve"> PAGE </w:instrText>
            </w:r>
            <w:r>
                <w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/><w:noProof/></w:rPr>
                <w:fldChar w:fldCharType="separate"/>
            </w:r>
            <w:r>
                <w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/><w:noProof/></w:rPr>
                <w:t></w:t>
            </w:r>
            <w:r>
                <w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr>
                <w:fldChar w:fldCharType="end"/>
            </w:r>
        </w:p>
    </w:hdr>`;
    zip.file("word/header_custom.xml", headerXml);

    let contentTypesXml = await zip.file("[Content_Types].xml")?.async("string");
    if (contentTypesXml && !contentTypesXml.includes('PartName="/word/header_custom.xml"')) {
        contentTypesXml = contentTypesXml.replace(
            '</Types>',
            '<Override PartName="/word/header_custom.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>'
        );
        zip.file("[Content_Types].xml", contentTypesXml);
    }

    let relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
    if (relsXml && !relsXml.includes('Target="header_custom.xml"')) {
        relsXml = relsXml.replace(
            '</Relationships>',
            '<Relationship Id="rIdCustomHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header_custom.xml"/></Relationships>'
        );
        zip.file("word/_rels/document.xml.rels", relsXml);
    }

    const newDocXml = serializer.serializeToString(doc);
    zip.file(docXmlPath, newDocXml);
    const generatedBlob = await zip.generateAsync({ type: "blob" });

    return { success: true, blob: generatedBlob, fileName: `formatted_${file.name}`, logs };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", logs };
  }
};

const createHeaderTemplate = (doc: Document, options: any): Element => {
    const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);
    const getOrCreate = (parent: Element, tagName: string): Element => {
      let child = parent.getElementsByTagName(tagName)[0];
      if (!child) {
        child = doc.createElementNS(W_NS, tagName);
        if (tagName.endsWith("Pr") && parent.firstChild) {
            parent.insertBefore(child, parent.firstChild);
        } else {
            parent.appendChild(child);
        }
      }
      return child;
    };

    const org = options.orgInfo || {
       governingBody: "UBND XÃ EA KAR",
       orgName: "TRƯỜNG THCS CHU VĂN AN",
       partyUpper: "ĐẢNG BỘ XÃ EA KAR",
       partyCell: "CHI BỘ TRƯỜNG THCS CHU VĂN AN",
       location: "Ea Kar",
       departmentName: "TỔ CHUYÊN MÔN"
    };

    const createStyledP = (text: string, isBold: boolean, isItalic: boolean, customSize?: number): Element => {
        const p = createElement("w:p");
        const pPr = getOrCreate(p, "w:pPr");
        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");
        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "240"); 
        setAttr(spacing, "lineRule", "auto");
        const r = createElement("w:r");
        p.appendChild(r);
        const rPr = getOrCreate(r, "w:rPr");
        const sizeToUse = customSize ? customSize * 2 : options.font.sizeTable * 2;
        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", String(sizeToUse));
        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", String(sizeToUse));
        if (isBold) rPr.appendChild(createElement("w:b"));
        if (isItalic) rPr.appendChild(createElement("w:i"));
        const t = createElement("w:t");
        t.textContent = text;
        r.appendChild(t);
        return p;
    };

    const createMottoP = (text: string, isBold: boolean, customSize?: number): Element => {
        const p = createElement("w:p");
        const pPr = getOrCreate(p, "w:pPr");
        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");
        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "240"); 
        setAttr(spacing, "lineRule", "auto");
        const r = createElement("w:r");
        p.appendChild(r);
        const rPr = getOrCreate(r, "w:rPr");
        const sizeToUse = customSize ? customSize * 2 : options.font.sizeTable * 2;
        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", String(sizeToUse));
        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", String(sizeToUse));
        if (isBold) rPr.appendChild(createElement("w:b"));
        
        const t = createElement("w:t");
        t.textContent = text;
        r.appendChild(t);
        return p;
    };

    const appendSafeTable = (tc: Element, tbl: Element) => {
        tc.appendChild(tbl);
        const p = createElement("w:p");
        const pPr = getOrCreate(p, "w:pPr");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "2"); 
        setAttr(spacing, "lineRule", "exact");
        tc.appendChild(p);
    };

    const createShortLineTable = (): Element => {
        const tbl = createElement("w:tbl");
        const tblPr = getOrCreate(tbl, "w:tblPr");
        const jcTbl = getOrCreate(tblPr, "w:jc");
        setAttr(jcTbl, "val", "center");
        const tblW = getOrCreate(tblPr, "w:tblW");
        setAttr(tblW, "w", "1000");
        setAttr(tblW, "type", "dxa");
        const tblLayout = getOrCreate(tblPr, "w:tblLayout");
        setAttr(tblLayout, "type", "fixed");
        const tblGrid = getOrCreate(tbl, "w:tblGrid");
        const gridCol = createElement("w:gridCol");
        setAttr(gridCol, "w", "1000");
        tblGrid.appendChild(gridCol);
        const tr = createElement("w:tr");
        tbl.appendChild(tr);
        const tc = createElement("w:tc");
        tr.appendChild(tc);
        const tcPr = getOrCreate(tc, "w:tcPr");
        const tcW = getOrCreate(tcPr, "w:tcW");
        setAttr(tcW, "w", "1000");
        setAttr(tcW, "type", "dxa");
        
        const tcMar = getOrCreate(tcPr, "w:tcMar");
        ["top", "bottom", "left", "right"].forEach(side => {
            const mar = getOrCreate(tcMar, `w:${side}`);
            setAttr(mar, "w", "0");
            setAttr(mar, "type", "dxa");
        });

        const tcBorders = getOrCreate(tcPr, "w:tcBorders");
        const top = getOrCreate(tcBorders, "w:top"); 
        setAttr(top, "val", "single");
        setAttr(top, "sz", "4"); 
        setAttr(top, "space", "0");
        setAttr(top, "color", "000000");
        const p = createElement("w:p");
        tc.appendChild(p);
        const pPr = getOrCreate(p, "w:pPr");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "24"); 
        setAttr(spacing, "lineRule", "exact");
        return tbl;
    };

    const createMottoLineTable = (widthTwips: string): Element => {
        const tbl = createElement("w:tbl");
        const tblPr = getOrCreate(tbl, "w:tblPr");
        const jcTbl = getOrCreate(tblPr, "w:jc");
        setAttr(jcTbl, "val", "center");
        const tblW = getOrCreate(tblPr, "w:tblW");
        setAttr(tblW, "w", widthTwips);
        setAttr(tblW, "type", "dxa");
        const tblLayout = getOrCreate(tblPr, "w:tblLayout");
        setAttr(tblLayout, "type", "fixed");
        const tblGrid = getOrCreate(tbl, "w:tblGrid");
        const gridCol = createElement("w:gridCol");
        setAttr(gridCol, "w", widthTwips);
        tblGrid.appendChild(gridCol);
        const tr = createElement("w:tr");
        tbl.appendChild(tr);
        const tc = createElement("w:tc");
        tr.appendChild(tc);
        const tcPr = getOrCreate(tc, "w:tcPr");
        const tcW = getOrCreate(tcPr, "w:tcW");
        setAttr(tcW, "w", widthTwips);
        setAttr(tcW, "type", "dxa");

        const tcMar = getOrCreate(tcPr, "w:tcMar");
        ["top", "bottom", "left", "right"].forEach(side => {
            const mar = getOrCreate(tcMar, `w:${side}`);
            setAttr(mar, "w", "0");
            setAttr(mar, "type", "dxa");
        });

        const tcBorders = getOrCreate(tcPr, "w:tcBorders");
        const top = getOrCreate(tcBorders, "w:top"); 
        setAttr(top, "val", "single");
        setAttr(top, "sz", "6"); 
        setAttr(top, "space", "0");
        setAttr(top, "color", "000000");
        const p = createElement("w:p");
        tc.appendChild(p);
        const pPr = getOrCreate(p, "w:pPr");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "24"); 
        setAttr(spacing, "lineRule", "exact");
        return tbl;
    };

    const tbl = createElement("w:tbl");
    const tblPr = getOrCreate(tbl, "w:tblPr");
    const tblBorders = getOrCreate(tblPr, "w:tblBorders");
    ["top", "left", "bottom", "right", "insideH", "insideV"].forEach(side => {
        const border = getOrCreate(tblBorders, `w:${side}`);
        setAttr(border, "val", "none");
    });
    
    const tblLayout = getOrCreate(tblPr, "w:tblLayout");
    setAttr(tblLayout, "type", "fixed");

    const tblW = getOrCreate(tblPr, "w:tblW");
    setAttr(tblW, "w", "9350"); 
    setAttr(tblW, "type", "dxa");

    const tblGrid = getOrCreate(tbl, "w:tblGrid");
    const col1 = createElement("w:gridCol");
    setAttr(col1, "w", "3800"); 
    tblGrid.appendChild(col1);
    const col2 = createElement("w:gridCol");
    setAttr(col2, "w", "5550"); 
    tblGrid.appendChild(col2);

    const tr = createElement("w:tr");
    tbl.appendChild(tr);

    const tc1 = createElement("w:tc");
    tr.appendChild(tc1);
    const tc1Pr = getOrCreate(tc1, "w:tcPr");
    const tc1W = getOrCreate(tc1Pr, "w:tcW");
    setAttr(tc1W, "w", "3800");
    setAttr(tc1W, "type", "dxa");
    
    const tc1Mar = getOrCreate(tc1Pr, "w:tcMar");
    ["top", "bottom", "left", "right"].forEach(side => {
        const mar = getOrCreate(tc1Mar, `w:${side}`);
        setAttr(mar, "w", "0");
        setAttr(mar, "type", "dxa");
    });
    
    const tc2 = createElement("w:tc");
    tr.appendChild(tc2);
    const tc2Pr = getOrCreate(tc2, "w:tcPr");
    const tc2W = getOrCreate(tc2Pr, "w:tcW");
    setAttr(tc2W, "w", "5550");
    setAttr(tc2W, "type", "dxa");

    const tc2Mar = getOrCreate(tc2Pr, "w:tcMar");
    ["top", "bottom", "left", "right"].forEach(side => {
        const mar = getOrCreate(tc2Mar, `w:${side}`);
        setAttr(mar, "w", "0");
        setAttr(mar, "type", "dxa");
    });

    const docDate = options.documentDate ? new Date(options.documentDate) : new Date();
    const day = String(docDate.getDate()).padStart(2, '0');
    const month = String(docDate.getMonth() + 1).padStart(2, '0');
    const year = docDate.getFullYear();
    const currentDateStr = `${org.location}, ngày ${day} tháng ${month} năm ${year}`;

    switch (options.headerType) {
        case HeaderType.PARTY:
            let partySymbolStr = "Số: ... - .../CB";
            if (options.docSymbol || options.docSuffix) {
                const symbol = options.docSymbol || "...";
                const suffix = options.docSuffix || "CB";
                partySymbolStr = `Số: ... - ${symbol}/${suffix}`;
            }

            tc1.appendChild(createStyledP(org.partyUpper.toUpperCase(), false, false));
            tc1.appendChild(createStyledP(org.partyCell.toUpperCase(), true, false));
            tc1.appendChild(createStyledP("*", false, false)); 
            tc1.appendChild(createStyledP(partySymbolStr, false, false));

            if (options.isCongVan && options.congVanSummary) {
                const summaryLines = options.congVanSummary.split('\n');
                summaryLines.forEach((line: string) => {
                    if (line.trim()) tc1.appendChild(createStyledP(line.trim(), false, false, 12));
                });
            }

            tc2.appendChild(createMottoP("ĐẢNG CỘNG SẢN VIỆT NAM", true, 13)); 
            appendSafeTable(tc2, createMottoLineTable("3400")); 
            tc2.appendChild(createStyledP("", false, false));
            tc2.appendChild(createStyledP(currentDateStr, false, true, 14));
            break;

        case HeaderType.DEPARTMENT:
            const deptName = org.departmentName || "TỔ CHUYÊN MÔN";
            tc1.appendChild(createStyledP(org.orgName.toUpperCase(), false, false));
            tc1.appendChild(createStyledP(deptName, true, false));
            appendSafeTable(tc1, createShortLineTable()); 
            tc1.appendChild(createStyledP("", false, false));  
            tc1.appendChild(createStyledP("Số: ... /...", false, false)); 

            if (options.isCongVan && options.congVanSummary) {
                const summaryLines = options.congVanSummary.split('\n');
                summaryLines.forEach((line: string) => {
                    if (line.trim()) tc1.appendChild(createStyledP(line.trim(), false, false, 12));
                });
            }

            tc2.appendChild(createStyledP("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", true, false, 13));
            tc2.appendChild(createMottoP("Độc lập - Tự do - Hạnh phúc", true, 13)); 
            appendSafeTable(tc2, createMottoLineTable("3200")); 
            tc2.appendChild(createStyledP("", false, false)); 
            tc2.appendChild(createStyledP(currentDateStr, false, true, 14));
            break;

        case HeaderType.SCHOOL:
        default:
            let schoolSymbolStr = "Số: ... /...";
            if (options.docSymbol || options.docSuffix) {
                const symbol = options.docSymbol || "...";
                const suffix = options.docSuffix || "...";
                schoolSymbolStr = `Số: ... /${symbol}-${suffix}`;
            }

            tc1.appendChild(createStyledP(org.governingBody.toUpperCase(), false, false));
            tc1.appendChild(createStyledP(org.orgName.toUpperCase(), true, false));
            appendSafeTable(tc1, createShortLineTable());
            tc1.appendChild(createStyledP("", false, false));
            tc1.appendChild(createStyledP(schoolSymbolStr, false, false));

            if (options.isCongVan && options.congVanSummary) {
                const summaryLines = options.congVanSummary.split('\n');
                summaryLines.forEach((line: string) => {
                    if (line.trim()) tc1.appendChild(createStyledP(line.trim(), false, false, 12));
                });
            }

            tc2.appendChild(createStyledP("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", true, false, 13));
            tc2.appendChild(createMottoP("Độc lập - Tự do - Hạnh phúc", true, 13)); 
            appendSafeTable(tc2, createMottoLineTable("3200")); 
            tc2.appendChild(createStyledP("", false, false)); 
            tc2.appendChild(createStyledP(currentDateStr, false, true, 14));
            break;
    }

    return tbl;
};

const createSignatureBlock = (doc: Document, options: any, docType: string): Element => {
    const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);
    const getOrCreate = (parent: Element, tagName: string): Element => {
      let child = parent.getElementsByTagName(tagName)[0];
      if (!child) {
        child = doc.createElementNS(W_NS, tagName);
        if (tagName.endsWith("Pr") && parent.firstChild) {
            parent.insertBefore(child, parent.firstChild);
        } else {
            parent.appendChild(child);
        }
      }
      return child;
    };

    const org = options.orgInfo || {
       governingBody: "UBND XÃ EA KAR",
       orgName: "TRƯỜNG THCS CHU VĂN AN",
       partyUpper: "ĐẢNG BỘ XÃ EA KAR",
       partyCell: "CHI BỘ TRƯỜNG THCS CHU VĂN AN",
       location: "Ea Kar",
       departmentName: "TỔ CHUYÊN MÔN"
    };

    const createTightP = (text: string, isBold: boolean, isItalic: boolean, isUnderline: boolean, align: string, customSize?: number) => {
        const p = createElement("w:p");
        const pPr = getOrCreate(p, "w:pPr");
        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", align);
        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "240"); 
        setAttr(spacing, "lineRule", "auto"); 
        const r = createElement("w:r");
        p.appendChild(r);
        const rPr = getOrCreate(r, "w:rPr");
        const sizeToUse = customSize ? customSize * 2 : options.font?.sizeTable * 2 || 26;
        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", String(sizeToUse)); 
        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", String(sizeToUse));
        if (isBold) {
            const b = getOrCreate(rPr, "w:b");
            setAttr(b, "val", "true");
        }
        if (isItalic) {
            const i = getOrCreate(rPr, "w:i");
            setAttr(i, "val", "true");
        }
        if (isUnderline) {
            const u = getOrCreate(rPr, "w:u");
            setAttr(u, "val", "single");
        }
        const t = createElement("w:t");
        t.textContent = text;
        r.appendChild(t);
        return p;
    };

    const tbl = createElement("w:tbl");
    const tblPr = getOrCreate(tbl, "w:tblPr");
    const tblBorders = getOrCreate(tblPr, "w:tblBorders");
    ["top", "left", "bottom", "right", "insideH", "insideV"].forEach(side => {
        const border = getOrCreate(tblBorders, `w:${side}`);
        setAttr(border, "val", "none");
    });
    
    const tblLayout = getOrCreate(tblPr, "w:tblLayout");
    setAttr(tblLayout, "type", "fixed");

    const tblW = getOrCreate(tblPr, "w:tblW");
    setAttr(tblW, "w", "9350");
    setAttr(tblW, "type", "dxa"); 

    const isMinutes = (docType && docType.toUpperCase().includes("BIÊN BẢN")) || options.isMinutes === true;
    
    const w1 = isMinutes ? "4675" : "3800";
    const w2 = isMinutes ? "4675" : "5550";

    const tblGrid = getOrCreate(tbl, "w:tblGrid");
    const col1 = createElement("w:gridCol");
    setAttr(col1, "w", w1);
    tblGrid.appendChild(col1);
    const col2 = createElement("w:gridCol");
    setAttr(col2, "w", w2);
    tblGrid.appendChild(col2);

    const tr = createElement("w:tr");
    tbl.appendChild(tr);

    const tc1 = createElement("w:tc");
    tr.appendChild(tc1);
    const tc1Pr = getOrCreate(tc1, "w:tcPr");
    const tc1W = getOrCreate(tc1Pr, "w:tcW");
    setAttr(tc1W, "w", w1);
    setAttr(tc1W, "type", "dxa");
    
    const tc1Mar = getOrCreate(tc1Pr, "w:tcMar");
    ["top", "bottom", "left", "right"].forEach(side => {
        const mar = getOrCreate(tc1Mar, `w:${side}`);
        setAttr(mar, "w", "0");
        setAttr(mar, "type", "dxa");
    });

    const tc2 = createElement("w:tc");
    tr.appendChild(tc2);
    const tc2Pr = getOrCreate(tc2, "w:tcPr");
    const tc2W = getOrCreate(tc2Pr, "w:tcW");
    setAttr(tc2W, "w", w2);
    setAttr(tc2W, "type", "dxa");
    
    const tc2Mar = getOrCreate(tc2Pr, "w:tcMar");
    ["top", "bottom", "left", "right"].forEach(side => {
        const mar = getOrCreate(tc2Mar, `w:${side}`);
        setAttr(mar, "w", "0");
        setAttr(mar, "type", "dxa");
    });

    const signerTitle = options.signerTitle ? options.signerTitle.trim().toUpperCase() : "";
    const signerName = options.signerName ? options.signerName.trim() : "";
    const presiderName = options.presiderName ? options.presiderName.trim() : "";
    const secretaryName = options.secretaryName ? options.secretaryName.trim() : "";

    if (isMinutes) {
        tc1.appendChild(createTightP("THƯ KÝ", true, false, false, "center", 14));
        tc1.appendChild(createTightP("", false, false, false, "center", 14));
        tc1.appendChild(createTightP("", false, false, false, "center", 14));
        tc1.appendChild(createTightP("", false, false, false, "center", 14));
        if (secretaryName) tc1.appendChild(createTightP(secretaryName, true, false, false, "center", 14));

        tc2.appendChild(createTightP("CHỦ TỌA", true, false, false, "center", 14));
        tc2.appendChild(createTightP("", false, false, false, "center", 14));
        tc2.appendChild(createTightP("", false, false, false, "center", 14));
        tc2.appendChild(createTightP("", false, false, false, "center", 14));
        if (presiderName) tc2.appendChild(createTightP(presiderName, true, false, false, "center", 14));
    } else {
        switch (options.headerType) {
            case HeaderType.PARTY:
                tc1.appendChild(createTightP("Nơi nhận:", false, false, true, "left", 14));
                tc1.appendChild(createTightP(`- ${org.partyUpper} (b/c),`, false, false, false, "left", 12));
                tc1.appendChild(createTightP(`- Chi ủy và Lãnh đạo ${org.orgName},`, false, false, false, "left", 12));
                tc1.appendChild(createTightP("- BT Chi Đoàn, TPT Đội,", false, false, false, "left", 12));
                tc1.appendChild(createTightP("- Đảng viên (t/h),", false, false, false, "left", 12));
                tc1.appendChild(createTightP("- Lưu HSCB.", false, false, false, "left", 12));

                tc2.appendChild(createTightP("T/M CHI BỘ", true, false, false, "center", 14));
                tc2.appendChild(createTightP(signerTitle || "BÍ THƯ", true, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, "center", 14));
                break;
            case HeaderType.DEPARTMENT:
                tc1.appendChild(createTightP("Nơi nhận:", true, true, false, "left", 12));
                tc1.appendChild(createTightP(`- Lãnh đạo ${org.orgName} (b/c);`, false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Thành viên Tổ (t/h);", false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Lưu HSTCM.", false, false, false, "left", 11));

                tc2.appendChild(createTightP(signerTitle || "TỔ TRƯỞNG", true, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, "center", 14));
                break;
            case HeaderType.SCHOOL:
            default:
                tc1.appendChild(createTightP("Nơi nhận:", true, true, false, "left", 12));
                tc1.appendChild(createTightP(`- ${org.governingBody} (b/c);`, false, false, false, "left", 11));
                tc1.appendChild(createTightP(`- Lãnh đạo ${org.orgName} (b/c);`, false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Cấp ủy chi bộ (b/c);", false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Các tổ chuyên môn, Văn phòng(t/h);", false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Giáo viên, nhân viên (t/h);", false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Lưu VT, EDOC.", false, false, false, "left", 11));

                if (signerTitle === "PHÓ HIỆU TRƯỞNG") {
                    tc2.appendChild(createTightP("KT. HIỆU TRƯỞNG", true, false, false, "center", 14));
                    tc2.appendChild(createTightP("PHÓ HIỆU TRƯỞNG", true, false, false, "center", 14));
                } else {
                    tc2.appendChild(createTightP(signerTitle || "HIỆU TRƯỞNG", true, false, false, "center", 14));
                }
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                tc2.appendChild(createTightP("", false, false, false, "center", 14));
                if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, "center", 14));
                break;
        }
    }
    return tbl;
}