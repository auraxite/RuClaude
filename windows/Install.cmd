@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

rem If started from the source folder, build the self-contained executables first.
if not exist "RuClaudeService.exe" (
  if exist "Build.cmd" (
    echo No ready-to-run RuClaude files found. Building from sources...
    call "%~dp0Build.cmd"
    if errorlevel 1 (
      echo ERROR: RuClaude build failed.
      pause
      exit /b 1
    )
    call "%~dp0dist\Install.cmd"
    exit /b !errorlevel!
  )
  echo ERROR: RuClaudeService.exe is missing.
  pause
  exit /b 1
)
if not exist "RuClaude.exe" (
  echo ERROR: RuClaude.exe is missing.
  pause
  exit /b 1
)

fltmc >nul 2>&1
if errorlevel 1 (
  echo ERROR: Run Install.cmd as administrator.
  pause
  exit /b 1
)

sc.exe query RuClaudeService >nul 2>&1
if not errorlevel 1 goto service_exists

echo Creating RuClaude Windows service...
sc.exe create RuClaudeService binPath= "\"%~dp0RuClaudeService.exe\"" start= auto DisplayName= "RuClaude"
if errorlevel 1 goto service_error
goto configure_recovery

:service_exists
echo RuClaude service exists. Stopping it for update...
sc.exe stop RuClaudeService >nul 2>&1
set /a stop_attempts=0
:wait_stopped
sc.exe query RuClaudeService | findstr /R /C:"STATE.*STOPPED" >nul
if not errorlevel 1 goto configure_service
set /a stop_attempts+=1
if !stop_attempts! GEQ 30 (
  echo ERROR: Existing service did not stop within 30 seconds.
  sc.exe query RuClaudeService
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_stopped

:configure_service
sc.exe config RuClaudeService binPath= "\"%~dp0RuClaudeService.exe\"" start= auto DisplayName= "RuClaude"
if errorlevel 1 goto service_error

:configure_recovery
sc.exe failure RuClaudeService reset= 86400 actions= restart/5000/restart/5000/restart/5000 >nul

echo Starting RuClaude service...
sc.exe start RuClaudeService >nul 2>&1
rem StartService may return 1056 when already RUNNING; verify actual state instead.
set /a start_attempts=0
:wait_running
sc.exe query RuClaudeService | findstr /R /C:"STATE.*RUNNING" >nul
if not errorlevel 1 goto service_running
set /a start_attempts+=1
if !start_attempts! GEQ 15 (
  echo ERROR: Service is not running after 15 seconds.
  sc.exe query RuClaudeService
  echo Check Windows Event Viewer for application/service errors.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_running

:service_running
rem The service runs as SYSTEM; the interactive app runs without elevation.
rem Only grant the installing user Modify rights to RuClaude settings/status directory.
if not exist "%ProgramData%\RuClaude" mkdir "%ProgramData%\RuClaude"
icacls "%ProgramData%\RuClaude" /grant "%USERDOMAIN%\%USERNAME%:(OI)(CI)M" >nul
if errorlevel 1 (
  echo WARNING: Could not grant settings permissions. The GUI may not save changes.
)
echo RuClaude service is RUNNING.
start "" "%~dp0RuClaude.exe"
echo RuClaude installed and launched. Keep this folder in its permanent location.
pause
exit /b 0

:service_error
echo ERROR: Unable to create or update RuClaude service.
sc.exe query RuClaudeService
pause
exit /b 1
