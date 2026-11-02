@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0"
if not exist "%ROOT%RuClaude.exe" (
 if exist "%ROOT%..\dist\RuClaude.exe" (echo Install from dist folder: dist\Install.cmd & exit /b 1)
 echo ERROR: Build first using windows\Build.cmd
 exit /b 1
)
fltmc >nul 2>&1 || (echo ERROR: Run as Administrator. & exit /b 1)
set "DEST=%ProgramFiles%\RuClaude"
echo Stopping installed service if present...
sc.exe query RuClaudeService >nul 2>&1
if not errorlevel 1 (
 sc.exe stop RuClaudeService >nul 2>&1
 for /L %%i in (1,1,30) do (
  sc.exe query RuClaudeService | findstr /R /C:"STATE.*STOPPED" >nul && goto :stopped
  timeout /t 1 /nobreak >nul
 )
 echo ERROR: Service failed to stop.
 exit /b 1
)
:stopped
if not exist "%DEST%" mkdir "%DEST%"
if /I not "%ROOT:~0,-1%"=="%DEST%" (
 robocopy "%ROOT%" "%DEST%" /E /NFL /NDL /NJH /NJS /NP /XD build dist
 if !errorlevel! GEQ 8 (echo ERROR: File copy failed. & exit /b 1)
)
if not exist "%ProgramData%\RuClaude" mkdir "%ProgramData%\RuClaude"
icacls "%ProgramData%\RuClaude" /grant "%USERDOMAIN%\%USERNAME%:(OI)(CI)M" >nul
sc.exe query RuClaudeService >nul 2>&1
if errorlevel 1 (
 sc.exe create RuClaudeService binPath= "\"%DEST%\RuClaudeService.exe\"" start= auto DisplayName= "RuClaude" || exit /b 1
) else (
 sc.exe config RuClaudeService binPath= "\"%DEST%\RuClaudeService.exe\"" start= auto DisplayName= "RuClaude" || exit /b 1
)
sc.exe failure RuClaudeService reset= 86400 actions= restart/5000/restart/5000/restart/5000 >nul
sc.exe start RuClaudeService
if errorlevel 1 (echo ERROR: Service did not start. & exit /b 1)
start "" "%DEST%\RuClaude.exe"
echo Installed to %DEST%
exit /b 0
