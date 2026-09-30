// Service Worker Tự động Cập nhật (Auto-Update) cho ESP32 OBD-II Scan Tool
const CACHE_NAME = 'esp32-obd2-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-bachkhoa.png',
  '/car-xpander.png',
  '/favicon.svg'
];

// 1. Cài đặt và ép kích hoạt ngay (skipWaiting)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching latest assets for offline use...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Kích hoạt và dọn sạch toàn bộ cache cũ ngay lập tức
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Xử lý request:
// - index.html & trang chủ: Dùng NETWORK-FIRST (Ưu tiên mạng để luôn lấy bản mới nhất, nếu mất mạng thì mới lấy cache)
// - Các file tĩnh (js/css/hình ảnh): Dùng STALE-WHILE-REVALIDATE hoặc CACHE-FIRST
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Đối với trang HTML chính: Network First để luôn tự động cập nhật
  if (url.pathname === '/' || url.pathname === '/index.html' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Khi không có mạng: lấy từ bộ nhớ đệm
          return caches.match('/index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // Đối với hình ảnh xe và logo: Network First có fallback cache
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Các file JS, CSS có hash: Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});
