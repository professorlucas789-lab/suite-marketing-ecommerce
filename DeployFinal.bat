@echo off
REM ============================================================
REM DEPLOYMENT BUTTON - PreçoCerto v1.0.0
REM Caminho: C:\Users\ENG ' CHIVAS\Documents\ChatGPT\suite-marketing-ecommerce
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  DEPLOYMENT AUTOMATICO - PrecoCerto
echo ========================================
echo.

REM Verificar se está no diretório correto
if not exist "firebase.json" (
    echo.
    echo ERRO: firebase.json nao encontrado!
    echo.
    echo Este ficheiro precisa estar na pasta:
    echo C:\Users\ENG ' CHIVAS\Documents\ChatGPT\suite-marketing-ecommerce
    echo.
    pause
    exit /b 1
)

echo Verificando Firebase CLI...
firebase --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERRO: Firebase CLI nao instalado!
    echo.
    echo Execute: InstalarNPM-Final.bat
    echo.
    pause
    exit /b 1
)

echo Firebase CLI OK
echo.

REM Verificar autenticacao
echo Verificando autenticacao Firebase...
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERRO: Nao autenticado no Firebase!
    echo.
    echo Execute no terminal: firebase login
    echo.
    pause
    exit /b 1
)

echo Autenticacao OK
echo.

REM Verificar build
if not exist "precocerto\dist\index.html" (
    echo.
    echo ERRO: Build nao encontrado!
    echo.
    echo Execute: npm run build
    echo.
    pause
    exit /b 1
)

echo Build encontrado
echo.

REM ============================================================
REM DEPLOY
REM ============================================================

echo ========================================
echo  INICIANDO DEPLOYMENT...
echo ========================================
echo.

firebase deploy --only hosting

if errorlevel 1 (
    echo.
    echo ========================================
    echo  DEPLOYMENT FALHOU!
    echo ========================================
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOYMENT CONCLUIDO COM SUCESSO!
echo ========================================
echo.

echo.
echo Proximos Passos:
echo 1. Abra o navegador
echo 2. Entre em https://[seu-projeto-id].web.app
echo 3. Faça login
echo 4. Teste a aplicacao
echo.

pause
