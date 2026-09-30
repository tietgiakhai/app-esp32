import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Cơ chế Tự động Cập nhật Phiên bản Mới (Auto-Update)
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('[SW] New version detected! Reloading page...');
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[SW] ServiceWorker registered with scope:', registration.scope);
        // Kiểm tra phiên bản mới ngay khi mở app
        registration.update();

        // Kiểm tra cập nhật định kỳ mỗi khi người dùng quay lại tab/app
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        });
      },
      (err) => {
        console.warn('[SW] ServiceWorker registration failed:', err);
      }
    );
  });
}

// Hàm hỗ trợ người dùng xóa cache thủ công nhanh nếu cần
(window as any).forceUpdateApp = async () => {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
  }
  window.location.reload();
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
