@echo off
setlocal
cd /d "%~dp0" || goto :falha

docker compose version >nul 2>&1
if errorlevel 1 (
    echo Instale o Docker Desktop para abrir o painel.
    goto :falha
)

docker info >nul 2>&1
if errorlevel 1 (
    echo Iniciando o Docker Desktop...
    docker desktop start --timeout 90
    docker info >nul 2>&1 || goto :falha
)

set "GEMINI_KEY_FILE=%CD%\API_KEY.txt"
if exist "%GEMINI_KEY_FILE%" (
    echo Subindo o painel com Gemini...
    docker compose -f compose.yaml -f compose.gemini.yaml up --build -d || goto :falha
) else (
    echo Subindo o painel com o chat local...
    docker compose up --build -d || goto :falha
)

curl.exe --silent --show-error --fail --retry 10 --retry-all-errors --retry-delay 1 --max-time 2 --output NUL http://127.0.0.1:4173/ || goto :falha
start "" "http://127.0.0.1:4173/"
exit /b 0

:falha
echo.
echo O painel nao abriu. Confira a mensagem acima e o estado do Docker Desktop.
pause
exit /b 1
