@echo off
REM ============================================================
REM DEPLOYMENT COM VERBOSE - PreçoCerto v1.0.0
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
    echo Pressione qualquer tecla...
    pause
    exit /b 1
)

echo [OK] firebase.json encontrado
echo.

REM Verificar Firebase CLI
echo Verificando Firebase CLI...
firebase --version
if errorlevel 1 (
    echo [ERRO] Firebase CLI nao encontrado!
    pause
    exit /b 1
)

echo [OK] Firebase CLI instalado
echo.

REM Verificar autenticacao
echo Verificando autenticacao...
firebase projects:list
if errorlevel 1 (
    echo [ERRO] Nao autenticado!
    pause
    exit /b 1
)

echo [OK] Autenticado no Firebase
echo.

REM Verificar build
if not exist "precocerto\dist\index.html" (
    echo [ERRO] Build nao encontrado!
    pause
    exit /b 1
)

echo [OK] Build encontrado
echo.

REM ============================================================
REM INICIANDO DEPLOYMENT
REM ============================================================

echo.
echo ========================================
echo  INICIANDO DEPLOYMENT FIREBASE...
echo ========================================
echo.

firebase deploy --only hosting

echo.
echo ========================================
echo  VERIFICANDO RESULTADO...
echo ========================================
echo.

if errorlevel 1 (
    echo [ERRO] Deployment falhou!
    echo.
    echo Pressione qualquer tecla para fechar...
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOYMENT CONCLUIDO COM SUCESSO!
echo ========================================
echo.

REM Tentar extrair URL
echo Procurando URL de producao...
for /f "tokens=2" %%A in ('firebase projects:list ^| findstr /R "^\["') do (
    set PROJECT_ID=%%A
    set PROJECT_ID=!PROJECT_ID:[=!
    set PROJECT_ID=!PROJECT_ID:]=!
)

if not "!PROJECT_ID!"=="" (
    echo.
    echo ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    echo URL DE PRODUCAO:
    echo https://!PROJECT_ID!.web.app
    echo ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    echo.
)

echo.
echo Proximos Passos:
echo 1. Abra um navegador
echo 2. Cole a URL acima
echo 3. Faça login
echo 4. Teste a aplicacao
echo.

echo Pressione qualquer tecla para fechar esta janela...
pause
