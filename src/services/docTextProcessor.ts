// File: src/services/docTextProcessor.ts
import { autoCorrectText } from './textCorrector';

export type DocumentType = 'administrative' | 'party' | 'unknown';

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

/**
 * Format một dòng trong mục "Nơi nhận".
 *
 * Lưu ý:
 * - Văn bản Đảng không được tự thêm "Như trên".
 * - Văn bản Đảng không được đổi "Lưu: Chi bộ." thành "Lưu: VT."
 * - Hàm này chỉ xử lý từng dòng, không tự sinh thêm dòng mới.
 */
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

    // Văn bản Đảng: tuyệt đối không tự đưa "Như trên" vào danh sách nơi nhận.
    if (documentType === 'party' && isNhuTren) {
        return null;
    }

    // Văn bản hành chính: dòng "Như trên" có thể do hàm khác chủ động thêm;
    // nếu dòng này đã có sẵn thì giữ, không nhân bản.
    if (isNhuTren) {
        if (options.allowNhuTren === false) return null;
        return '- Như trên;';
    }

    // Dòng lưu hồ sơ phải được giữ theo nội dung gốc.
    // Đặc biệt: văn bản Đảng có thể là "Lưu: Chi bộ.", không được đổi thành "Lưu: VT."
    if (isArchiveLine) {
        let archiveText = cleanText.replace(/[\.\,\;]+$/, '.');

        // Chuẩn hóa nhẹ chữ "lưu" nhưng giữ phần sau dấu hai chấm.
        archiveText = archiveText.replace(/^lưu\s*:/i, 'Lưu:');
        archiveText = archiveText.replace(/^luu\s*:/i, 'Lưu:');

        return '- ' + archiveText;
    }

    let formattedText = coreSmartFormat(lowerText);

    // Kiểm tra chính tả nơi nhận
    formattedText = autoCorrectText(formattedText);

    // Văn bản Đảng trong file mẫu đang dùng dấu phẩy sau từng dòng nơi nhận,
    // nhưng để an toàn, ta không ép đổi dấu câu theo loại văn bản ở đây.
    // Nếu muốn theo hành chính thì hàm gọi bên ngoài có thể chuẩn hóa sau.
    if (!/[;,.]$/.test(formattedText)) {
        formattedText += documentType === 'party' ? ',' : ';';
    } else {
        formattedText = formattedText.replace(/[;,.]+$/, documentType === 'party' ? ',' : ';');
    }

    return '- ' + formattedText;
};