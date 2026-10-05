@echo off
REM Avvia il Platinum Questbook e apre il browser.
REM Per fermarlo: chiudi questa finestra o premi Ctrl+C.
cd /d "%~dp0"
node server.js --apri
pause
