// File: src/services/docExtractor.ts
import { getNodes } from './docUtils';
import { formatReceiverText } from './docTextProcessor';

export const extractReceivers = (doc: Document, finalOptions: any) => {
    const rawExtractedReceivers: string[] = [];
    const allPForExtraction = getNodes(doc, "p");
    let foundNoiNhan = false;
    
    for (const p of allPForExtraction) {
        const text = p.textContent?.trim() || "";
        const upper = text.toUpperCase();
        
        if (upper === "NƠI NHẬN:" || upper === "NƠI NHẬN" || upper.startsWith("NƠI NHẬN")) {
            foundNoiNhan = true;
            continue;
        }
        
        if (foundNoiNhan) {
            if (text !== "") {
                if (["HIỆU TRƯỞNG", "GIÁM ĐỐC", "CHỦ TỊCH", "BÍ THƯ", "T/M", "KT.", "QUYỀN", "CHỦ TỌA", "THƯ KÝ", "NGƯỜI LẬP", "NGƯỜI VIẾT", "TỔ TRƯỞNG", "DUYỆT"].some(k => upper.includes(k))) {
                    break;
                }
                
                if (text.length < 150 && !rawExtractedReceivers.includes(text)) {
                    rawExtractedReceivers.push(text);
                }
            }
        }
    }

    const extractedReceivers: string[] = [];
    if (rawExtractedReceivers.length > 0) {
        extractedReceivers.push("- Như trên;");
        for (const rText of rawExtractedReceivers) {
            const formatted = formatReceiverText(rText);
            if (formatted && !extractedReceivers.includes(formatted)) {
                extractedReceivers.push(formatted);
            }
        }
        extractedReceivers.push("- Lưu: VT.");
    }
    
    if (finalOptions.keepOriginalReceivers && extractedReceivers.length > 0) {
        finalOptions.extractedReceivers = extractedReceivers;
    } else {
        finalOptions.extractedReceivers = null;
    }

    if (finalOptions.orgInfo && finalOptions.orgInfo.receivers) {
        const orgReceivers: string[] = [];
        orgReceivers.push("- Như trên;");
        for (const rText of finalOptions.orgInfo.receivers) {
            const formatted = formatReceiverText(rText);
            if (formatted && !orgReceivers.includes(formatted)) {
                orgReceivers.push(formatted);
            }
        }
        orgReceivers.push("- Lưu: VT.");
        finalOptions.orgInfo.receivers = orgReceivers;
    }
};