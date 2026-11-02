@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
where cmake >nul 2>&1 || (echo ERROR: Install CMake. & exit /b 1)
where windeployqt >nul 2>&1 || (echo ERROR: Qt 6 bin folder must be in PATH ^(windeployqt.exe missing^). & exit /b 1)
rem Always build to a fresh temp staging location. Never overwrite a running service binary.
cmake -S desktop -B desktop\build -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 exit /b 1
cmake --build desktop\build --config Release --parallel
if errorlevel 1 exit /b 1
if not exist "dist" mkdir "dist"
for %%F in (RuClaude.exe RuClaudeService.exe) do (
 if exist "desktop\build\Release\%%F" (copy /Y "desktop\build\Release\%%F" "dist\%%F" >nul) else (copy /Y "desktop\build\%%F" "dist\%%F" >nul)
 if errorlevel 1 (echo ERROR: dist\%%F is locked; stop the installed service or choose a clean folder. & exit /b 1)
)
windeployqt --release --no-translations --no-compiler-runtime dist\RuClaude.exe
if errorlevel 1 exit /b 1
windeployqt --release --no-translations --no-compiler-runtime dist\RuClaudeService.exe
if errorlevel 1 exit /b 1
copy /Y "windows\Install.cmd" "dist\Install.cmd" >nul
copy /Y "windows\Uninstall.cmd" "dist\Uninstall.cmd" >nul
echo Build complete: dist\
exit /b 0
