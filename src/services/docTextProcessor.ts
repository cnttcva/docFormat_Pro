// File: src/services/docTextProcessor.ts
import { autoCorrectText } from './textCorrector';

export type DocumentType = 'administrative' | 'party' | 'unknown';

/**
 * 🔥 FIX: Danh sách từ ghép thông dụng đứng sau "xã/huyện/tỉnh/..."
 * KHÔNG phải tên địa danh — không được title-case.
 *
 * Ví dụ:
 *   "xã hội" (tính từ/danh từ chung) → KHÔNG đổi thành "Xã Hội"
 *   "xã Ea Kar" (tên xã) → ĐƯỢC đổi thành "xã Ea Kar"
 */
const NON_GEO_COMPOUNDS = new Set([
    // Sau "xã"
    "hội", "viên", "luận", "thôn", "giao", "hợp",
    // Sau "huyện"
    "ủy", "uỷ",
    // Sau "tỉnh"
    "thành", "lỵ", "táo", "ủy", "uỷ",
    // Sau "phường"
    // (ít từ ghép, để trống)
    // Sau "thị trấn"
    // (luôn là tên riêng)
    // Sau "thành phố"
    // (luôn là tên riêng)
]);

/**
 * Các cụm 2 từ KHÔNG phải địa danh.
 * Kiểm tra theo cụm 2 từ để chính xác hơn.
 */
const NON_GEO_TWO_WORD_COMPOUNDS = new Set([
    "hội đồng", "hội nghị", "hội thảo", "hội trường", "hội viên",
    "đoàn kết", "đoàn thể", "đoàn viên",
    "nhân dân", "nhân viên", "nhân tài",
    "thường xuyên", "thường niên", "thường vụ",
    "viên chức", "luận văn", "luận án",
]);

export const coreSmartFormat = (lowerText: string) => {
    let formattedText = lowerText.charAt(0).toUpperCase() + lowerText.slice(1);

    const acronyms = [
        "UBND", "HĐND", "THCS", "THPT", "GDĐT", "GD&ĐT", "PGD", "BGH",
        "ĐTN", "CĐCS", "VNEN", "UBMTTQ", "BCH", "VT", "EDOC", "SKKN"
    ];

    acronyms.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'ig');
        formattedText = formattedText.replace(regex, kw);
    });

    const properNames = ["Ea Kar", "Chu Văn An", "Đắk Lắk", "Việt Nam", "Hồ Chí Minh"];
    properNames.forEach(name => {
        const regex = new RegExp(`\\b${name}\\b`, 'ig');
        formattedText = formattedText.replace(regex, name);
    });

    const geoPrefixes = ["xã", "huyện", "tỉnh", "thị trấn", "phường", "quận", "thành phố"];

    geoPrefixes.forEach(geo => {
        const regex = new RegExp(
            `\\b(${geo})\\s+([a-záàảãạăâấầẩẫậăắằẳẵặeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ]+(?:\\s+[a-záàảãạăâấầẩẫậăắằẳẵặeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ]+){0,3})`,
            'ig'
        );

        formattedText = formattedText.replace(regex, (match, p1, p2) => {
            const stopWords = ["và", "của", "để", "về", "việc", "các", "những"];

            // 🔥 FIX: Bảo vệ từ ghép thông dụng — không phải tên địa danh
            const words = p2.toLowerCase().trim().split(/\s+/);
            const firstWord = words[0];
            const firstTwoWords = words.slice(0, 2).join(" ");

            if (NON_GEO_COMPOUNDS.has(firstWord) || NON_GEO_TWO_WORD_COMPOUNDS.has(firstTwoWords)) {
                return match; // Giữ nguyên text gốc, không title-case
            }

            const titleCased = p2.split(/\s+/).map((w: string) => {
                if (stopWords.includes(w.toLowerCase())) return w.toLowerCase();
                return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(" ");

            return p1 + " " + titleCased;
        });
    });

    return formattedText;
};

export const normalizeText = (text: string) => {
    return (text || '')
        .replace(/\s+/g, ' ')
        .trim();
};

export const normalizeCompactText = (text: string) => {
    return normalizeText(text)
        .replace(/[‐-‒–—―]/g, '-')
        .replace(/\s+/g, '');
};

export const isSeparatorLine = (text: string) => {
    const compact = normalizeCompactText(text);
    return /^[-_*]{3,}$/.test(compact);
};

export const detectDocumentTypeFromText = (text: string): DocumentType => {
    const upper = normalizeText(text).toUpperCase();

    if (
        upper.includes('ĐẢNG CỘNG SẢN VIỆT NAM') ||
        upper.includes('ĐẢNG BỘ') ||
        upper.includes('CHI BỘ') ||
        upper.includes('T/M CHI BỘ') ||
        upper.includes('BÍ THƯ')
    ) {
        return 'party';
    }

    if (
        upper.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') ||
        upper.includes('ĐỘC LẬP') && upper.includes('TỰ DO') && upper.includes('HẠNH PHÚC')
    ) {
        return 'administrative';
    }

    return 'unknown';
};

type ReceiverFormatOptions = {
    documentType?: DocumentType;
    keepArchiveLine?: boolean;
    allowNhuTren?: boolean;
};

export const formatReceiverText = (
    text: string,
    options: ReceiverFormatOptions = {}
) => {
    const documentType = options.documentType || 'unknown';

    let cleanText = text.replace(/^[\-\+•\s]+/, '').trim();
    if (!cleanText) return null;

    const lowerText = cleanText.toLowerCase();

    const isNhuTren = lowerText.startsWith('như trên') || lowerText.startsWith('nhu tren');
    const isArchiveLine = /^lưu\s*:/i.test(cleanText) || /^luu\s*:/i.test(cleanText);

    if (documentType === 'party' && isNhuTren) {
        return null;
    }

    if (isNhuTren) {
        if (options.allowNhuTren === false) return null;
        return '- Như trên;';
    }

    if (isArchiveLine) {
        let archiveText = cleanText.replace(/[\.\,\;]+$/, '.');
        archiveText = archiveText.replace(/^lưu\s*:/i, 'Lưu:');
        archiveText = archiveText.replace(/^luu\s*:/i, 'Lưu:');
        return '- ' + archiveText;
    }

    let formattedText = coreSmartFormat(lowerText);
    formattedText = autoCorrectText(formattedText);

    if (!/[;,.]$/.test(formattedText)) {
        formattedText += documentType === 'party' ? ',' : ';';
    } else {
        formattedText = formattedText.replace(/[;,.]+$/, documentType === 'party' ? ',' : ';');
    }

    return '- ' + formattedText;
};
