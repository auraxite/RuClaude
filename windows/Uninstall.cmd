@echo off
setlocal
fltmc >nul 2>&1 || (echo Run as Administrator. & exit /b 1)
sc.exe stop RuClaudeService >nul 2>&1
for /L %%i in (1,1,30) do (
 sc.exe query RuClaudeService | findstr /R /C:"STATE.*STOPPED" >nul && goto :stopped
 timeout /t 1 /nobreak >nul
)
:stopped
"%ProgramFiles%\RuClaude\RuClaudeService.exe" --remove-firewall
if errorlevel 1 (echo ERROR: Firewall cleanup failed, service retained. & exit /b 1)
sc.exe delete RuClaudeService
if errorlevel 1 exit /b 1
rmdir /s /q "%ProgramFiles%\RuClaude"
echo Uninstalled; settings retained in ProgramData\RuClaude.
exit /b 0
