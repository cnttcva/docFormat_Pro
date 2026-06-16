import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const normalizeSchoolId = (value: string) => {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

const dedupeDepartments = (departments: string[]) => {
  const seen = new Set<string>();

  return departments
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const findLicenseDocIdBySchoolId = async (
  schoolId: string
): Promise<string | null> => {
  const normalizedSchoolId = normalizeSchoolId(schoolId);

  console.log('[SyncDepartments] findLicenseDocIdBySchoolId:', normalizedSchoolId);

  const q = query(
    collection(db, 'licenses'),
    where('schoolId', '==', normalizedSchoolId),
    limit(1)
  );

  const snap = await getDocs(q);

  console.log('[SyncDepartments] license docs found:', snap.size);

  if (snap.empty) {
    console.warn(
      `[SyncDepartments] Bỏ qua đồng bộ departments vào Firebase licenses vì không tìm thấy license legacy của trường ${normalizedSchoolId}.`
    );
    return null;
  }

  return snap.docs[0].id;
};

export const syncDepartmentsToLicense = async (
  schoolId: string,
  licenseDocId?: string
) => {
  const normalizedSchoolId = normalizeSchoolId(schoolId);

  console.log('[SyncDepartments] START:', {
    inputSchoolId: schoolId,
    normalizedSchoolId,
    licenseDocId,
  });

  if (!normalizedSchoolId) {
    throw new Error('Thiếu schoolId để đồng bộ tổ chuyên môn.');
  }

  const staffsQuery = query(
    collection(db, 'staffs'),
    where('schoolId', '==', normalizedSchoolId)
  );

  const staffsSnap = await getDocs(staffsQuery);

  const rawStaffs = staffsSnap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as any[];

  console.log('[SyncDepartments] staffs count:', rawStaffs.length);
  console.log('[SyncDepartments] sample staffs:', rawStaffs.slice(0, 10));

  const departments = dedupeDepartments(rawStaffs.map((staff) => staff.unitName));

  console.log('[SyncDepartments] departments extracted:', departments);

  if (departments.length === 0) {
  console.warn(
    `[SyncDepartments] Không còn unitName nào trong collection staffs của trường ${normalizedSchoolId}; trả về danh sách departments rỗng.`
  );
  return [];
}

  const finalLicenseDocId =
  licenseDocId || await findLicenseDocIdBySchoolId(normalizedSchoolId);

if (!finalLicenseDocId) {
  console.warn(
    `[SyncDepartments] Không có license Firebase legacy cho ${normalizedSchoolId}; chỉ lưu nhân sự, bỏ qua cập nhật departments vào licenses.`
  );
  return departments;
}

console.log('[SyncDepartments] updating license:', {
  finalLicenseDocId,
  departments,
});

await updateDoc(doc(db, 'licenses', finalLicenseDocId), {
  departments,
  departmentsUpdatedAt: serverTimestamp(),
});

  console.log('[SyncDepartments] DONE:', {
    schoolId: normalizedSchoolId,
    departments,
  });

  return departments;
};