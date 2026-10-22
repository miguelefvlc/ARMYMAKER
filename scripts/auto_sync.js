// =========================================================================
// ARMY MAKER — Auto-Sync Daemon (Automatic Git Commit & Push to GitHub)
// =========================================================================
// Monitoriza automáticamente los cambios en el proyecto y los sube a GitHub
// sin requerir comandos manuales, con tiempo de espera inteligente (debounce).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DEBOUNCE_MS = 8000; // 8 segundos de espera tras el último cambio para agrupar ediciones

const IGNORED_REGEX = /(^|[\\/])(\.git|node_modules|\.gemini|\.system_generated|brain|out)([\\/]|$)|(desktop\.ini|\.DS_Store|Thumbs\.db|\.tmp|\.log)$/i;

let debounceTimer = null;
let isSyncing = false;
let pendingSync = false;
let changedFilesSet = new Set();

function formatTime() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

function execPromise(cmd, cwd = ROOT_DIR) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) {
        reject({ err, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function runGitSync() {
  if (isSyncing) {
    pendingSync = true;
    return;
  }

  isSyncing = true;
  pendingSync = false;

  try {
    // 1. Comprobar si hay cambios pendientes en Git
    const { stdout: statusOut } = await execPromise('git status --porcelain');
    const statusLines = statusOut.trim().split('\n').filter(Boolean);

    if (statusLines.length === 0) {
      // No hay cambios reales en git
      changedFilesSet.clear();
      isSyncing = false;
      return;
    }

    const changedCount = statusLines.length;
    const summaryFiles = Array.from(changedFilesSet).slice(0, 4).join(', ');
    const moreSuffix = changedFilesSet.size > 4 ? ` (+${changedFilesSet.size - 4} más)` : '';
    const desc = summaryFiles ? `modificado: ${summaryFiles}${moreSuffix}` : `${changedCount} archivos actualizados`;

    console.log(`\n\x1b[36m[${formatTime()}] [Auto-Sync]\x1b[0m Cambios detectados (${changedCount} archivo(s)). Sincronizando con GitHub...`);

    // 2. Stage all changes
    await execPromise('git add -A');

    // 3. Commit
    const commitMsg = `auto-sync: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} - ${desc.replace(/["`$]/g, '')}`;
    await execPromise(`git commit -m "${commitMsg}"`);

    // 4. Push to remote
    const { stdout: pushOut } = await execPromise('git push origin HEAD');

    console.log(`\x1b[32m[${formatTime()}] [Auto-Sync] ✔ Sincronizado y subido con éxito a GitHub.\x1b[0m`);
    changedFilesSet.clear();
  } catch (error) {
    const errMsg = (error?.stderr || error?.err?.message || String(error)).trim();
    // Si no había nada que commitear, ignorar
    if (!errMsg.includes('nothing to commit')) {
      console.warn(`\x1b[33m[${formatTime()}] [Auto-Sync] Aviso en sincronización:\x1b[0m`, errMsg);
    }
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      setTimeout(runGitSync, 2000);
    }
  }
}

export function startAutoSync(options = {}) {
  const debounceMs = options.debounceMs || DEBOUNCE_MS;

  console.log(`\x1b[32m✔ Auto-sync con GitHub activo\x1b[0m (vigilando cambios con espera de ${debounceMs / 1000}s)`);

  const watcher = fs.watch(ROOT_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Filtrar archivos y carpetas irrelevantes
    if (IGNORED_REGEX.test(filename)) return;

    changedFilesSet.add(path.basename(filename));

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runGitSync();
    }, debounceMs);
  });

  return watcher;
}

// Si se ejecuta directamente como script: `node scripts/auto_sync.js`
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  console.log('\x1b[32m========================================================\x1b[0m');
  console.log('\x1b[1m\x1b[33m   ARMY MAKER — AUTO-SYNC GITHUB DAEMON\x1b[0m');
  console.log('\x1b[32m========================================================\x1b[0m');
  console.log(` Vigilando cambios en: \x1b[36m${ROOT_DIR}\x1b[0m`);
  console.log(' Los cambios guardados se subirán automáticamente a GitHub.');
  console.log(' Presiona \x1b[1mCtrl + C\x1b[0m para detener.');
  console.log('\x1b[32m========================================================\x1b[0m\n');

  startAutoSync();

  // Mantener el proceso vivo
  process.stdin.resume();
}
