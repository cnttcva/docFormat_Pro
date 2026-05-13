// File: src/services/docExtractor.ts
import { getNodes } from './docUtils';
import { formatReceiverText } from './docTextProcessor';

type DocumentReceiverType = 'party' | 'administrative' | 'unknown';

const getHeaderTypeText = (finalOptions: any) => {
    return String(
        finalOptions?.headerType ||
        finalOptions?.documentType ||
        finalOptions?.type ||
        ''
    ).toUpperCase();
};

const normalizeVietnameseText = (text: string) => {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[Đđ]/g, 'D')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
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
    return String(text || '')
        .replace(/^[\-\+•\s]+/, '')
        .replace(/[.,;]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const isNoiNhanTitle = (text: string) => {
    const upper = String(text || '').trim().toUpperCase();
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

/**
 * Chỉ thêm "- Như trên;" cho nhóm văn bản có "Kính gửi".
 * Không tự thêm cho Báo cáo, Quyết định, Kế hoạch vì không phù hợp thể thức.
 */
const shouldAddNhuTren = (doc: Document, finalOptions: any) => {
    const optionText = String(
        finalOptions?.docType ||
        finalOptions?.documentType ||
        finalOptions?.specialDocumentType ||
        ''
    ).toUpperCase();

    const normalizedOptionText = normalizeVietnameseText(optionText);

    if (
        normalizedOptionText.includes('BAO CAO') ||
        normalizedOptionText.includes('QUYET DINH') ||
        normalizedOptionText.includes('KE HOACH') ||
        normalizedOptionText.includes('TO TRINH') === false && normalizedOptionText.includes('CONG VAN') === false
    ) {
        const allText = normalizeVietnameseText(doc.documentElement?.textContent || '');

        if (
            allText.includes('BAO CAO') ||
            allText.includes('QUYET DINH') ||
            allText.includes('KE HOACH')
        ) {
            return false;
        }
    }

    const allTextOriginal = doc.documentElement?.textContent?.toUpperCase() || '';

    return (
        allTextOriginal.includes('KÍNH GỬI') ||
        allTextOriginal.includes('KÍNH GỞI') ||
        allTextOriginal.includes('KÍNH GỬI:')
    );
};

/**
 * Bộ lọc an toàn cho dữ liệu cũ từng bị khóa cứng.
 * Chỉ loại "UBND xã Ea Kar" nếu đơn vị hiện tại không phải Ea Kar.
 */
const isLegacyHardcodedReceiver = (text: string, finalOptions: any) => {
    const key = normalizeVietnameseText(normalizeReceiverLineKey(text));

    const governingBody = normalizeVietnameseText(
        finalOptions?.orgInfo?.governingBody ||
        finalOptions?.governingBody ||
        ''
    );

    const orgLocation = normalizeVietnameseText(
        finalOptions?.orgInfo?.location ||
        finalOptions?.location ||
        ''
    );

    const currentOrgText = `${governingBody} ${orgLocation}`;

    if (
        key === 'UBND XA EA KAR' ||
        key === 'UY BAN NHAN DAN XA EA KAR'
    ) {
        return !currentOrgText.includes('EA KAR');
    }

    return false;
};

const buildReceiverFormatOptions = (
    documentType: DocumentReceiverType,
    finalOptions: any
): any => {
    return {
        ...finalOptions,

        documentType,
        receiverDocumentType: documentType,

        isPartyDocument: documentType === 'party',
        isAdministrativeDocument: documentType === 'administrative',

        headerType: finalOptions?.headerType,
        orgInfo: finalOptions?.orgInfo
    };
};

const buildReceivers = (
    rawReceivers: string[],
    documentType: DocumentReceiverType,
    addNhuTren: boolean = false,
    finalOptions: any = {}
) => {
    const result: string[] = [];
    const seen = new Set<string>();

    const receiverFormatOptions = buildReceiverFormatOptions(documentType, finalOptions);

    const addLine = (line: string | null | undefined) => {
        if (!line) return;

        const key = normalizeReceiverLineKey(line);
        if (!key) return;

        if (seen.has(key)) return;
        seen.add(key);
        result.push(line);
    };

    if (documentType === 'administrative' && addNhuTren) {
        addLine('- Như trên;');
    }

    for (const rText of rawReceivers) {
        if (!rText) continue;

        if (isLegacyHardcodedReceiver(rText, finalOptions)) {
            continue;
        }

        const key = normalizeReceiverLineKey(rText);

        // Văn bản Đảng: không thêm/giữ "Như trên" kiểu hành chính.
        if (documentType === 'party' && (key === 'như trên' || key === 'nhu tren')) {
            continue;
        }

        const formatted = formatReceiverText(rText, receiverFormatOptions);
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

    const documentType: DocumentReceiverType =
        isPartyDocument(doc, finalOptions) ? 'party' : 'administrative';

    const addNhuTren = shouldAddNhuTren(doc, finalOptions);

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

                if (
                    text.length < 150 &&
                    !rawExtractedReceivers.includes(text) &&
                    !isLegacyHardcodedReceiver(text, finalOptions)
                ) {
                    rawExtractedReceivers.push(text);
                }
            }
        }
    }

    const extractedReceivers =
        rawExtractedReceivers.length > 0
            ? buildReceivers(
                rawExtractedReceivers,
                documentType,
                addNhuTren,
                finalOptions
            )
            : [];

    if (finalOptions.keepOriginalReceivers && extractedReceivers.length > 0) {
        finalOptions.extractedReceivers = extractedReceivers;
    } else {
        finalOptions.extractedReceivers = null;
    }

    if (
        finalOptions.orgInfo &&
        Array.isArray(finalOptions.orgInfo.receivers)
    ) {
        const cleanOrgReceivers = finalOptions.orgInfo.receivers.filter(
            (receiver: string) => !isLegacyHardcodedReceiver(receiver, finalOptions)
        );

        finalOptions.orgInfo.receivers = buildReceivers(
            cleanOrgReceivers,
            documentType,
            addNhuTren,
            finalOptions
        );
    }
};