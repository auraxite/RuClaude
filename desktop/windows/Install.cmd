@echo off
setlocal EnableExtensions
set "INSTALLER=%~dp0..\..\dist\Install.cmd"
if not exist "%INSTALLER%" (
 echo ERROR: dist\Install.cmd not found. Run desktop\windows\Build.cmd first.
 exit /b 1
)
if not exist "%~dp0..\..\dist\RuClaude.exe" (
 echo ERROR: dist\RuClaude.exe not found. Run desktop\windows\Build.cmd first.
 exit /b 1
)
call "%INSTALLER%"
exit /b %errorlevel%
