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

export const findLicenseDocIdBySchoolId = async (schoolId: string) => {
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
    throw new Error(`Không tìm thấy license của trường ${normalizedSchoolId}`);
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
    throw new Error(
      `Không tìm thấy unitName nào trong collection staffs của trường ${normalizedSchoolId}.`
    );
  }

  const finalLicenseDocId =
    licenseDocId || await findLicenseDocIdBySchoolId(normalizedSchoolId);

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