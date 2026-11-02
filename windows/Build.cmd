@echo off
setlocal
cd /d "%~dp0"
echo Building RuClaude for Windows x64...
rem Remove old single-file output and stale dependencies before republishing.
if exist "RuClaude.App\\obj" rmdir /s /q "RuClaude.App\\obj"
if exist "RuClaude.App\\bin" rmdir /s /q "RuClaude.App\\bin"
if exist "dist" rmdir /s /q "dist"
if exist "dist" (echo ERROR: Close RuClaude.exe and stop the service before rebuilding. & exit /b 1)
where dotnet >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: .NET SDK is not installed or not in PATH.
  echo Install .NET 10 SDK on Windows using:
  echo   winget install --id Microsoft.DotNet.SDK.10 --exact
  echo Then reopen Command Prompt and run Install.cmd again.
  echo https://dotnet.microsoft.com/download/dotnet/10.0
  exit /b 1
)
if not exist "assets\logo.png" (echo ERROR: RuClaude logo missing. & exit /b 1)
if not exist "assets\ruclaude.ico" (echo ERROR: RuClaude icon missing. & exit /b 1)
dotnet publish "RuClaude.Service\RuClaude.Service.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "dist"
if errorlevel 1 (echo ERROR: RuClaude service build failed. & exit /b 1)
dotnet publish "RuClaude.App\RuClaude.App.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:PublishTrimmed=false -p:PublishAot=false -o "dist"
if errorlevel 1 (echo ERROR: RuClaude interface build failed. & exit /b 1)
if not exist "dist\RuClaude.exe" (echo ERROR: RuClaude.exe missing after build. & exit /b 1)
if not exist "dist\RuClaudeService.exe" (echo ERROR: RuClaudeService.exe missing after build. & exit /b 1)
copy /y "Install.cmd" "dist\Install.cmd" >nul
copy /y "Uninstall.cmd" "dist\Uninstall.cmd" >nul
echo.
echo Build complete: %cd%\dist
exit /b 0
