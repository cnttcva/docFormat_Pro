// File: src/services/docCleaner.ts
import { HeaderType } from '../types';
import { getNodes, isTableParagraph, DOC_TYPE_KEYWORDS } from './docUtils';

export const trimParagraphs = (doc: Document) => {
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
};

export const cleanHeader = (doc: Document, headerType: HeaderType) => {
    if (headerType === HeaderType.NONE) return;

    const headTables = getNodes(doc, "tbl");
    for (let i = 0; i < Math.min(4, headTables.length); i++) {
        const tbl = headTables[i];
        if (!tbl.parentNode) continue;
        const trs = getNodes(tbl, "tr");
        let maxCols = trs.length > 0 ? getNodes(trs[0], "tc").length : 0;
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
};

export const cleanTail = (doc: Document) => {
    const tailTables = getNodes(doc, "tbl");
    for (let i = tailTables.length - 1; i >= Math.max(0, tailTables.length - 5); i--) {
        const tbl = tailTables[i];
        if (!tbl.parentNode) continue;
        const trs = getNodes(tbl, "tr");
        let maxCols = trs.length > 0 ? getNodes(trs[0], "tc").length : 0;
        if (maxCols > 2 || trs.length > 5) continue; 
        const text = tbl.textContent?.toUpperCase() || "";
        if ((text.includes("NƠI NHẬN") || text.includes("HIỆU TRƯỞNG") || text.includes("CHỦ TỊCH") || text.includes("T/M") || text.includes("TỔ TRƯỞNG") || text.includes("DUYỆT")) && text.length < 400) {
            tbl.parentNode.removeChild(tbl);
        }
    }

    const tailParagraphs = getNodes(doc, "p");
    let stopTailScan = false;
    const signatureKeywords = ["NƠI NHẬN", "HIỆU TRƯỞNG", "GIÁM ĐỐC", "CHỦ TỊCH", "CHỦ TỌA", "THƯ KÝ", "TỔ TRƯỞNG", "BÍ THƯ", "KT.", "TM.", "T/M", "LƯU:", "LƯU VT", "NGƯỜI LẬP", "NGƯỜI VIẾT", "DUYỆT"];

    for (let i = tailParagraphs.length - 1; i >= Math.max(0, tailParagraphs.length - 40); i--) {
        if (stopTailScan) break;
        const p = tailParagraphs[i];
        if (isTableParagraph(p)) { stopTailScan = true; continue; }
        if (!p.parentNode) continue;
        const text = p.textContent?.trim() || "";
        const upperText = text.toUpperCase();
        
        const hasMedia = getNodes(p, "drawing").length > 0 || getNodes(p, "pict").length > 0 || getNodes(p, "object").length > 0 || getNodes(p, "sectPr").length > 0;
                         
        if (upperText.length === 0 && !hasMedia) {
             p.parentNode.removeChild(p);
             continue;
        }
        if (hasMedia) { stopTailScan = true; continue; }

        const isSigKeyword = signatureKeywords.some(k => upperText.includes(k));
        const isNoiNhanBullet = (upperText.startsWith("-") || upperText.startsWith("+") || upperText.startsWith("•")) && text.length < 150 && !isSigKeyword;
        const isShortNameOrDate = text.length < 40 && !upperText.includes(":") && !upperText.match(/^[0-9IVX]+\./) && !upperText.startsWith("-");

        if (isSigKeyword || isNoiNhanBullet || isShortNameOrDate) p.parentNode.removeChild(p);
        else stopTailScan = true; 
    }
};