@echo off
setlocal
cd /d "%~dp0"

if exist "C:\Users\carlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "PATH=C:\Users\carlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\carlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
)

if not exist ".env" (
  echo Falta frontend\.env. Copie .env.example e preencha a chave publica do Supabase.
  pause
  exit /b 1
)

call pnpm install --frozen-lockfile
if errorlevel 1 exit /b 1
call pnpm dev
