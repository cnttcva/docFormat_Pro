// File: src/pages/admin/DictionaryManager.tsx
import React, { useState, useEffect } from 'react';
// 🔥 BỔ SUNG: writeBatch để ghi hàng trăm từ lên Firebase cùng lúc chỉ với 1 lệnh
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { BookOpen, Plus, Trash2, Save, Search, Loader2, AlertCircle, UploadCloud, X } from 'lucide-react';

interface DictEntry {
  id: string;
  wrong: string;
  right: string;
  createdAt: any;
}

export default function DictionaryManager() {
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEntry, setNewEntry] = useState({ wrong: '', right: '' });
  
  // 🔥 STATE MỚI CHO CHỨC NĂNG NHẬP HÀNG LOẠT
  const [showBulk, setShowBulk] = useState(false);
  const [bulkData, setBulkData] = useState("");

  const fetchDictionary = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'dictionaries'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DictEntry));
      setEntries(data);
    } catch (e) {
      console.error("Lỗi tải từ điển:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDictionary(); }, []);

  // Thêm 1 từ (Thủ công)
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.wrong.trim() || !newEntry.right.trim()) return;
    setIsAdding(true);
    try {
      const docRef = await addDoc(collection(db, 'dictionaries'), {
        wrong: newEntry.wrong.trim(),
        right: newEntry.right.trim(),
        createdAt: new Date().toISOString()
      });
      setEntries([{ id: docRef.id, ...newEntry, createdAt: '' }, ...entries]);
      setNewEntry({ wrong: '', right: '' });
    } catch (e) {
      alert("Lỗi khi thêm từ!");
    } finally {
      setIsAdding(false);
    }
  };

  // 🔥 CHIẾN THUẬT MỚI: NẠP BĂNG ĐẠN HÀNG LOẠT (BULK IMPORT)
  const handleBulkImport = async () => {
    if (!bulkData.trim()) return;
    setIsAdding(true);
    try {
      const lines = bulkData.split('\n'); // Tách từng dòng
      const batch = writeBatch(db);       // Khởi tạo tiến trình ghi gộp
      let count = 0;

      for (const line of lines) {
        // Khi copy từ Excel, các cột được ngăn cách bằng phím Tab (\t)
        const parts = line.split('\t'); 
        if (parts.length >= 2) {
          const wrong = parts[0].trim();
          const right = parts[1].trim();
          if (wrong && right) {
            const docRef = doc(collection(db, 'dictionaries')); // Tạo ID tự động
            batch.set(docRef, {
              wrong, 
              right, 
              createdAt: new Date().toISOString()
            });
            count++;
          }
        }
      }

      if (count > 0) {
        await batch.commit(); // Bắn toàn bộ lên Firebase cùng 1 lúc
        alert(`🎯 Báo cáo: Đã nạp thành công ${count} cặp từ vựng vào hệ thống!`);
        setBulkData("");
        setShowBulk(false);
        fetchDictionary(); // Tải lại danh sách để hiển thị
      } else {
        alert("⚠️ Không tìm thấy dữ liệu hợp lệ. Xin ngài hãy bôi đen 2 cột trong Excel và dán vào đây.");
      }
    } catch (error: any) {
      alert("Lỗi nạp hàng loạt: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa quy tắc này?")) return;
    try {
      await deleteDoc(doc(db, 'dictionaries', id));
      setEntries(entries.filter(e => e.id !== id));
    } catch (e) {
      alert("Lỗi khi xóa!");
    }
  };

  const filteredEntries = entries.filter(e => 
    e.wrong.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.right.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-white flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" /> Từ Điển AI Trên Mây
          </h3>
          <p className="text-slate-500 font-medium mt-1">Quản lý các quy tắc tự động sửa lỗi chính tả và định danh</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" placeholder="Tìm kiếm từ..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Form nhập liệu */}
        <div className="lg:col-span-1 space-y-6">
          {/* Nút chuyển đổi chế độ nhập */}
          <div className="flex bg-slate-200/50 p-1 rounded-2xl">
            <button 
              onClick={() => setShowBulk(false)} 
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!showBulk ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Nhập thủ công
            </button>
            <button 
              onClick={() => setShowBulk(true)} 
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${showBulk ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UploadCloud className="w-4 h-4" /> Nạp từ Excel
            </button>
          </div>

          {/* Form thêm từ mới (Thủ công) */}
          {!showBulk ? (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-white">
              <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" /> Thêm quy tắc mới
              </h4>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Từ sai / Cần thay thế</label>
                  <textarea 
                    value={newEntry.wrong} onChange={(e) => setNewEntry({...newEntry, wrong: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="VD: xắp sếp" rows={2}
                  />
                </div>
                <div className="flex justify-center"><AlertCircle className="w-5 h-5 text-slate-300" /></div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Từ đúng / Kết quả</label>
                  <textarea 
                    value={newEntry.right} onChange={(e) => setNewEntry({...newEntry, right: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="VD: sắp xếp" rows={2}
                  />
                </div>
                <button 
                  type="submit" disabled={isAdding}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  NẠP VÀO TỪ ĐIỂN
                </button>
              </form>
            </div>
          ) : (
            /* Form Nạp hàng loạt (Bulk Import) */
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-[2.5rem] shadow-sm border border-indigo-100">
              <h4 className="font-black text-indigo-900 mb-2 flex items-center gap-2">
                <UploadCloud className="w-5 h-5" /> Nạp băng đạn hàng loạt
              </h4>
              <p className="text-[11px] font-medium text-indigo-600/80 mb-4 leading-relaxed">
                Mở file Excel có 2 cột (Cột 1: Từ sai, Cột 2: Từ đúng). Bôi đen dữ liệu, Copy (Ctrl+C) và Paste (Ctrl+V) trực tiếp vào ô bên dưới.
              </p>
              <textarea 
                value={bulkData} onChange={(e) => setBulkData(e.target.value)}
                className="w-full p-4 bg-white border border-indigo-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none whitespace-pre custom-scrollbar"
                placeholder="từ sai 1 [Tab] từ đúng 1&#10;từ sai 2 [Tab] từ đúng 2&#10;..." rows={8}
              />
              <button 
                onClick={handleBulkImport} disabled={isAdding || !bulkData.trim()}
                className="w-full mt-4 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                THỰC THI NẠP DỮ LIỆU
              </button>
            </div>
          )}
        </div>

        {/* Cột phải: Danh sách từ điển */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-white">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" />
              <p className="mt-4 text-slate-500 font-bold">Đang tải Cuốn Sổ Đen...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="bg-white p-5 rounded-2xl border border-white shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Sai</span>
                      <p className="font-bold text-slate-700 mt-0.5">{entry.wrong}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">➜</div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Đúng</span>
                      <p className="font-bold text-indigo-600 mt-0.5">{entry.right}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(entry.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">
                  Chưa có quy tắc nào phù hợp.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}