@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.env" (
  echo Falta backend\.env com a conexao PostgreSQL do Supabase.
  pause
  exit /b 1
)

if not exist "frontend\.env" (
  echo Falta frontend\.env com a chave publica do Supabase.
  pause
  exit /b 1
)

start "Radar Backend" cmd /k ""%~dp0backend\iniciar-backend.bat""
start "Radar Frontend" cmd /k ""%~dp0frontend\iniciar-app.bat""

echo Radar iniciando em http://127.0.0.1:5174
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5174"
