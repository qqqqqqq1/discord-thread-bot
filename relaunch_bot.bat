@echo off
:start
cd "C:\Users\savei\my-discord-bot"
node index.js
echo.
echo Bot has stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto start
