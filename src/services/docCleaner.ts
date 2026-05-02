// File: src/services/docCleaner.ts
import { HeaderType } from '../types';
import { getNodes, isTableParagraph, DOC_TYPE_KEYWORDS, W_NS } from './docUtils';

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

/**
 * Kiểm tra một <w:p> có phải đoạn văn rỗng (không có nội dung text + không có media)
 * Một đoạn được coi là "rỗng" nếu:
 * - Không có text
 * - Không có drawing/pict/object (hình ảnh)
 * - Không có sectPr (section properties - quan trọng cho layout)
 * - Không có page break
 */
const isEmptyParagraph = (p: Element): boolean => {
    const textNodes = getNodes(p, "t");
    const fullText = textNodes.map(t => t.textContent || "").join("");
    
    // Check text rỗng (loại bỏ cả khoảng trắng đặc biệt)
    const cleanText = fullText.replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '');
    if (cleanText.length > 0) return false;
    
    // Có hình ảnh / object → KHÔNG rỗng
    if (getNodes(p, "drawing").length > 0) return false;
    if (getNodes(p, "pict").length > 0) return false;
    if (getNodes(p, "object").length > 0) return false;
    
    // Có sectPr → KHÔNG rỗng (giữ lại để bảo toàn layout)
    if (getNodes(p, "sectPr").length > 0) return false;
    
    // Có page break → KHÔNG rỗng
    const brs = getNodes(p, "br");
    for (const br of brs) {
        const brType = br.getAttribute("w:type") || br.getAttributeNS(W_NS, "type");
        if (brType === "page") return false;
    }
    
    return true;
};

/**
 * Loại bỏ các đoạn văn rỗng liên tiếp, chỉ giữ tối đa 1 đoạn rỗng giữa các đoạn có nội dung.
 * Áp dụng cho TOÀN BỘ document body, kể cả phần signature ở cuối.
 * 
 * Quy tắc:
 * - Nếu có 2+ đoạn rỗng liên tiếp → chỉ giữ lại 1
 * - Đoạn rỗng đầu/cuối document → xóa hẳn (không cần thiết)
 * - Bảo toàn các đoạn có hình ảnh, sectPr, page break
 */
export const removeConsecutiveEmptyParagraphs = (doc: Document) => {
    const allParagraphs = getNodes(doc, "p");
    const toRemove: Element[] = [];
    
    let prevWasEmpty = false;
    let lastNonEmptyIndex = -1;
    
    // Tìm vị trí đoạn rỗng đầu tiên có nội dung phía trước/sau
    for (let i = 0; i < allParagraphs.length; i++) {
        const p = allParagraphs[i];
        
        // Bỏ qua paragraph nằm trong table (xử lý riêng nếu cần)
        if (isTableParagraph(p)) {
            prevWasEmpty = false;
            lastNonEmptyIndex = i;
            continue;
        }
        
        const isEmpty = isEmptyParagraph(p);
        
        if (isEmpty) {
            // Đoạn rỗng đầu document → đánh dấu xóa
            if (lastNonEmptyIndex === -1) {
                toRemove.push(p);
                continue;
            }
            
            // Đoạn rỗng nối tiếp đoạn rỗng trước đó → đánh dấu xóa
            if (prevWasEmpty) {
                toRemove.push(p);
                continue;
            }
            
            prevWasEmpty = true;
        } else {
            prevWasEmpty = false;
            lastNonEmptyIndex = i;
        }
    }
    
    // Xóa các đoạn rỗng cuối document (sau đoạn có nội dung cuối cùng)
    for (let i = allParagraphs.length - 1; i > lastNonEmptyIndex; i--) {
        const p = allParagraphs[i];
        if (isTableParagraph(p)) break;
        if (isEmptyParagraph(p) && !toRemove.includes(p)) {
            toRemove.push(p);
        }
    }
    
    // Thực hiện xóa
    for (const p of toRemove) {
        if (p.parentNode) {
            p.parentNode.removeChild(p);
        }
    }
    
    return toRemove.length;
};
