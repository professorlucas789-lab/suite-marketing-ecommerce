@echo off
REM ============================================================
REM DEPLOYMENT BUTTON - PreçoCerto v1.0.0
REM Simplesmente faça double-click neste ficheiro para fazer deploy
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
    echo Este ficheiro precisa estar na pasta: /workspace/suite-marketing-ecommerce
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
    echo Instale em: https://firebase.google.com/docs/cli
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

REM Extrair URL
for /f "tokens=2" %%A in ('firebase projects:list ^| findstr /R "^\["') do (
    set PROJECT_ID=%%A
    set PROJECT_ID=!PROJECT_ID:[=!
    set PROJECT_ID=!PROJECT_ID:]=!
)

if not "!PROJECT_ID!"=="" (
    echo.
    echo URL de Producao: https://!PROJECT_ID!.web.app
    echo.
)

echo ========================================
echo  Proximos Passos:
echo  1. Abra: https://!PROJECT_ID!.web.app
echo  2. Faça login
echo  3. Teste a aplicacao
echo  4. Crie indices Firestore conforme erros
echo ========================================
echo.

pause
