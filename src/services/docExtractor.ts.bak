// File: src/services/docExtractor.ts
import { getNodes } from './docUtils';
import { formatReceiverText } from './docTextProcessor';

const getHeaderTypeText = (finalOptions: any) => {
    return String(
        finalOptions?.headerType ||
        finalOptions?.documentType ||
        finalOptions?.type ||
        ''
    ).toUpperCase();
};

const isPartyDocument = (doc: Document, finalOptions: any) => {
    const headerTypeText = getHeaderTypeText(finalOptions);

    if (
        headerTypeText.includes('PARTY') ||
        headerTypeText.includes('DANG') ||
        headerTypeText.includes('ĐẢNG')
    ) {
        return true;
    }

    const allText = doc.documentElement?.textContent?.toUpperCase() || '';

    return (
        allText.includes('ĐẢNG CỘNG SẢN VIỆT NAM') ||
        allText.includes('ĐẢNG BỘ') ||
        allText.includes('CHI BỘ') ||
        allText.includes('T/M CHI BỘ') ||
        allText.includes('BÍ THƯ')
    );
};

const normalizeReceiverLineKey = (text: string) => {
    return (text || '')
        .replace(/^[\-\+•\s]+/, '')
        .replace(/[.,;]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const isNoiNhanTitle = (text: string) => {
    const upper = (text || '').trim().toUpperCase();
    return upper === 'NƠI NHẬN:' || upper === 'NƠI NHẬN' || upper.startsWith('NƠI NHẬN');
};

const isSignatureStart = (upperText: string) => {
    return [
        'HIỆU TRƯỞNG',
        'GIÁM ĐỐC',
        'CHỦ TỊCH',
        'BÍ THƯ',
        'T/M',
        'KT.',
        'QUYỀN',
        'CHỦ TỌA',
        'THƯ KÝ',
        'NGƯỜI LẬP',
        'NGƯỜI VIẾT',
        'TỔ TRƯỞNG',
        'DUYỆT'
    ].some(k => upperText.includes(k));
};

const buildReceivers = (
    rawReceivers: string[],
    documentType: 'party' | 'administrative' | 'unknown'
) => {
    const result: string[] = [];
    const seen = new Set<string>();

    const addLine = (line: string | null) => {
        if (!line) return;

        const key = normalizeReceiverLineKey(line);
        if (!key) return;

        if (seen.has(key)) return;
        seen.add(key);
        result.push(line);
    };

    if (documentType === 'administrative') {
        addLine('- Như trên;');
    }

    for (const rText of rawReceivers) {
        const key = normalizeReceiverLineKey(rText);

        // Văn bản Đảng: không thêm/giữ "Như trên" kiểu hành chính.
        if (documentType === 'party' && (key === 'như trên' || key === 'nhu tren')) {
            continue;
        }

        const formatted = formatReceiverText(rText, documentType);
        addLine(formatted);
    }

    const hasArchiveLine = result.some(line => {
        const key = normalizeReceiverLineKey(line);
        return key.startsWith('lưu:') || key.startsWith('luu:');
    });

    if (!hasArchiveLine) {
        if (documentType === 'administrative') {
            addLine('- Lưu: VT.');
        } else if (documentType === 'party') {
            addLine('- Lưu: Chi bộ.');
        }
    }

    return result;
};

export const extractReceivers = (doc: Document, finalOptions: any) => {
    const rawExtractedReceivers: string[] = [];
    const allPForExtraction = getNodes(doc, 'p');
    let foundNoiNhan = false;

    const documentType: 'party' | 'administrative' | 'unknown' =
        isPartyDocument(doc, finalOptions) ? 'party' : 'administrative';

    for (const p of allPForExtraction) {
        const text = p.textContent?.trim() || '';
        const upper = text.toUpperCase();

        if (isNoiNhanTitle(text)) {
            foundNoiNhan = true;
            continue;
        }

        if (foundNoiNhan) {
            if (text !== '') {
                if (isSignatureStart(upper)) {
                    break;
                }

                if (text.length < 150 && !rawExtractedReceivers.includes(text)) {
                    rawExtractedReceivers.push(text);
                }
            }
        }
    }

    const extractedReceivers =
        rawExtractedReceivers.length > 0
            ? buildReceivers(rawExtractedReceivers, documentType)
            : [];

    if (finalOptions.keepOriginalReceivers && extractedReceivers.length > 0) {
        finalOptions.extractedReceivers = extractedReceivers;
    } else {
        finalOptions.extractedReceivers = null;
    }

    if (finalOptions.orgInfo && finalOptions.orgInfo.receivers) {
        finalOptions.orgInfo.receivers = buildReceivers(
            finalOptions.orgInfo.receivers,
            documentType
        );
    }
};