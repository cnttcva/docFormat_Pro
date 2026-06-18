// File: src/services/specialDocuments/index.ts
import { insertQuyetDinhChiBoSignatureBlock } from './quyetDinhChiBo';
import { insertQuyetDinhNTSignatureBlock } from './quyetDinhNT';

const normalizeForDetect = (value: string): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Đđ]/g, match => (match === 'Đ' ? 'D' : 'd'))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const isPartyHeaderType = (headerType: unknown): boolean => {
  const t = normalizeForDetect(String(headerType || ''));

  return (
    t.includes('PARTY') ||
    t.includes('DANG') ||
    t.includes('CHI BO') ||
    t.includes('CAP UY')
  );
};

const isChiBoDecisionFromDocument = (doc: Document): boolean => {
  const text = normalizeForDetect(doc?.documentElement?.textContent || '');

  const hasDecisionKeyword = text.includes('QUYET DINH');

  const hasPartyContext =
    text.includes('CHI BO') ||
    text.includes('CAP UY CHI BO') ||
    text.includes('DANG UY') ||
    text.includes('DANG BO') ||
    text.includes('DANG CONG SAN VIET NAM');

  return hasDecisionKeyword && hasPartyContext;
};

const isChiBoDecisionFromOptions = (
  doc: Document,
  options: any,
  docType: string
): boolean => {
  const specialType = normalizeForDetect(String(options?.specialDocumentType || ''));
  const type = normalizeForDetect(docType || String(options?.docType || ''));
  const templateType = normalizeForDetect(String(options?.templateType || ''));

  const declaredDocTypeText = `${specialType} ${type} ${templateType}`;

  const isExplicitNonDecisionDocument =
    declaredDocTypeText.includes('BAO CAO') ||
    declaredDocTypeText.includes('KE HOACH') ||
    declaredDocTypeText.includes('CHUONG TRINH') ||
    declaredDocTypeText.includes('NGHI QUYET') ||
    declaredDocTypeText.includes('THONG BAO') ||
    declaredDocTypeText.includes('KET LUAN') ||
    declaredDocTypeText.includes('TO TRINH') ||
    declaredDocTypeText.includes('BIEN BAN');

  if (isExplicitNonDecisionDocument) {
    return false;
  }

  const hasDecisionKeyword =
    specialType.includes('QUYET DINH') ||
    type.includes('QUYET DINH') ||
    templateType.includes('QUYET DINH') ||
    isChiBoDecisionFromDocument(doc);

  if (!hasDecisionKeyword) {
    return false;
  }

  return (
    isPartyHeaderType(options?.headerType) ||
    specialType.includes('CHI BO') ||
    specialType.includes('CAP UY CHI BO') ||
    specialType.includes('DANG') ||
    templateType.includes('CHI BO') ||
    templateType.includes('CAP UY CHI BO') ||
    templateType.includes('DANG') ||
    type.includes('CHI BO') ||
    type.includes('CAP UY CHI BO') ||
    type.includes('DANG')
  );
};

/**
 * Trả về true nếu văn bản đã được module đặc biệt xử lý chữ ký/nơi nhận.
 * Trả về false nếu cần dùng luồng mặc định cũ.
 */
export const insertSpecialDocumentSignatureBlock = (
  doc: Document,
  options: any,
  docType: string
): boolean => {
  /**
   * Ưu tiên tuyệt đối Quyết định Chi bộ / văn bản Đảng.
   */
  if (isChiBoDecisionFromOptions(doc, options, docType)) {
    const patchedOptions = {
      ...options,
      isDecision: true,
      isChiBoDecision: true,
      isPartyDecision: true,
      specialDocumentType: options?.specialDocumentType || 'quyet-dinh-chi-bo',
      docType: docType || options?.docType || 'Quyết định của cấp ủy chi bộ Đảng'
    };

    if (insertQuyetDinhChiBoSignatureBlock(doc, patchedOptions, docType)) {
      return true;
    }

    /**
     * Đã nhận diện là Quyết định Chi bộ thì không cho fallback sang Quyết định NT.
     */
    return true;
  }

  if (insertQuyetDinhChiBoSignatureBlock(doc, options, docType)) {
    return true;
  }

  if (insertQuyetDinhNTSignatureBlock(doc, options, docType)) {
    return true;
  }

  return false;
};