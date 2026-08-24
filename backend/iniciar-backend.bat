@echo off
setlocal
cd /d "%~dp0"

set "RADAR_NODE=C:\Users\carlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "RADAR_PNPM=C:\Users\carlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
set "PATH=C:\Users\carlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"

if not exist "%RADAR_NODE%" (
  echo Node.js do Codex nao foi encontrado.
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias do backend...
  call "%RADAR_PNPM%" install
  if errorlevel 1 exit /b 1
)

echo Radar Backend: http://127.0.0.1:3333
"%RADAR_NODE%" --env-file-if-exists=.env --import tsx src/server.ts
