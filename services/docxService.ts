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
  congVanSummary: "",
  approverTitle: "",
  approverName: "",
  isDraft: false 
};

const ACRONYMS_LIST = [
  "UBND", "THCS", "THPT", "BGDĐT", "SGDĐT", "PGDĐT", "ĐTN", "CĐ", "ĐCS", "VN", 
  "GDĐT", "CNTT", "KHTN", "KHXH", "GDCD", "TDTT", "BCH", "CSCS", "CMHS", "ĐĐ", 
  "BĐD", "STT", "GV", "HS", "SKKN",
  "NQ", "QĐ", "CT", "KL", "QC", "QYĐ", "HD", "BC", "KH", "CTR", "TB", "TTR", "CV", "BB",
  "PA", "ĐA", "DA", "HĐ", "BTT", "GUQ", "GM", "GGT", "GNP"
];

const setAttr = (el: Element, name: string, value: string) => {
    try { el.setAttributeNS(W_NS, `w:${name}`, value); } catch(e) {}
    el.setAttribute(`w:${name}`, value);
};

const getNodes = (parent: Element | Document, tagName: string): Element[] => {
    let els = Array.from(parent.getElementsByTagName(`w:${tagName}`));
    if (els.length === 0) els = Array.from(parent.getElementsByTagNameNS(W_NS, tagName));
    if (els.length === 0) els = Array.from(parent.getElementsByTagName(tagName));
    return els;
};

