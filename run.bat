@echo off
setlocal EnableDelayedExpansion

title VoyageFuel — Starting...

echo.
echo  ================================================
echo   VoyageFuel — Voyage Fuel Planning Application
echo  ================================================
echo.

:: ─── Check Node.js ───────────────────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Please download and install Node.js from:
    echo    https://nodejs.org/
    echo.
    echo  After installing, close this window and run run.bat again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  Node.js found: %NODE_VER%

:: ─── Check npm ───────────────────────────────────────────────────────────────
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] npm is not found. Please reinstall Node.js.
    pause
    exit /b 1
)

:: ─── Install dependencies if node_modules is missing ─────────────────────────
if not exist "node_modules\" (
    echo.
    echo  Installing dependencies — this may take a minute on first run...
    echo.
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [ERROR] npm install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo  Dependencies installed successfully.
)

:: ─── Open browser after a short delay ────────────────────────────────────────
echo.
echo  Starting VoyageFuel at http://localhost:5173
echo  Press Ctrl+C in this window to stop the server.
echo.

:: Open browser after 3 seconds (in background)
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: ─── Start dev server ────────────────────────────────────────────────────────
npm run dev

endlocal
