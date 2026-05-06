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

const normalizeForDetect = (value: string) => {
    const upper = (value || "")
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

    const noAccent = upper
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return { upper, noAccent };
};

const getBody = (doc: Document): Element | null => {
    const bodies = doc.getElementsByTagNameNS(W_NS, "body");
    if (bodies.length > 0) return bodies[0];

    const fallbackBodies = doc.getElementsByTagName("w:body");
    if (fallbackBodies.length > 0) return fallbackBodies[0];

    return null;
};

const getLocalName = (el: Element): string => {
    return el.localName || el.nodeName.replace(/^.*:/, "");
};

const getElementText = (el: Element): string => {
    return (el.textContent || "")
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim();
};

const isDecorativeLine = (text: string): boolean => {
    const { upper } = normalizeForDetect(text);
    return /^[\s*._\-–—=]+$/.test(upper);
};

const isPageNumberLine = (text: string): boolean => {
    const { upper } = normalizeForDetect(text);
    return /^[0-9]{1,3}$/.test(upper);
};

const isDateLine = (text: string): boolean => {
    const { noAccent } = normalizeForDetect(text);

    return (
        noAccent.length < 160 &&
        noAccent.includes("NGAY") &&
        noAccent.includes("THANG") &&
        noAccent.includes("NAM")
    );
};

const isNumberLine = (text: string): boolean => {
    const { upper, noAccent } = normalizeForDetect(text);

    return (
        upper.startsWith("SỐ:") ||
        upper.startsWith("SỐ ") ||
        upper.startsWith("SỐ.") ||
        noAccent.startsWith("SO:") ||
        noAccent.startsWith("SO ") ||
        noAccent.startsWith("SO.")
    );
};

const isDocumentTitleLine = (text: string): boolean => {
    const { upper, noAccent } = normalizeForDetect(text);

    if (!upper) return false;

    if (DOC_TYPE_KEYWORDS.some(k => upper.startsWith(k))) return true;

    const titleKeywords = [
        "KE HOACH",
        "QUYET DINH",
        "TO TRINH",
        "CONG VAN",
        "THONG BAO",
        "BAO CAO",
        "BIEN BAN",
        "NGHI QUYET",
        "CHUONG TRINH",
        "PHUONG AN",
        "DE AN",
        "HUONG DAN",
        "QUY CHE",
        "QUY DINH",
        "DANH SACH",
        "LICH CONG TAC",
        "PHIEU",
        "DON",
        "NOI QUY"
    ];

    return titleKeywords.some(k => noAccent.startsWith(k));
};

const isPartyHeaderText = (text: string): boolean => {
    const { noAccent } = normalizeForDetect(text);

    return (
        noAccent.includes("DANG CONG SAN VIET NAM") ||
        noAccent.includes("DANG BO") ||
        noAccent.includes("CHI BO") ||
        noAccent.includes("CHI UY")
    );
};

const isAdministrativeHeaderText = (text: string): boolean => {
    const { noAccent } = normalizeForDetect(text);

    const hasNationalName =
        noAccent.includes("CONG HOA XA HOI CHU NGHIA VIET NAM");

    const hasMotto =
        noAccent.includes("DOC LAP") &&
        noAccent.includes("TU DO") &&
        noAccent.includes("HANH PHUC");

    const hasAdministrativeAgency =
        noAccent.includes("UBND") ||
        noAccent.includes("UY BAN NHAN DAN") ||
        noAccent.includes("PHONG GIAO DUC") ||
        noAccent.includes("SO GIAO DUC") ||
        noAccent.includes("BO GIAO DUC") ||
        noAccent.includes("TRUONG ") ||
        noAccent.includes("THCS") ||
        noAccent.includes("THPT") ||
        noAccent.includes("TIEU HOC") ||
        noAccent.includes("MAM NON") ||
        noAccent.includes("PTDT") ||
        noAccent.includes("TRUNG HOC CO SO") ||
        noAccent.includes("TRUNG HOC PHO THONG");

    return hasNationalName || hasMotto || hasAdministrativeAgency;
};

const isDepartmentHeaderText = (text: string): boolean => {
    const { noAccent } = normalizeForDetect(text);

    return (
        noAccent.includes("TO CHUYEN MON") ||
        noAccent.includes("TO KHOA HOC") ||
        noAccent.includes("TO XA HOI") ||
        noAccent.includes("TO TU NHIEN") ||
        noAccent.includes("TO VAN PHONG") ||
        noAccent.includes("SINH HOAT TO") ||
        noAccent.includes("HOP TO")
    );
};

