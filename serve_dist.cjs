const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Cho phép Service Worker kiểm soát toàn bộ scope
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Access-Control-Allow-Origin', '*');

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: nếu không tìm thấy file, trả về index.html
      filePath = path.join(DIST_DIR, 'index.html');
      reqPath = '/index.html';
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // ĐIỀU CHỈNH CACHE ĐỂ ĐIỆN THOẠI TỰ ĐỘNG CẬP NHẬT MỖI KHI MỞ:
    // Các file index.html, sw.js, manifest.json, ảnh KHÔNG ĐƯỢC CACHE Ở HTTP để điện thoại luôn nhận bản mới
    if (reqPath === '/index.html' || reqPath === '/sw.js' || reqPath === '/manifest.json' || reqPath.endsWith('.png') || reqPath.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (reqPath.startsWith('/assets/')) {
      // Chỉ các file bundle có hash trong /assets/ mới cho cache lâu dài
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[OBD2 Production Server] Running with Auto-Update at:`);
  console.log(`  - Local:   http://localhost:${PORT}/`);
  console.log(`  - Network: http://192.168.0.50:${PORT}/`);
});
