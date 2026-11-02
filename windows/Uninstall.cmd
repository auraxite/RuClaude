@echo off
setlocal
cd /d "%~dp0"
if not exist "RuClaudeService.exe" (
  if exist "dist\Uninstall.cmd" (
    call "%~dp0dist\Uninstall.cmd"
    exit /b
  )
  echo ERROR: RuClaudeService.exe is missing. Cannot clean up firewall rules.
  pause
  exit /b 1
)
fltmc >nul 2>&1
if errorlevel 1 (echo Please run Uninstall.cmd as administrator. & pause & exit /b 1)
sc.exe stop RuClaudeService >nul 2>&1
timeout /t 3 /nobreak >nul
"%~dp0RuClaudeService.exe" --remove-firewall
if errorlevel 1 (echo WARNING: Firewall cleanup failed. No service was removed. & pause & exit /b 1)
sc.exe delete RuClaudeService
if errorlevel 1 (echo WARNING: Service removal failed. & pause & exit /b 1)
echo RuClaude uninstalled. Settings remain in ProgramData\RuClaude.
pause
exit /b 0
