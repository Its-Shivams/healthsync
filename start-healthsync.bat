@echo off
title HealthSync Dev Server Launcher
echo ====================================================
echo         Launching HealthSync Platform
echo ====================================================
echo.
cd /d "%~dp0"

echo Starting Backend API and Web Frontend...
echo - Web App:  http://localhost:3000
echo - API Docs: http://localhost:4000/api/docs
echo.
echo Press Ctrl+C anytime to stop the servers.
echo ====================================================
echo.

npm run dev
pause