const isHeaderText = (text: string): boolean => {
    const { upper } = normalizeForDetect(text);

    if (upper.length === 0) return true;

    return (
        isPageNumberLine(text) ||
        isDecorativeLine(text) ||
        isNumberLine(text) ||
        isDateLine(text) ||
        isPartyHeaderText(text) ||
        isAdministrativeHeaderText(text) ||
        isDepartmentHeaderText(text)
    );
};

const getTableMaxCols = (tbl: Element): number => {
    const trs = getNodes(tbl, "tr");
    let maxCols = 0;

    for (const tr of trs) {
        const cols = getNodes(tr, "tc").length;
        if (cols > maxCols) maxCols = cols;
    }

    return maxCols;
};

const isLikelyHeaderTable = (tbl: Element): boolean => {
    const text = getElementText(tbl);
    const { noAccent } = normalizeForDetect(text);

    const trs = getNodes(tbl, "tr");
    const maxCols = getTableMaxCols(tbl);

    const hasHeaderKeyword =
        isPartyHeaderText(text) ||
        isAdministrativeHeaderText(text) ||
        isDepartmentHeaderText(text) ||
        noAccent.includes("CONG HOA XA HOI CHU NGHIA VIET NAM") ||
        (
            noAccent.includes("DOC LAP") &&
            noAccent.includes("TU DO") &&
            noAccent.includes("HANH PHUC")
        );

    if (hasHeaderKeyword) return true;

    /**
     * Header thường là bảng 1-2 cột, ít dòng, nằm ở đầu văn bản.
     * Không xoá bảng nội dung dài.
     */
    if (maxCols <= 2 && trs.length <= 10 && text.length < 500) {
        const looksLikeHeader =
            noAccent.includes("UBND") ||
            noAccent.includes("UY BAN NHAN DAN") ||
            noAccent.includes("TRUONG") ||
            noAccent.includes("DANG BO") ||
            noAccent.includes("CHI BO") ||
            noAccent.includes("TO CHUYEN MON") ||
            noAccent.includes("SO:") ||
            noAccent.includes("SO ");

        return looksLikeHeader;
    }

    return false;
};

const isBodyContentStart = (text: string): boolean => {
    const { noAccent } = normalizeForDetect(text);

    if (!noAccent) return false;

    if (isDocumentTitleLine(text)) return true;

    /**
     * Các cụm thường mở đầu phần nội dung chính.
     * Nếu gặp các dòng này thì dừng dọn header để không xoá nhầm thân văn bản.
     */
    const bodyStartKeywords = [
        "CAN CU",
        "THUC HIEN",
        "NGAY",
        "HOM NAY",
        "I.",
        "I ",
        "1.",
        "1 ",
        "A.",
        "A "
    ];

    return bodyStartKeywords.some(k => noAccent.startsWith(k)) && noAccent.length > 20;
};

/**
 * Dọn header cũ trước khi dựng header chuẩn mới.
 *
 * Mục tiêu:
 * - Xoá sạch header cũ của văn bản Đảng, hành chính nhà trường, Tổ chuyên môn.
 * - Xoá cả bảng header và paragraph header.
 * - Dừng ngay khi gặp tiêu đề văn bản: KẾ HOẠCH, NGHỊ QUYẾT, BIÊN BẢN...
 */
