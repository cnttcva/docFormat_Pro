// File: src/services/specialDocuments/index.ts
import { insertQuyetDinhNTSignatureBlock } from './quyetDinhNT';

/**
 * Trả về true nếu văn bản đã được module đặc biệt xử lý chữ ký/nơi nhận.
 * Trả về false nếu cần dùng luồng mặc định cũ.
 */
export const insertSpecialDocumentSignatureBlock = (
  doc: Document,
  options: any,
  docType: string
): boolean => {
  if (insertQuyetDinhNTSignatureBlock(doc, options, docType)) {
    return true;
  }

  return false;
};