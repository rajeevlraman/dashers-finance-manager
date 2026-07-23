// serve.js — zero-dependency static file server for Dashers Finance Manager.
// Run this in the LXC container; put a reverse proxy (Caddy/nginx) in front
// of it for HTTPS. This process only ever needs to listen on localhost/LAN
// over plain HTTP - the reverse proxy handles TLS.
//
// Usage:
//   node serve.js            # serves on 0.0.0.0:8080
//   PORT=3000 node serve.js  # custom port

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Files that must never be cached aggressively - the service worker file
// itself, and index.html (its entry point). Everything else gets a modest
// cache lifetime. If you add versioned/hashed filenames later, switch those
// to a long max-age with immutable.
const NO_CACHE_FILES = new Set(['/index.html', '/serviceWorker.js', '/manifest.json', '/']);

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return path.join(root, normalized);
}

const server = http.createServer((req, res) => {
  let filePath = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA-style fallback isn't needed here (this app uses hash routing
      // client-side), but if a path has no extension, try index.html so
      // deep links don't 404.
      if (!path.extname(filePath)) {
        filePath = path.join(ROOT, 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheControl = NO_CACHE_FILES.has(req.url) || filePath.endsWith('index.html')
      ? 'no-cache'
      : 'public, max-age=3600';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n📦 Dashers Finance Manager static server running at http://${HOST}:${PORT}`);
  console.log(`   Put a reverse proxy (Caddy/nginx) in front of this for HTTPS.`);
  console.log(`   This process should stay on plain HTTP/localhost - don't expose it directly.\n`);
});
