// Đây là Service Worker cơ bản để ứng dụng đạt chuẩn PWA
self.addEventListener('install', (e) => {
  console.log('[DocFormat Pro] Đã cài đặt Service Worker');
});

self.addEventListener('fetch', (e) => {
  // Bắt buộc phải có sự kiện fetch để trình duyệt nhận diện đây là PWA hợp lệ
});