const getOrCreate = (parent: Element, tagName: string): Element => {
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

// CÔNG CỤ ÉP IN ĐẬM CHUẨN TƯƠNG THÍCH WEB 100%
const forceBoldNode = (rPr: Element) => {
    const b = getOrCreate(rPr, "w:b");
    b.removeAttributeNS(W_NS, "val");
    b.removeAttribute("w:val");
    const bCs = getOrCreate(rPr, "w:bCs");
    bCs.removeAttributeNS(W_NS, "val");
    bCs.removeAttribute("w:val");
};

const forceParagraphBold = (pPr: Element) => {
    const rPr = getOrCreate(pPr, "w:rPr");
    forceBoldNode(rPr);
};

const removeBoldNode = (rPr: Element) => {
    const bNodes = getNodes(rPr, "b");
    bNodes.forEach(b => rPr.removeChild(b));
    const bCsNodes = getNodes(rPr, "bCs");
    bCsNodes.forEach(bCs => rPr.removeChild(bCs));
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

const cleanPunctuation = (text: string): string => {
    let t = text;
    t = t.replace(/\s+([,\.:;!?])/g, '$1');
    t = t.replace(/([,\.:;!?])([^\s\d\)"'”’])/g, '$1 $2');
    t = t.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return t;
};

const isParagraphBold = (p: Element): boolean => {
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
    const body = getNodes(doc, "body")[0];
    
    const createElement = (tagName: string) => doc.createElementNS(W_NS, tagName);

    const isTableParagraph = (p: Element): boolean => {
      let parent = p.parentNode;
      while(parent) {
        const nodeName = parent.nodeName;
        if (nodeName === 'w:tbl' || nodeName === 'tbl') return true;
        parent = parent.parentNode;
      }
      return false;
    };

    const paragraphsForCleaning = getNodes(doc, "p");

    for (const p of paragraphsForCleaning) {
        const textNodes = getNodes(p, "t");
        if (textNodes.length > 0) {
            const firstNode = textNodes[0];
            if (firstNode.textContent) firstNode.textContent = firstNode.textContent.trimStart();
            const lastNode = textNodes[textNodes.length - 1];
            if (lastNode.textContent) lastNode.textContent = lastNode.textContent.trimEnd();
        }
    }

    if (options.headerType !== HeaderType.NONE) {
        const headTables = getNodes(doc, "tbl");
        for (let i = 0; i < Math.min(4, headTables.length); i++) {
            const tbl = headTables[i];
            if (!tbl.parentNode) continue;
            
            const trs = getNodes(tbl, "tr");
            let maxCols = 0;
            if (trs.length > 0) {
                 const tcs = getNodes(trs[0], "tc");
                 maxCols = tcs.length;
            }
            if (maxCols > 2 || trs.length > 5) continue; 

            const text = tbl.textContent?.toUpperCase() || "";
            if ((text.includes("CỘNG HÒA") && text.includes("ĐỘC LẬP")) || 
                (text.includes("ĐẢNG CỘNG SẢN") && text.includes("VIỆT NAM"))) {
                tbl.parentNode.removeChild(tbl);
            }
        }
        
        const headParagraphs = getNodes(doc, "p");
        for (let i = 0; i < Math.min(20, headParagraphs.length); i++) {
            const p = headParagraphs[i];
            if (!p.parentNode || isTableParagraph(p)) continue;
            const text = p.textContent?.trim().toUpperCase() || "";
            
            if (DOC_TYPE_KEYWORDS.some(k => text.startsWith(k))) break; 
            
            if (text.startsWith("SỐ:") || text.startsWith("SỐ ") || (text.includes("NGÀY") && text.includes("THÁNG") && text.includes("NĂM") && text.length < 100) || text.length === 0) {
                p.parentNode.removeChild(p);
            }
        }
    }

    const tailTables = getNodes(doc, "tbl");
    for (let i = tailTables.length - 1; i >= Math.max(0, tailTables.length - 5); i--) {
        const tbl = tailTables[i];
        if (!tbl.parentNode) continue;
        
        const trs = getNodes(tbl, "tr");
        let maxCols = 0;
        if (trs.length > 0) {
             const tcs = getNodes(trs[0], "tc");
             maxCols = tcs.length;
        }
        if (maxCols > 2 || trs.length > 5) continue; 

        const text = tbl.textContent?.toUpperCase() || "";
        if ((text.includes("NƠI NHẬN") || text.includes("HIỆU TRƯỞNG") || text.includes("CHỦ TỊCH") || text.includes("T/M")) && text.length < 400) {
            tbl.parentNode.removeChild(tbl);
        }
    }

    const tailParagraphs = getNodes(doc, "p");
    let stopTailScan = false;
    const signatureKeywords = [
        "NƠI NHẬN", "HIỆU TRƯỞNG", "GIÁM ĐỐC", "CHỦ TỊCH", "CHỦ TỌA", "THƯ KÝ", 
        "TỔ TRƯỞNG", "BÍ THƯ", "KT.", "TM.", "T/M", "LƯU:", "LƯU VT", "NGƯỜI LẬP", "NGƯỜI VIẾT"
    ];

    for (let i = tailParagraphs.length - 1; i >= Math.max(0, tailParagraphs.length - 40); i--) {
        if (stopTailScan) break;
        const p = tailParagraphs[i];
        
        if (isTableParagraph(p)) {
            stopTailScan = true;
            continue;
        }
        
        if (!p.parentNode) continue;
        const text = p.textContent?.trim() || "";
        const upperText = text.toUpperCase();
        
        const hasMedia = getNodes(p, "drawing").length > 0 || 
                         getNodes(p, "pict").length > 0 || 
                         getNodes(p, "object").length > 0 || 
                         getNodes(p, "sectPr").length > 0;
                         
        if (upperText.length === 0 && !hasMedia) {
             p.parentNode.removeChild(p);
             continue;
        }
        if (hasMedia) {
             stopTailScan = true;
             continue;
        }

        const isSigKeyword = signatureKeywords.some(k => upperText.includes(k));
        const isNoiNhanBullet = (upperText.startsWith("-") || upperText.startsWith("+") || upperText.startsWith("•")) && 
                                (upperText.includes("LƯU") || upperText.includes("B/C") || upperText.includes("T/H") || upperText.includes("NHƯ TRÊN") || upperText.includes("UBND") || upperText.includes("TRƯỜNG"));
        
        const isShortNameOrDate = text.length < 40 && !upperText.includes(":") && !upperText.match(/^[0-9IVX]+\./) && !upperText.startsWith("-");

        if (isSigKeyword || isNoiNhanBullet || isShortNameOrDate) {
            p.parentNode.removeChild(p);
        } else {
            stopTailScan = true; 
        }
    }

    let listFormats: Record<string, string> = {}; 
    const numberingXmlContent = await zip.file("word/numbering.xml")?.async("string");
    if (numberingXmlContent) {
        const numDoc = parser.parseFromString(numberingXmlContent, "application/xml");
        const nums = getNodes(numDoc, "num");
        const abstractNums = getNodes(numDoc, "abstractNum");

        const numToAbstractMap: Record<string, string> = {};
        for (const num of nums) {
            const numId = num.getAttributeNS(W_NS, "numId") || num.getAttribute("w:numId");
            const absNumIdEl = getNodes(num, "abstractNumId")[0];
            if (numId && absNumIdEl) {
                numToAbstractMap[numId] = absNumIdEl.getAttributeNS(W_NS, "val") || absNumIdEl.getAttribute("w:val") || "";
            }
        }

        const absNumMap: Record<string, Element> = {};
        for (const absNum of abstractNums) {
            const absId = absNum.getAttributeNS(W_NS, "abstractNumId") || absNum.getAttribute("w:abstractNumId");
            if (absId) absNumMap[absId] = absNum;
        }

        for (const numId in numToAbstractMap) {
            const absId = numToAbstractMap[numId];
            const absNum = absNumMap[absId];
            if (absNum) {
                const lvls = getNodes(absNum, "lvl");
                for (const lvl of lvls) {
                    const ilvl = lvl.getAttributeNS(W_NS, "ilvl") || lvl.getAttribute("w:ilvl");
                    const numFmtEl = getNodes(lvl, "numFmt")[0];
                    const numFmt = numFmtEl ? (numFmtEl.getAttributeNS(W_NS, "val") || numFmtEl.getAttribute("w:val")) : "";
                    if (ilvl && numFmt) {
                        listFormats[`${numId}_${ilvl}`] = numFmt;
                    }
                }
            }
        }
    }

    if (options.removeNumbering) {
        const allParagraphs = getNodes(doc, "p");
        let listCounters: Record<string, number> = {};

        for (const p of allParagraphs) {
            const pPr = getNodes(p, "pPr")[0];
            
            let fullText = "";
            const pRunsForText = getNodes(p, "r");
            for (const r of pRunsForText) {
                Array.from(r.childNodes).forEach(child => {
                    const name = child.nodeName.replace("w:", "");
                    if (name === "t") fullText += child.textContent;
                    if (name === "tab") fullText += " "; 
                });
            }
            fullText = fullText.trim();

            if (pPr) {
                const numPr = getNodes(pPr, "numPr")[0];
                if (numPr) {
                    const ilvlEl = getNodes(numPr, "ilvl")[0];
                    const numIdEl = getNodes(numPr, "numId")[0];
                    
                    const ilvl = ilvlEl ? (ilvlEl.getAttributeNS(W_NS, "val") || ilvlEl.getAttribute("w:val") || "0") : "0";
                    const numId = numIdEl ? (numIdEl.getAttributeNS(W_NS, "val") || numIdEl.getAttribute("w:val") || "0") : "0";

                    const levelKey = `${numId}_${ilvl}`;
                    const numFmt = listFormats[levelKey] || "decimal"; 

                    if (!listCounters[levelKey]) listCounters[levelKey] = 0;
                    listCounters[levelKey]++;

                    const hasListPrefix = /^([IVXLCDM]+\.|[0-9]+\.|[a-zđ]\)|\-|\+|\*|•)/i.test(fullText);
                    
                    if (!hasListPrefix && fullText.length > 0) {
                        let prefix = "";
                        
                        if (numFmt === "bullet") {
                            prefix = ""; 
                        } else {
                            if (numFmt === "decimal") {
                                prefix = `${listCounters[levelKey]}. `;
                            } else if (numFmt === "lowerLetter") {
                                const char = String.fromCharCode(96 + listCounters[levelKey]);
                                prefix = `${char}) `;
                            } else if (numFmt === "upperLetter") {
                                const char = String.fromCharCode(64 + listCounters[levelKey]);
                                prefix = `${char}. `;
                            } else {
                                prefix = `${listCounters[levelKey]}. `;
                            }
                        }

                        if (prefix !== "") {
                            const r = doc.createElementNS(W_NS, "w:r");
                            const t = doc.createElementNS(W_NS, "w:t");
                            t.setAttribute("xml:space", "preserve");
                            t.textContent = prefix;
                            r.appendChild(t);
                            const insertBeforeNode = pPr.nextSibling;
                            if (insertBeforeNode) p.insertBefore(r, insertBeforeNode);
                            else p.appendChild(r);
                        }
                    }
                    
                    pPr.removeChild(numPr);
                }
            }

            const firstRun = getNodes(p, "r")[0];
            if (firstRun) {
                const firstText = getNodes(firstRun, "t")[0];
                if (firstText && firstText.textContent) {
                    const bulletRegex = /^[\s]*([•\-\–\—\*])[\s]+/;
                    if (bulletRegex.test(firstText.textContent)) {
                        firstText.textContent = firstText.textContent.replace(bulletRegex, "").trimStart();
                    }
                }
            }
        }
    }

    const sectPrsDoc = getNodes(doc, "sectPr");

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
        
        if (isBold) {
            forceBoldNode(rPr);
            forceParagraphBold(pPr);
        } else {
            removeBoldNode(rPr);
        }
        
        const iEl = getNodes(rPr, "i")[0];
        if (iEl) rPr.removeChild(iEl);
        
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
        setAttr(spacing, "after", "120"); 
        setAttr(spacing, "line", "2"); 
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
        setAttr(spacing, "after", "120"); 
        setAttr(spacing, "line", "240"); 
        setAttr(spacing, "lineRule", "auto");
        const r = doc.createElementNS(W_NS, "w:r");
        const rPr = getOrCreate(r, "w:rPr");
        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", options.font.family);
        setAttr(rFonts, "hAnsi", options.font.family);
        setAttr(rFonts, "cs", options.font.family);
        setAttr(rFonts, "eastAsia", options.font.family);
        
        removeBoldNode(rPr);
        
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

    const paragraphs = getNodes(doc, "p");
    
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

            if (!options.isCongVan) {
                const targetNode = summaryParagraphs.length > 0 ? summaryParagraphs[summaryParagraphs.length - 1] : p;
                
                let nextNode = targetNode.nextSibling;
                while (nextNode) {
                    const nodeName = nextNode.nodeName;
                    if (nodeName === "w:p" || nodeName === "p") {
                        const el = nextNode as Element;
                        const textNodes = getNodes(el, "t");
                        const text = textNodes.map(n => n.textContent || "").join("").trim();
                        
                        let hasPageBreak = false;
                        const brs = getNodes(el, "br");
                        for (const br of brs) {
                            if (br.getAttribute("w:type") === "page" || br.getAttributeNS(W_NS, "type") === "page") {
                                hasPageBreak = true;
                                break;
                            }
                        }
                        
                        if (text.length === 0 && !hasPageBreak) {
                            const toDelete = nextNode;
                            nextNode = nextNode.nextSibling; 
                            toDelete.parentNode?.removeChild(toDelete); 
                        } else {
                            break; 
                        }
                    } else if (nodeName === "w:tbl" || nodeName === "tbl") {
                        const el = nextNode as Element;
                        const text = el.textContent?.trim() || "";
                        if (text.length === 0) {
                            const toDelete = nextNode;
                            nextNode = nextNode.nextSibling;
                            toDelete.parentNode?.removeChild(toDelete);
                        } else {
                            break;
                        }
                    } else {
                        nextNode = nextNode.nextSibling;
                    }
                }

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

    const finalParagraphs = getNodes(doc, "p");

    let inKinhGuiBlock = false;
    let addSpaceBeforeMainContent = false;
    let isBodyArea = true; 

    for (const p of finalParagraphs) {
      if (docTypeElements.has(p) || abstractElements.has(p) || protectedElements.has(p)) continue; 
      
      const pText = p.textContent || "";
      const trimmedPTextOriginal = pText.trim();
      const upperText = trimmedPTextOriginal.toUpperCase();

      if (isBodyArea && trimmedPTextOriginal.length > 0) {
          if (
              upperText.startsWith("NƠI NHẬN:") || 
              upperText === "NƠI NHẬN" ||
              (trimmedPTextOriginal.length < 40 && (
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
      const rawTextForEmptyCheck = pText.replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '');
      
      if (isBodyArea && rawTextForEmptyCheck.length === 0 && !isTable) {
          const hasDrawing = getNodes(p, "drawing").length > 0 || getNodes(p, "drawing").length > 0;
          const hasPict = getNodes(p, "pict").length > 0;
          const hasObject = getNodes(p, "object").length > 0;
          const hasSectPr = getNodes(p, "sectPr").length > 0;
          
          let hasPageBreak = false;
          const brs = getNodes(p, "br");
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

      let startTrimmed = false;
      const runsForTrim = getNodes(p, "r");
      for (const r of runsForTrim) {
          if (startTrimmed) break;
          const children = Array.from(r.childNodes);
          for (const child of children) {
              const name = child.nodeName.replace("w:", "");
              if (name === "tab") {
                  r.removeChild(child);
              } else if (name === "t") {
                  if (child.textContent) {
                      const original = child.textContent;
                      const trimmed = original.replace(/^[\s\xA0]+/, '');
                      child.textContent = trimmed;
                      if (trimmed.length > 0) {
                          startTrimmed = true; 
                          break;
                      }
                  }
              } else if (name === "drawing" || name === "pict") {
                  startTrimmed = true;
                  break;
              }
          }
      }

      const contextualSpacing = getNodes(pPr, "contextualSpacing")[0];
      if (contextualSpacing) {
          contextualSpacing.parentNode?.removeChild(contextualSpacing);
      }

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
              const runs = getNodes(p, "r");
              
              for (const r of runs) {
                  const rPr = getOrCreate(r, "w:rPr");
                  forceBoldNode(rPr);
                  
                  const iEl = getNodes(rPr, "i")[0];
                  if (iEl) rPr.removeChild(iEl); 
                  
                  const sz = getOrCreate(rPr, "w:sz");
                  setAttr(sz, "val", String(targetSize));
                  const szCs = getOrCreate(rPr, "w:szCs");
                  setAttr(szCs, "val", String(targetSize));
              }
              forceParagraphBold(pPr);
              continue; 
          }

          if (inKinhGuiBlock) {
              if (trimmedPTextOriginal.startsWith("-") || trimmedPTextOriginal.startsWith("+")) {
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
                  const runs = getNodes(p, "r");
                  
                  for (const r of runs) {
                      const rPr = getOrCreate(r, "w:rPr");
                      forceBoldNode(rPr);
                      
                      const iEl = getNodes(rPr, "i")[0];
                      if (iEl) rPr.removeChild(iEl);
                      
                      const sz = getOrCreate(rPr, "w:sz");
                      setAttr(sz, "val", String(targetSize));
                      const szCs = getOrCreate(rPr, "w:szCs");
                      setAttr(szCs, "val", String(targetSize));
                  }
                  forceParagraphBold(pPr);
                  continue;
              } else if (trimmedPTextOriginal.length > 0) {
                  inKinhGuiBlock = false;
                  addSpaceBeforeMainContent = true;
              }
          }
      }

      let isDecisionSpecialLine = false;
      if (detectedDocType === "QUYẾT ĐỊNH" && trimmedPTextOriginal.length > 0) {
          if (upperText === "QUYẾT ĐỊNH:" || upperText === "QUYẾT ĐỊNH") {
              isDecisionSpecialLine = true;
          } 
          else if (trimmedPTextOriginal === upperText && trimmedPTextOriginal.length < 150 && /[A-ZÀ-Ỹ]/.test(upperText)) {
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
        const runs = getNodes(p, "r");
        for (const r of runs) {
            const rPr = getOrCreate(r, "w:rPr");
            forceBoldNode(rPr);
            
            const sz = getOrCreate(rPr, "w:sz");
            setAttr(sz, "val", String(targetSize));
            const szCs = getOrCreate(rPr, "w:szCs");
            setAttr(szCs, "val", String(targetSize));
        }
        forceParagraphBold(pPr);
        continue; 
      }

      let pTextParsed = "";
      const runsForText = getNodes(p, "r");
      for (const r of runsForText) {
          Array.from(r.childNodes).forEach(child => {
              const name = child.nodeName.replace("w:", "");
              if (name === "t") pTextParsed += child.textContent;
              if (name === "tab") pTextParsed += " "; 
          });
      }
      const trimmedPText = pTextParsed.trim();

      const lowerPText = trimmedPText.toLowerCase().replace(/^[\-\+*•\s]+/, '');
      const isBasisLine = lowerPText.startsWith("căn cứ") || lowerPText.startsWith("xét") || lowerPText.startsWith("theo");
      
      let isItalicBasis = false;
      if (isBasisLine) {
          if (detectedDocType === "QUYẾT ĐỊNH" || detectedDocType === "NGHỊ QUYẾT") {
              isItalicBasis = true; 
          }
      }

      const isRomanHeading = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,3}|xiv|xv|xvi{1,3}|xix|xx|[IVXLCDM]+)\.[\s\xA0]+/.test(trimmedPText);
      const isNumberHeading = /^\d+(?:\.\d+)*\.[\s\xA0]+/.test(trimmedPText);
      let isHeading = isRomanHeading || isNumberHeading;

      if (isHeading) {
          const endsWithPunctuation = /[\.\;\:\,]$/.test(trimmedPText);
          if (endsWithPunctuation && trimmedPText.length > 50) {
              isHeading = false;
          }
          if (trimmedPText.length > 150) {
              isHeading = false;
          }
      }

      if (isRomanHeading && isHeading) {
          const tNodesForUpper = getNodes(p, "t");
          for (const t of tNodesForUpper) {
              if (t.textContent) t.textContent = t.textContent.toUpperCase();
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
      ind.removeAttributeNS(W_NS, "hanging");
      ind.removeAttribute("w:hanging");
      
      const targetSize = options.font.sizeNormal * 2;
      const runs = getNodes(p, "r");
      for (const r of runs) {
          const tNodes = getNodes(r, "t");
          for (const t of tNodes) {
              if (t.textContent) t.textContent = cleanPunctuation(t.textContent);
          }

          const rPr = getOrCreate(r, "w:rPr");
          const sz = getOrCreate(rPr, "w:sz");
          setAttr(sz, "val", String(targetSize));
          const szCs = getOrCreate(rPr, "w:szCs");
          setAttr(szCs, "val", String(targetSize));

          if (isHeading) {
              forceBoldNode(rPr);
          }

          if (isBasisLine) {
              if (isItalicBasis) {
                  const iEl = getOrCreate(rPr, "w:i");
                  setAttr(iEl, "val", "true");
                  const iCsEl = getOrCreate(rPr, "w:iCs");
                  setAttr(iCsEl, "val", "true");
              } else {
                  const iEl = getNodes(rPr, "i")[0];
                  if (iEl) rPr.removeChild(iEl);
                  const iCsEl = getNodes(rPr, "iCs")[0];
                  if (iCsEl) rPr.removeChild(iCsEl);
              }
              removeBoldNode(rPr);
          }
      }
      
      if (isHeading) {
          forceParagraphBold(pPr);
      }
    }

    const tables = getNodes(doc, "tbl");

    for (const tbl of tables) {
        let sttColIndex = -1;

        const rows = getNodes(tbl, "tr");
        
        for (let rIndex = 0; rIndex < rows.length; rIndex++) {
            const tr = rows[rIndex];
            const cells = getNodes(tr, "tc");
            let logicalColIndex = 0;
            for (const tc of cells) {
                const gridSpanEl = getNodes(tc, "gridSpan")[0];
                const gridSpan = gridSpanEl ? parseInt(gridSpanEl.getAttributeNS(W_NS, "val") || gridSpanEl.getAttribute("w:val") || "1") : 1;
                
                const tcTextNodes = getNodes(tc, "t");
                const rawCellText = tcTextNodes.map(n => n.textContent || "").join("");
                const cleanTextForStt = rawCellText.toUpperCase().replace(/[\.\s\t\u200B-\u200D\uFEFF\xA0]/g, '');
                
                if (sttColIndex === -1 && (cleanTextForStt === "STT" || cleanTextForStt === "SỐTT" || cleanTextForStt === "TT")) {
                    sttColIndex = logicalColIndex;
                }
                logicalColIndex += gridSpan;
            }
        }

        for (let rIndex = 0; rIndex < rows.length; rIndex++) {
            const tr = rows[rIndex];
            const trPr = getOrCreate(tr, "w:trPr");

            let isHeaderRow = (rIndex === 0);
            if (!isHeaderRow && getNodes(trPr, "tblHeader").length > 0) {
                isHeaderRow = true;
            }

            const trTextNodes = getNodes(tr, "t");
            const trText = trTextNodes.map(n => n.textContent || "").join("").toUpperCase();
            const isTotalRow = !isHeaderRow && (trText.includes("TỔNG CỘNG") || trText.includes("TỔNG SỐ") || trText.includes("TỔNG:"));

            let trHeight = getOrCreate(trPr, "w:trHeight");
            setAttr(trHeight, "val", String(Math.round(options.table.rowHeight * TWIPS_PER_CM))); 
            setAttr(trHeight, "hRule", "atLeast"); 

            const cells = getNodes(tr, "tc");
            let logicalColIndex = 0;

            for (const tc of cells) {
                const tcPr = getOrCreate(tc, "w:tcPr");
                const vAlign = getOrCreate(tcPr, "w:vAlign");
                setAttr(vAlign, "val", "center"); 
                
                const gridSpanEl = getNodes(tc, "gridSpan")[0];
                const gridSpan = gridSpanEl ? parseInt(gridSpanEl.getAttributeNS(W_NS, "val") || gridSpanEl.getAttribute("w:val") || "1") : 1;

                const tcParagraphs = getNodes(tc, "p");
                const tcTextNodesAll = getNodes(tc, "t");
                const rawCellTextFull = tcTextNodesAll.map(n => n.textContent || "").join("").trim();
                
                const isNumericCell = rawCellTextFull.length > 0 && /^[\(\[\-+]?[\d\.\,\s\t\u200B-\u200D\uFEFF\xA0]+(?:vnđ|vnd|đ|%)?[\)\]]?$/i.test(rawCellTextFull);

                for (const p of tcParagraphs) {
                    const pPr = getOrCreate(p, "w:pPr");
                    const jc = getOrCreate(pPr, "w:jc");
                    
                    if (isHeaderRow || logicalColIndex === sttColIndex) {
                        setAttr(jc, "val", "center");
                    } else if (!isHeaderRow && isNumericCell) {
                        setAttr(jc, "val", "right"); 
                    } else if (isTotalRow && logicalColIndex === 0 && rawCellTextFull.toUpperCase().includes("TỔNG")) {
                        setAttr(jc, "val", "center"); 
                    } else {
                        setAttr(jc, "val", "left");
                    }
                    
                    const ind = getOrCreate(pPr, "w:ind");
                    setAttr(ind, "left", "0");
                    setAttr(ind, "right", "0");
                    setAttr(ind, "firstLine", "0");
                    ind.removeAttribute("w:hanging");
                    ind.removeAttributeNS(W_NS, "hanging");

                    const spacing = getOrCreate(pPr, "w:spacing");
                    setAttr(spacing, "before", "0");
                    setAttr(spacing, "after", "0");
                    setAttr(spacing, "line", "240"); 
                    setAttr(spacing, "lineRule", "auto");

                    const runs = getNodes(p, "r");
                    
                    if (isHeaderRow) {
                        const pTextNodes = getNodes(p, "t");
                        const rawPText = pTextNodes.map(n => n.textContent || "").join("");
                        const rawPTextTrimmed = rawPText.trim();
                        if (rawPTextTrimmed.length === 0) continue;
                        
                        const isLayoutText = /CỘNG HÒA|ĐỘC LẬP|UBND|TRƯỜNG|MẪU|SỞ|PHÒNG/i.test(rawPTextTrimmed);
                        const hasLetters = /[A-ZÀ-Ỹa-zà-ỹ]/.test(rawPTextTrimmed);
                        
                        if (hasLetters && !isLayoutText && rawPTextTrimmed.length < 100) {
                            let isFirstCharFound = false;
                            for (const t of pTextNodes) {
                                if (t.textContent) {
                                    let txt = t.textContent.toLowerCase();
                                    if (!isFirstCharFound && /[a-zà-ỹ]/i.test(txt)) {
                                        txt = txt.replace(/[a-zà-ỹ]/i, match => match.toUpperCase());
                                        isFirstCharFound = true;
                                    }
                                    ACRONYMS_LIST.forEach(acro => {
                                        const regex = new RegExp(`(^|[^a-zà-ỹA-ZÀ-Ỹ0-9_])(${acro})([^a-zà-ỹA-ZÀ-Ỹ0-9_]|$)`, 'gi');
                                        txt = txt.replace(regex, (m, p1, p2, p3) => p1 + acro + p3);
                                    });
                                    t.textContent = txt; 
                                }
                            }
                            
                            for (const r of runs) {
                                const rPr = getOrCreate(r, "w:rPr");
                                forceBoldNode(rPr);
                                const targetSz = String(options.font.sizeTable * 2);
                                const sz = getOrCreate(rPr, "w:sz");
                                setAttr(sz, "val", targetSz);
                                const szCs = getOrCreate(rPr, "w:szCs");
                                setAttr(szCs, "val", targetSz);
                            }
                            forceParagraphBold(pPr);
                        } else {
                            for (const r of runs) {
                                const rPr = getOrCreate(r, "w:rPr");
                                forceBoldNode(rPr);
                                const targetSz = String(options.font.sizeTable * 2);
                                const sz = getOrCreate(rPr, "w:sz");
                                setAttr(sz, "val", targetSz);
                                const szCs = getOrCreate(rPr, "w:szCs");
                                setAttr(szCs, "val", targetSz);
                            }
                            forceParagraphBold(pPr);
                        }
                    } else {
                        for (const r of runs) {
                            const rPr = getOrCreate(r, "w:rPr");
                            if (isTotalRow) {
                                forceBoldNode(rPr);
                            }
                            const targetSz = String(options.font.sizeTable * 2);
                            const sz = getOrCreate(rPr, "w:sz");
                            setAttr(sz, "val", targetSz); 
                            const szCs = getOrCreate(rPr, "w:szCs");
                            setAttr(szCs, "val", targetSz);
                        }
                        if (isTotalRow) forceParagraphBold(pPr);
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

        const sectPrs = getNodes(doc, "sectPr");
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

    const allRunsInDoc = getNodes(doc, "r");
    for (const r of allRunsInDoc) { getOrCreate(r, "w:rPr"); }
    const allPPrsInDoc = getNodes(doc, "pPr");
    for (const pPr of allPPrsInDoc) { getOrCreate(pPr, "w:rPr"); }

    const allRPrs = getNodes(doc, "rPr");
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
            
            const rPrsExt = getNodes(extDoc, "rPr");
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

    const sectPrs = getNodes(doc, "sectPr");
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
    
    const draftWatermarkXml = options.isDraft ? `
        <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
                <w:rPr><w:noProof/></w:rPr>
                <w:pict>
                    <v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">
                        <v:formulas>
                            <v:f eqn="sum #0 0 10800"/>
                            <v:f eqn="prod #0 2 1"/>
                            <v:f eqn="sum 21600 0 @1"/>
                            <v:f eqn="sum 0 0 @2"/>
                            <v:f eqn="sum 21600 0 @3"/>
                            <v:f eqn="if @0 @3 0"/>
                            <v:f eqn="if @0 21600 @1"/>
                            <v:f eqn="if @0 0 @2"/>
                            <v:f eqn="if @0 @4 21600"/>
                            <v:f eqn="mid @5 @6"/>
                            <v:f eqn="mid @8 @5"/>
                            <v:f eqn="mid @7 @8"/>
                            <v:f eqn="mid @6 @7"/>
                            <v:f eqn="sum @6 0 @5"/>
                        </v:formulas>
                        <v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/>
                        <v:textpath on="t" fitshape="t"/>
                        <o:handles v="h,position,#0,bottomRight"/>
                        <o:lock v="ext" shapetype="t"/>
                    </v:shapetype>
                    <v:shape id="WaterMarkObject1" o:spid="_x0000_s1025" type="#_x0000_t136" style="position:absolute;left:0;text-align:left;margin-left:0;margin-top:0;width:500pt;height:120pt;rotation:315;z-index:-251657216;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f" fillcolor="#d9d9d9" stroked="f">
                        <v:fill opacity="0.3"/>
                        <v:textpath style="font-family:&quot;${fontFamily}&quot;;font-size:1pt;font-weight:bold" string="DỰ THẢO"/>
                        <w10:wrap anchorx="margin" anchory="margin"/>
                    </v:shape>
                </w:pict>
            </w:r>
        </w:p>` : '';

    const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word">
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
        ${draftWatermarkXml}
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
      let child = getNodes(parent, tagName.replace("w:", ""))[0];
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
        
        if (isBold) {
            forceBoldNode(rPr);
        }
        if (isItalic) {
            const i = getOrCreate(rPr, "w:i");
            setAttr(i, "val", "true");
        }
        const t = createElement("w:t");
        t.textContent = text;
        r.appendChild(t);
        
        if (isBold) forceParagraphBold(pPr);
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
        
        if (isBold) {
            forceBoldNode(rPr);
        }
        
        const t = createElement("w:t");
        t.textContent = text;
        r.appendChild(t);
        
        if (isBold) forceParagraphBold(pPr);
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
      let child = getNodes(parent, tagName.replace("w:", ""))[0];
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
            forceBoldNode(rPr);
        }
        if (isItalic) {
            const i = getOrCreate(rPr, "w:i");
            i.removeAttributeNS(W_NS, "val"); i.removeAttribute("w:val");
        }
        
        if (isUnderline) {
            const u = getOrCreate(rPr, "w:u");
            setAttr(u, "val", "single");
        }
        const t = createElement("w:t");
        t.textContent = text;
        r.appendChild(t);
        
        if (isBold) forceParagraphBold(pPr);
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

    const signerTitle = options.signerTitle ? options.signerTitle.normalize("NFC").trim().toUpperCase() : "";
    const signerName = options.signerName ? options.signerName.normalize("NFC").trim() : "";
    const presiderName = options.presiderName ? options.presiderName.normalize("NFC").trim() : "";
    const secretaryName = options.secretaryName ? options.secretaryName.normalize("NFC").trim() : "";

    const addBlankLines = (tc: Element, count: number) => {
        for (let i = 0; i < count; i++) {
            tc.appendChild(createTightP("", false, false, false, "center", 14));
        }
    };

    const getBlankLinesForStamp = (title: string): number => {
        const t = title.toUpperCase();
        if (["HIỆU TRƯỞNG", "CHỦ TỊCH", "GIÁM ĐỐC", "TRƯỞNG PHÒNG", "BÍ THƯ", "TRƯỞNG BAN"].some(k => t.includes(k))) {
            return 5; 
        }
        return 3; 
    };

    if (isMinutes) {
        tc1.appendChild(createTightP("THƯ KÝ", true, false, false, "center", 14));
        addBlankLines(tc1, 3);
        if (secretaryName) tc1.appendChild(createTightP(secretaryName, true, false, false, "center", 14));

        tc2.appendChild(createTightP("CHỦ TỌA", true, false, false, "center", 14));
        addBlankLines(tc2, getBlankLinesForStamp("CHỦ TỌA")); 
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
                const sTitleParty = signerTitle || "BÍ THƯ";
                tc2.appendChild(createTightP(sTitleParty, true, false, false, "center", 14));
                addBlankLines(tc2, getBlankLinesForStamp(sTitleParty));
                if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, "center", 14));
                break;

            case HeaderType.DEPARTMENT:
                const approverTitle = options.approverTitle ? options.approverTitle.normalize("NFC").toUpperCase() : "";
                const approverName = options.approverName ? options.approverName.normalize("NFC") : "";

                if (approverTitle || approverName) {
                    const actualApprTitle = approverTitle || "HIỆU TRƯỞNG";
                    tc1.appendChild(createTightP("DUYỆT CỦA HIỆU TRƯỞNG", true, false, false, "center", 14));

                    if (actualApprTitle.includes("PHÓ")) {
                        tc1.appendChild(createTightP("KT. HIỆU TRƯỞNG", true, false, false, "center", 14));
                        tc1.appendChild(createTightP("PHÓ HIỆU TRƯỞNG", true, false, false, "center", 14));
                        addBlankLines(tc1, 4); 
                    } else {
                        addBlankLines(tc1, 5); 
                    }
                    if (approverName) tc1.appendChild(createTightP(approverName, true, false, false, "center", 14));
                    
                    tc1.appendChild(createTightP("", false, false, false, "center", 14)); 
                }

                tc1.appendChild(createTightP("Nơi nhận:", true, true, false, "left", 12));
                tc1.appendChild(createTightP(`- Lãnh đạo ${org.orgName} (b/c);`, false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Thành viên Tổ (t/h);", false, false, false, "left", 11));
                tc1.appendChild(createTightP("- Lưu HSTCM.", false, false, false, "left", 11));

                const sTitleDep = signerTitle || "TỔ TRƯỞNG";
                tc2.appendChild(createTightP(sTitleDep, true, false, false, "center", 14));
                addBlankLines(tc2, getBlankLinesForStamp(sTitleDep)); 
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

                const sTitleSchool = signerTitle || "HIỆU TRƯỞNG";
                if (sTitleSchool.includes("PHÓ")) {
                    const baseTitle = sTitleSchool.replace("PHÓ ", "");
                    tc2.appendChild(createTightP(`KT. ${baseTitle}`, true, false, false, "center", 14));
                    tc2.appendChild(createTightP(sTitleSchool, true, false, false, "center", 14));
                    addBlankLines(tc2, getBlankLinesForStamp(sTitleSchool) - 1);
                } else {
                    tc2.appendChild(createTightP(sTitleSchool, true, false, false, "center", 14));
                    addBlankLines(tc2, getBlankLinesForStamp(sTitleSchool));
                }
                if (signerName) tc2.appendChild(createTightP(signerName, true, false, false, "center", 14));
                break;
        }
    }
    return tbl;
};