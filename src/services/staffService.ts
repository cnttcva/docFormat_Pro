import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig'; 
import { Staff } from '../types';

export const fetchStaffSuggestions = async (searchText: string, schoolId: string): Promise<Staff[]> => {
  try {
    const staffsRef = collection(db, "staffs"); 
    const q = query(staffsRef, where("schoolId", "==", schoolId));
    const querySnapshot = await getDocs(q);

    const results: Staff[] = [];
    const searchLower = searchText.toLowerCase().trim();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const fullName = data.fullName ? String(data.fullName) : "";
      
      if (fullName.toLowerCase().includes(searchLower)) {
        results.push({
          id: String(doc.id),
          fullName: fullName,
          position: data.position ? String(data.position) : "",
          partyPosition: data.partyPosition ? String(data.partyPosition) : "", // CHỨC VỤ ĐẢNG
          unitName: data.unitName ? String(data.unitName) : "",
          schoolId: data.schoolId ? String(data.schoolId) : "",
          email: data.email ? String(data.email) : "",       // Đã khôi phục trường email
          status: data.status ? String(data.status) : ""     // Đã khôi phục trường status
        } as Staff);
      }
    });

    return results;
  } catch (error: any) {
    // Ném thẳng lỗi ra ngoài để App.tsx bắt được và hiển thị lên màn hình
    throw new Error(error.message || "Lỗi truy xuất dữ liệu");
  }
};