// File: src/components/NotificationBanner.tsx
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig'; // Đường dẫn import đã chuẩn

export const NotificationBanner: React.FC = () => {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Kết nối tới đúng vị trí lưu cấu hình hệ thống trên Firebase
    const configRef = doc(db, 'system_settings', 'general'); 

    // Lắng nghe sự thay đổi 24/7
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // 🎯 LƯU Ý QUAN TRỌNG: 
        // Hãy đảm bảo ở trang Admin, khi bạn bấm "Lưu", bạn đang lưu trường này 
        // với tên chính xác là 'notificationMessage' vào Firebase nhé.
        setMessage(data.notificationMessage || ''); 
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔥 ĐÃ SỬA: Bỏ điều kiện isActive. Cứ có chữ là hiện loa!
  if (!message.trim()) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 shadow-md relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <span className="flex p-2 rounded-lg bg-blue-800 bg-opacity-30 mr-3">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </span>
        <p className="font-medium sm:text-lg text-sm truncate">
          <span className="animate-pulse">{message}</span>
        </p>
      </div>
    </div>
  );
};