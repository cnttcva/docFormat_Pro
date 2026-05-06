// File: src/utils/excelHelper.ts
// Utility xử lý Excel - đọc file, tạo file mẫu, export

import * as XLSX from 'xlsx';
import { Staff } from '../types';

// Mapping cột Excel sang field của Staff
// Cho phép linh hoạt với nhiều dạng tiêu đề tiếng Việt
const COLUMN_MAPPING: Record<string, keyof Staff> = {
  'họ và tên': 'fullName',
  'họ tên': 'fullName',
  'fullname': 'fullName',
  'full name': 'fullName',
  
  'mã trường': 'schoolId',
  'school id': 'schoolId',
  'schoolid': 'schoolId',
  'mã định danh': 'schoolId',
  
  'chức vụ': 'position',
  'chức vụ hành chính': 'position',
  'chức vụ hc': 'position',
  'position': 'position',
  
  'chức vụ đảng': 'partyPosition',
  'chức vụ đoàn thể': 'partyPosition',
  'party position': 'partyPosition',
  
  'tổ chuyên môn': 'unitName',
  'phòng ban': 'unitName',
  'tổ/phòng ban': 'unitName',
  'unit': 'unitName',
  
  'email': 'email',
  'thư điện tử': 'email',
  
  'trạng thái': 'status',
  'status': 'status'
};

/**
 * Chuẩn hóa tên cột để khớp với mapping
 */
const normalizeColumnName = (name: string): string => {
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

/**
 * Đọc file Excel và parse thành mảng Staff
 */
export const parseExcelFile = (file: File): Promise<Omit<Staff, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Lấy sheet đầu tiên
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('File Excel không có sheet nào'));
          return;
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert thành JSON array of arrays (header: 1 = row đầu là header)
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '' // Cho cell rỗng giá trị mặc định là ''
        });
        
        if (jsonData.length < 2) {
          reject(new Error('File Excel phải có ít nhất 1 dòng dữ liệu (không tính header)'));
          return;
        }
        
        // Row 0: header, các row sau: data
        const headers = jsonData[0].map((h: any) => normalizeColumnName(String(h)));
        
        // Map header sang field của Staff
        const fieldMap: (keyof Staff | null)[] = headers.map(h => COLUMN_MAPPING[h] || null);
        
        // Kiểm tra có ít nhất 2 cột bắt buộc: fullName và schoolId
        if (!fieldMap.includes('fullName')) {
          reject(new Error('Thiếu cột "Họ và tên" trong file Excel'));
          return;
        }
        if (!fieldMap.includes('schoolId')) {
          reject(new Error('Thiếu cột "Mã trường" trong file Excel'));
          return;
        }
        
        // Parse từng row data
        const staffList: Omit<Staff, 'id'>[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Bỏ qua row trống hoàn toàn
          if (!row || row.every((cell: any) => !cell)) continue;
          
          const staff: any = {
            fullName: '',
            schoolId: '',
            position: '',
            partyPosition: '',
            unitName: '',
            email: '',
            status: 'Đang công tác'
          };
          
          // Map giá trị từ row vào staff theo fieldMap
          fieldMap.forEach((field, colIdx) => {
            if (field && row[colIdx] !== undefined && row[colIdx] !== null) {
              staff[field] = String(row[colIdx]).trim();
            }
          });
          
          staffList.push(staff);
        }
        
        resolve(staffList);
      } catch (error: any) {
        reject(new Error(`Lỗi đọc file Excel: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsBinaryString(file);
  });
};

/**
 * Tạo file Excel mẫu cho người dùng tải về
 */
export const downloadExcelTemplate = (defaultSchoolId: string = 'THCS_CVA') => {
  const templateData = [
    // Header
    ['Mã trường', 'Họ và tên', 'Chức vụ HC', 'Chức vụ Đảng', 'Tổ chuyên môn', 'Email', 'Trạng thái'],
    // Sample data
    [defaultSchoolId, 'Nguyễn Văn A', 'Hiệu trưởng', 'Bí thư', 'Ban Giám Hiệu', 'nva@school.edu.vn', 'Đang công tác'],
    [defaultSchoolId, 'Trần Thị B', 'Phó Hiệu trưởng', 'Phó Bí thư', 'Ban Giám Hiệu', 'ttb@school.edu.vn', 'Đang công tác'],
    [defaultSchoolId, 'Lê Văn C', 'Tổ trưởng chuyên môn', '', 'Tổ Toán - Tin', 'lvc@school.edu.vn', 'Đang công tác'],
    [defaultSchoolId, 'Phạm Thị D', 'Giáo viên', '', 'Tổ Văn - Sử', 'ptd@school.edu.vn', 'Đang công tác']
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(templateData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 },  // Mã trường
    { wch: 25 },  // Họ và tên
    { wch: 22 },  // Chức vụ HC
    { wch: 18 },  // Chức vụ Đảng
    { wch: 25 },  // Tổ chuyên môn
    { wch: 28 },  // Email
    { wch: 18 }   // Trạng thái
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách nhân sự');
  
  // Tạo sheet hướng dẫn
  const helpData = [
    ['HƯỚNG DẪN SỬ DỤNG'],
    [''],
    ['1. Cột "Mã trường" và "Họ và tên" là BẮT BUỘC, các cột khác có thể để trống'],
    ['2. Mã trường phải là mã đã đăng ký bản quyền trên hệ thống (VD: THCS_CVA)'],
    ['3. Mỗi dòng tương ứng với 1 nhân sự'],
    ['4. Không xóa hoặc thay đổi tên các cột tiêu đề'],
    ['5. Có thể thêm cột mới nhưng hệ thống sẽ bỏ qua'],
    ['6. File Excel hỗ trợ định dạng .xlsx và .xls'],
    [''],
    ['DANH SÁCH CỘT HỖ TRỢ:'],
    ['- Mã trường / School ID / Mã định danh'],
    ['- Họ và tên / Họ tên / Full name'],
    ['- Chức vụ / Chức vụ HC / Position'],
    ['- Chức vụ Đảng / Party position'],
    ['- Tổ chuyên môn / Phòng ban / Unit'],
    ['- Email / Thư điện tử'],
    ['- Trạng thái / Status']
  ];
  
  const wsHelp = XLSX.utils.aoa_to_sheet(helpData);
  wsHelp['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Hướng dẫn');
  
  XLSX.writeFile(wb, `Mau_Import_Nhan_Su_${defaultSchoolId}.xlsx`);
};

/**
 * Export danh sách nhân sự ra Excel
 */
export const exportStaffToExcel = (staffList: Staff[], fileName: string = 'DanhSachNhanSu') => {
  const data: any[][] = [
    ['STT', 'Mã trường', 'Họ và tên', 'Chức vụ HC', 'Chức vụ Đảng', 'Tổ chuyên môn', 'Email', 'Trạng thái']
  ];
  
  staffList.forEach((staff, idx) => {
    data.push([
      idx + 1,
      staff.schoolId || '',
      staff.fullName || '',
      staff.position || '',
      staff.partyPosition || '',
      staff.unitName || '',
      staff.email || '',
      staff.status || 'Đang công tác'
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, 
    { wch: 18 }, { wch: 25 }, { wch: 28 }, { wch: 18 }
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách nhân sự');
  
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
};