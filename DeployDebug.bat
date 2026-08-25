@echo off
REM ============================================================
REM DEPLOYMENT COM DEBUG - Grava log num ficheiro
REM ============================================================

setlocal enabledelayedexpansion

REM Criar ficheiro de log
set LOGFILE=deployment-log.txt

echo. > "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
echo  DEPLOYMENT DEBUG - %date% %time% >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
echo. >> "%LOGFILE%"

REM Redirecionar output para ficheiro
(
echo.
echo ========================================
echo  DEPLOYMENT AUTOMATICO - PrecoCerto
echo ========================================
echo.
echo Gravando resultado em: deployment-log.txt
echo.

REM Verificar diretorio
echo [1] Verificando diretorio...
cd

REM Verificar Firebase CLI
echo.
echo [2] Verificando Firebase CLI...
firebase --version

REM Verificar autenticacao
echo.
echo [3] Verificando autenticacao Firebase...
firebase projects:list

REM Verificar build
echo.
echo [4] Verificando build...
dir precocerto\dist\

REM Deploy
echo.
echo [5] Iniciando deployment...
firebase deploy --only hosting

echo.
echo ========================================
echo  DEPLOYMENT COMPLETO
echo ========================================
echo.
echo Resultados gravados em: deployment-log.txt
echo.
echo Pressione uma tecla para fechar...
pause

) >> "%LOGFILE%" 2>&1

echo Ficheiro de log criado: %LOGFILE%
echo Pressione qualquer tecla para fechar...
pause
