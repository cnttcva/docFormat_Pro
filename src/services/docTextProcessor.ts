// File: src/services/docTextProcessor.ts
import { autoCorrectText } from './textCorrector';

export const coreSmartFormat = (lowerText: string) => {
    let formattedText = lowerText.charAt(0).toUpperCase() + lowerText.slice(1);
    
    const acronyms = ["UBND", "HĐND", "THCS", "THPT", "GDĐT", "GD&ĐT", "PGD", "BGH", "ĐTN", "CĐCS", "VNEN", "UBMTTQ", "BCH", "VT", "EDOC", "SKKN"];
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
        const regex = new RegExp(`\\b(${geo})\\s+([a-záàảãạăâấầẩẫậăắằẳẵặeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ]+(?:\\s+[a-záàảãạăâấầẩẫậăắằẳẵặeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ]+){0,3})`, 'ig');
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

export const formatReceiverText = (text: string) => {
    let cleanText = text.replace(/^[\-\+•\s]+/, '').trim();
    if (!cleanText) return null;
    
    let lowerText = cleanText.toLowerCase();
    if (lowerText.startsWith("như trên") || lowerText.startsWith("lưu")) return null;
    
    let formattedText = coreSmartFormat(lowerText);
    
    // 🎯 CHỐT CHẶN TỪ ĐIỂN: Kiểm tra chính tả Nơi nhận
    formattedText = autoCorrectText(formattedText);
    
    if (!formattedText.endsWith(";")) {
        formattedText = formattedText.replace(/[\.\,\;]+$/, '') + ";";
    }
    return "- " + formattedText;
};