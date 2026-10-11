@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (
  set "SLICER_NODE=node"
) else (
  set "SLICER_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "%SLICER_NODE%" if not "%SLICER_NODE%"=="node" (
  echo Instale o Node.js 22 ou superior pelo site https://nodejs.org
  pause
  exit /b 1
)
echo Abrindo o Slicer ERP em http://127.0.0.1:4310
echo Mantenha esta janela aberta enquanto usar o sistema.
echo Para parar, use Encerrar sistema no navegador ou ENCERRAR.bat.
start "" "http://127.0.0.1:4310"
"%SLICER_NODE%" src\server.js
pause
