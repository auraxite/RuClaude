@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo RuClaude - remove generated build files only.
echo Source files, icons, configuration, and installed service are NOT deleted.
echo.
if exist "dist\RuClaude.exe" (
  tasklist /FI "IMAGENAME eq RuClaude.exe" 2>nul | find /I "RuClaude.exe" >nul
  if not errorlevel 1 (
    echo ERROR: Close the RuClaude window before cleaning.
    exit /b 1
  )
)
rem Do not delete dist while an installed service points into it.
sc.exe qc RuClaudeService 2>nul | find /I "%cd%\dist\" >nul
if not errorlevel 1 (
  echo ERROR: The installed Windows service is running from this dist folder.
  echo First uninstall/reinstall the service from a permanent location.
  exit /b 1
)
for %%D in ("RuClaude.App\bin" "RuClaude.App\obj" "RuClaude.Service\bin" "RuClaude.Service\obj" "dist" ".vs") do (
  if exist "%%~D" (
    echo Removing %%~D
    rmdir /s /q "%%~D"
    if exist "%%~D" (echo ERROR: Failed to remove %%~D & exit /b 1)
  )
)
echo.
echo Build artifacts removed. Source files are preserved.
exit /b 0