export const cleanHeader = (doc: Document, headerType: HeaderType) => {
    if (headerType === HeaderType.NONE) return;

    const body = getBody(doc);
    if (!body) return;

    /**
     * Cách cũ quét toàn bộ getNodes(doc, "p") dễ sót vì header có thể là direct child dạng bảng.
     * Cách mới quét các node trực tiếp trong body từ đầu văn bản đến tiêu đề.
     */
    const children = Array.from(body.childNodes).filter(
        node => node.nodeType === 1
    ) as Element[];

    let scannedBlocks = 0;
    let removedAny = false;

    for (const child of children) {
        if (!child.parentNode) continue;

        const localName = getLocalName(child);

        /**
         * Không đụng section properties.
         */
        if (localName === "sectPr") break;

        /**
         * Chỉ quét phần đầu văn bản.
         */
        scannedBlocks++;
        if (scannedBlocks > 60) break;

        const text = getElementText(child);

        /**
         * Gặp tiêu đề văn bản thì dừng.
         */
        if (isDocumentTitleLine(text)) break;

        /**
         * Nếu gặp thân văn bản thật sự thì dừng để tránh xoá nhầm.
         */
        if (isBodyContentStart(text)) break;

        if (localName === "tbl") {
            if (isLikelyHeaderTable(child)) {
                child.parentNode.removeChild(child);
                removedAny = true;
                continue;
            }

            /**
             * Nếu là bảng đầu tài liệu nhưng không giống header thì dừng.
             */
            if (text.length > 0) break;
        }

        if (localName === "p") {
            if (isHeaderText(text)) {
                child.parentNode.removeChild(child);
                removedAny = true;
                continue;
            }

            /**
             * Paragraph rất ngắn, nằm giữa cụm header, thường là dòng rác / khoảng trống.
             */
            if (removedAny && text.length <= 3) {
                child.parentNode.removeChild(child);
                continue;
            }

            /**
             * Nếu paragraph không phải header và có chữ đáng kể thì dừng.
             */
            if (text.length > 0) break;
        }
    }

    /**
     * Lượt quét bổ sung:
     * Một số file Word có header không nằm sát đầu body do có vài paragraph rỗng / số trang.
     * Quét các paragraph đầu tiên bên ngoài table, dừng khi gặp tiêu đề.
     */
    const headParagraphs = getNodes(doc, "p");
    for (let i = 0; i < Math.min(45, headParagraphs.length); i++) {
        const p = headParagraphs[i];
        if (!p.parentNode || isTableParagraph(p)) continue;

        const text = p.textContent?.replace(/\s+/g, " ").trim() || "";

        if (isDocumentTitleLine(text)) break;
        if (isBodyContentStart(text)) break;

        if (isHeaderText(text)) {
            p.parentNode.removeChild(p);
        }
    }

    /**
     * Lượt quét bổ sung cho bảng header còn sót trong 8 bảng đầu.
     * Dùng để xử lý trường hợp Word đặt header trong bảng nhưng không nằm ở child đầu tiên.
     */
    const headTables = getNodes(doc, "tbl");
    for (let i = 0; i < Math.min(8, headTables.length); i++) {
        const tbl = headTables[i];
        if (!tbl.parentNode) continue;

        const text = getElementText(tbl);

        if (isDocumentTitleLine(text) || isBodyContentStart(text)) break;

        if (isLikelyHeaderTable(tbl)) {
            tbl.parentNode.removeChild(tbl);
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

const isEmptyParagraph = (p: Element): boolean => {
    const textNodes = getNodes(p, "t");
    const fullText = textNodes.map(t => t.textContent || "").join("");

    const cleanText = fullText.replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '');
    if (cleanText.length > 0) return false;

    if (getNodes(p, "drawing").length > 0) return false;
    if (getNodes(p, "pict").length > 0) return false;
    if (getNodes(p, "object").length > 0) return false;

    if (getNodes(p, "sectPr").length > 0) return false;

    const brs = getNodes(p, "br");
    for (const br of brs) {
        const brType = br.getAttribute("w:type") || br.getAttributeNS(W_NS, "type");
        if (brType === "page") return false;
    }

    return true;
};

export const removeConsecutiveEmptyParagraphs = (doc: Document) => {
    const allParagraphs = getNodes(doc, "p");
    const toRemove: Element[] = [];

    let prevWasEmpty = false;
    let lastNonEmptyIndex = -1;

    for (let i = 0; i < allParagraphs.length; i++) {
        const p = allParagraphs[i];

        if (isTableParagraph(p)) {
            prevWasEmpty = false;
            lastNonEmptyIndex = i;
            continue;
        }

        const isEmpty = isEmptyParagraph(p);

        if (isEmpty) {
            if (lastNonEmptyIndex === -1) {
                toRemove.push(p);
                continue;
            }

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

    for (let i = allParagraphs.length - 1; i > lastNonEmptyIndex; i--) {
        const p = allParagraphs[i];
        if (isTableParagraph(p)) break;
        if (isEmptyParagraph(p) && !toRemove.includes(p)) {
            toRemove.push(p);
        }
    }

    for (const p of toRemove) {
        if (p.parentNode) {
            p.parentNode.removeChild(p);
        }
    }

    return toRemove.length;
};