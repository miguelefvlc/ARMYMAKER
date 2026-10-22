@echo off
title ARMY MAKER — Auto-Sync GitHub
echo ========================================================
echo       ARMY MAKER - AUTO-SYNC GITHUB DAEMON
echo ========================================================
echo Monitorizando cambios en el proyecto...
echo Cada cambio se subira automaticamente a GitHub.
echo.
node scripts/auto_sync.js
pause
