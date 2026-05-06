import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Lấy phần tử gốc từ index.html
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Không tìm thấy phần tử 'root' để khởi chạy ứng dụng.");
}

// Khởi tạo React Root
const root = ReactDOM.createRoot(rootElement as HTMLElement);

// Render ứng dụng
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Đăng ký Service Worker để Chrome có thể cài DocFormat Pro như ứng dụng Desktop/PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('DocFormat Pro Service Worker registered:', registration.scope);
      })
      .catch(error => {
        console.error('DocFormat Pro Service Worker registration failed:', error);
      });
  });
}