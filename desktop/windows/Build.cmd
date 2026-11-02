@echo off
setlocal EnableExtensions EnableDelayedExpansion
rem This script lives in RuClaude\desktop\windows\Build.cmd.
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
cd /d "%ROOT%" || exit /b 1

where cmake >nul 2>&1 || (echo ERROR: Install CMake. & exit /b 1)
where windeployqt >nul 2>&1 || (echo ERROR: Qt 6 bin folder must be in PATH ^(windeployqt.exe missing^). & exit /b 1)

cmake -S desktop -B desktop\build -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 exit /b 1
cmake --build desktop\build --config Release --parallel
if errorlevel 1 exit /b 1

if not exist "dist" mkdir "dist"
for %%F in (RuClaude.exe RuClaudeService.exe) do (
  if exist "desktop\build\Release\%%F" (
    copy /Y "desktop\build\Release\%%F" "dist\%%F" >nul
  ) else (
    if not exist "desktop\build\%%F" (echo ERROR: %%F not found. & exit /b 1)
    copy /Y "desktop\build\%%F" "dist\%%F" >nul
  )
  if errorlevel 1 (echo ERROR: Could not copy %%F to dist. & exit /b 1)
)

windeployqt --release --no-translations --no-compiler-runtime "dist\RuClaude.exe"
if errorlevel 1 exit /b 1
windeployqt --release --no-translations --no-compiler-runtime "dist\RuClaudeService.exe"
if errorlevel 1 exit /b 1

rem windeployqt --no-compiler-runtime omits MinGW runtime dependencies.
rem Prefer the MinGW matching the installed Qt version, not MSYS2\ucrt64.
set "MINGW_BIN="
for %%I in ("%LOCALAPPDATA%\Programs\Qt\Tools\mingw1310_64\bin" "%ROOT%\Tools\mingw1310_64\bin") do (
  if not defined MINGW_BIN if exist "%%~I\libgcc_s_seh-1.dll" set "MINGW_BIN=%%~I"
)
rem For non-default Qt installations, try the Qt kit parent Tools directory.
if not defined MINGW_BIN (
  for /f "delims=" %%I in ('where windeployqt 2^>nul') do (
    for %%J in ("%%~dpI..\..\..\Tools\mingw1310_64\bin") do (
      if not defined MINGW_BIN if exist "%%~fJ\libgcc_s_seh-1.dll" set "MINGW_BIN=%%~fJ"
    )
  )
)
if not defined MINGW_BIN (
  echo ERROR: Qt MinGW 13.1 runtime not found. Install Qt Tools\mingw1310_64 or update MINGW_BIN in Build.cmd.
  exit /b 1
)
echo Packaging MinGW runtime from: !MINGW_BIN!
for %%F in (libgcc_s_seh-1.dll libstdc++-6.dll libwinpthread-1.dll) do (
  if not exist "!MINGW_BIN!\%%F" (echo ERROR: Missing !MINGW_BIN!\%%F & exit /b 1)
  copy /Y "!MINGW_BIN!\%%F" "dist\%%F" >nul
  if errorlevel 1 (echo ERROR: Failed to package %%F & exit /b 1)
)

copy /Y "desktop\windows\Install.cmd" "dist\Install.cmd" >nul
if errorlevel 1 exit /b 1
copy /Y "desktop\windows\Uninstall.cmd" "dist\Uninstall.cmd" >nul
if errorlevel 1 exit /b 1

echo Build complete: dist\
exit /b 0
