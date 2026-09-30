@echo off
cd /d "%~dp0"
if not exist node_modules\viem (
  call npm.cmd ci --omit=dev --ignore-scripts
  if errorlevel 1 exit /b 1
)
set PORT=5190
echo Open http://127.0.0.1:5190 in your browser after the server starts.
echo Keep this window open while playing. Press Ctrl+C to stop.
node server.js
pause
