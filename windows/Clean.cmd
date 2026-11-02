@echo off
cd /d "%~dp0.."
if exist "desktop\build" rmdir /s /q "desktop\build"
if exist "dist" rmdir /s /q "dist"
echo Build files removed; source files retained.
