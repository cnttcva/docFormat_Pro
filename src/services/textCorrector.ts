// File: src/services/textCorrector.ts

// 1. CUỐN SỔ ĐEN: Danh sách các lỗi sai chính tả hành chính phổ biến nhất
// (Sau này bạn có thể tự do thêm hàng trăm từ vào đây)
const DICTIONARY_RULES = [
    { wrong: /xắp sếp/gi, right: "sắp xếp" },
    { wrong: /bổ xung/gi, right: "bổ sung" },
    { wrong: /xuất xắc/gi, right: "xuất sắc" },
    { wrong: /suất xắc/gi, right: "xuất sắc" },
    { wrong: /chỉnh chu/gi, right: "chỉn chu" },
    { wrong: /sát nhập/gi, right: "sáp nhập" },
    { wrong: /thăm quan/gi, right: "tham quan" },
    { wrong: /đường xá/gi, right: "đường sá" },
    { wrong: /chắp bút/gi, right: "chấp bút" },
    { wrong: /vô hình chung/gi, right: "vô hình trung" },
    { wrong: /sử lý/gi, right: "xử lý" },
    { wrong: /xử lí/gi, right: "xử lý" } // Văn bản hành chính VN thường ưu tiên "lý" thay vì "lí"
];

export const autoCorrectText = (text: string): string => {
    if (!text || typeof text !== 'string') return text;

    let corrected = text;

    // ==========================================
    // PHA 1: DỌN DẸP KHOẢNG TRẮNG VÀ DẤU CÂU (Regex Magic)
    // ==========================================
    
    // 1. Xóa khoảng trắng thừa giữa các từ (vd: "Cộng   hòa" -> "Cộng hòa")
    corrected = corrected.replace(/ {2,}/g, ' ');
    
    // 2. Cắt bỏ khoảng trắng vô lý trước dấu câu (vd: "độc lập , tự do" -> "độc lập, tự do")
    corrected = corrected.replace(/\s+([,.;!?])/g, '$1');
    
    // 3. Bơm thêm 1 khoảng trắng sau dấu câu nếu bị dính chữ (vd: "độc lập,tự do" -> "độc lập, tự do")
    // Dùng \p{L} để nhận diện bảng chữ cái Tiếng Việt an toàn, không ảnh hưởng đến số thập phân (3.14)
    corrected = corrected.replace(/([,.;!?])([\p{L}])/gu, '$1 $2');

    // ==========================================
    // PHA 2: TRUY QUÉT VÀ TIÊU DIỆT LỖI CHÍNH TẢ
    // ==========================================
    
    DICTIONARY_RULES.forEach(rule => {
        corrected = corrected.replace(rule.wrong, (match) => {
            // Giữ nguyên In Hoa toàn bộ nếu từ gốc in hoa (VD: XẮP SẾP -> SẮP XẾP)
            if (match === match.toUpperCase()) {
                return rule.right.toUpperCase();
            }
            // Giữ nguyên Viết Hoa chữ cái đầu (VD: Xắp sếp -> Sắp xếp)
            if (match[0] === match[0].toUpperCase()) {
                return rule.right.charAt(0).toUpperCase() + rule.right.slice(1);
            }
            // Mặc định chữ thường
            return rule.right;
        });
    });

    return corrected.trim();
};