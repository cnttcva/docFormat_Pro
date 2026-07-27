// File: src/services/aiOrganizationContext.ts
//
// Chỉ đọc thông tin đơn vị đang được DocFormatPro lưu cục bộ.
// Không gọi lại useLicenseAuth, không truy vấn Firebase/MySQL
// và không thay đổi dữ liệu bản quyền.

import { OrgInfo } from '../types';

const ORG_STORAGE_KEY = 'docFormat_OrgInfo';

export interface AiOrganizationContext {
  unitId: string;
  orgName: string;
  governingBody: string;
  location: string;
}

const normalizeUnitId = (value: unknown): string => {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

export const readAiOrganizationContext =
  (): AiOrganizationContext | null => {
    try {
      const rawValue =
        localStorage.getItem(ORG_STORAGE_KEY);

      if (!rawValue) {
        return null;
      }

      const orgInfo =
        JSON.parse(rawValue) as Partial<OrgInfo>;

      const unitId =
        normalizeUnitId(orgInfo.schoolId);

      if (!unitId) {
        return null;
      }

      return {
        unitId,
        orgName:
          String(orgInfo.orgName || '').trim() ||
          unitId,
        governingBody:
          String(
            orgInfo.governingBody || ''
          ).trim(),
        location:
          String(orgInfo.location || '').trim(),
      };
    } catch (error) {
      console.warn(
        '[AI_ORGANIZATION_CONTEXT_INVALID]',
        error
      );

      return null;
    }
  };