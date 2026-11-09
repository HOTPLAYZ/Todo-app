@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "Taskwell local server" /min cmd /c "cd /d ""%~dp0"" && py -m http.server 8080"
) else (
  start "Taskwell local server" /min cmd /c "cd /d ""%~dp0"" && python -m http.server 8080"
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080"
echo Taskwell is running at http://localhost:8080
echo Close the minimized Taskwell local server window to stop it.
pause
