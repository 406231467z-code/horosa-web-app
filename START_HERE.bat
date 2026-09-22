@echo off
setlocal EnableExtensions
for %%I in ("%~dp0.") do set "REPO_ROOT=%%~fI"
set "HOROSA_REPO_ROOT=%REPO_ROOT%"
if not defined HOROSA_WORKSPACE_DIR set "HOROSA_WORKSPACE_DIR=%REPO_ROOT%\local\workspace"

title Horosa browser client
echo Horosa browser client
echo Starts local Java :9999 and Python :8899, then opens a browser.
echo Does not install Horosa.exe.
echo.
call "%REPO_ROOT%\local\Horosa_Local_Windows.bat" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Startup failed.
  echo Please check:
  echo   %REPO_ROOT%\README.md
  echo   %REPO_ROOT%\docs\SELFCHECK_LOG.md
  echo   %REPO_ROOT%\log\HOROSA_RUN_ISSUES.md
)
endlocal & exit /b %EXIT_CODE%
