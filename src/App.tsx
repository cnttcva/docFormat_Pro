// File: src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainApp from './MainApp';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import { NotificationBanner } from './components/NotificationBanner';

/**
 * LÁ CHẮN THÉP (Protected Route)
 * Đảm bảo chỉ những ai có thẻ bài 'isAdminAuth' mới được vào khu vực nhạy cảm.
 */
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const isAuth = sessionStorage.getItem('isAdminAuth') === 'true';
  const location = useLocation();

  if (!isAuth) {
    // Nếu chưa có thẻ bài, lập tức trục xuất về trang Đăng nhập
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      {/* Loa thông báo toàn hệ thống */}
      <NotificationBanner />

      <Routes>
        {/* 1. Tuyến đường mặt tiền: Giao diện chuẩn hóa văn bản cho giáo viên */}
        <Route path="/" element={<MainApp />} />
        
        {/* 2. Cổng gác Admin: Nơi nhập mật mã để vào trung tâm điều hành */}
        <Route path="/admin-login" element={<AdminLogin />} />
        
        {/* 3. Pháo đài Admin: Bảo vệ nghiêm ngặt Dashboard và các công cụ AI */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } 
        />

        {/* 4. Lệnh thu quân: Bất kỳ đường dẫn lạ nào cũng bị dẫn giải về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}