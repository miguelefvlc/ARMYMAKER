// =========================================================================
// ARMY MAKER — Native Zero-Dependency HTTP Development Server
// =========================================================================
// Servidor ultrarrápido y robusto en Node.js puro (sin requerir vite ni node_modules).
// Escucha en el puerto principal 5173 y en el puerto 3000 (para redirecciones de Supabase/OAuth).

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { startAutoSync } from './scripts/auto_sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

const PRIMARY_PORT = parseInt(process.env.PORT || '5173', 10);
const FALLBACK_PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
};

function requestHandler(req, res) {
  // CORS & No-Cache para desarrollo reactivo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let decodedPath = decodeURIComponent(parsedUrl.pathname);

    // Seguridad: Prevenir Directory Traversal
    let safePath = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';

    let filePath = path.join(ROOT_DIR, safePath);

    // Si es un directorio, buscar index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // Fallback a index.html para rutas SPA
    if (!fs.existsSync(filePath)) {
      filePath = path.join(ROOT_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // No cachear en desarrollo para ver cambios de código inmediatamente
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    const stat = fs.statSync(filePath);
    headers['Content-Length'] = stat.size;

    res.writeHead(200, headers);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal Server Error: ' + err.message);
    });
    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Server Error: ' + err.message);
  }
}

function openBrowser(url) {
  if (process.argv.includes('--no-open') || process.env.NO_OPEN === '1') return;
  const startCmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(startCmd, () => {});
}

function startServer(port, isPrimary = false) {
  const server = http.createServer(requestHandler);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (isPrimary) {
        console.error(`\x1b[31m[ERROR] El puerto ${port} ya está en uso por otra aplicación.\x1b[0m`);
      }
    } else {
      console.error(`[ERROR puerto ${port}]:`, err.message);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    if (isPrimary) {
      console.log('\x1b[32m========================================================\x1b[0m');
      console.log('\x1b[1m\x1b[33m      ARMY MAKER — BOLT ACTION v3 ARMY BUILDER\x1b[0m');
      console.log('\x1b[32m========================================================\x1b[0m');
      console.log(` \x1b[32m✔ Servidor activo en:\x1b[0m   \x1b[1m\x1b[36mhttp://localhost:${port}\x1b[0m`);
      console.log(` \x1b[32m✔ Red local:\x1b[0m            \x1b[36mhttp://127.0.0.1:${port}\x1b[0m`);
      console.log(' \x1b[90m--------------------------------------------------------\x1b[0m');
      console.log(' Presiona \x1b[1mCtrl + C\x1b[0m para detener el servidor.');
      console.log('\x1b[32m========================================================\x1b[0m\n');
      openBrowser(`http://localhost:${port}`);
    } else {
      console.log(` \x1b[35m✔ Respaldo OAuth activo en:\x1b[0m http://localhost:${port} (compatibilidad Supabase)`);
    }
  });

  return server;
}

// Iniciar servidor principal en 5173
startServer(PRIMARY_PORT, true);

// Iniciar auto-sync con GitHub (sube cambios automáticamente tras 8s de espera)
try {
  startAutoSync();
} catch (err) {
  console.warn('[Auto-Sync] No se pudo inicializar auto-sync:', err.message);
}

// Iniciar servidor secundario en 3000 si es diferente (para redirecciones por defecto de Supabase)
if (PRIMARY_PORT !== FALLBACK_PORT) {
  startServer(FALLBACK_PORT, false);
}
