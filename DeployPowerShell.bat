@echo off
REM ============================================================
REM DEPLOYMENT via PowerShell - PreçoCerto v1.0.0
REM ============================================================

setlocal enabledelayedexpansion

REM Abrir PowerShell como Administrador
powershell -NoExit -Command "cd 'C:\Users\ENG ' CHIVAS\Documents\ChatGPT\suite-marketing-ecommerce'; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ' DEPLOYMENT - PrecoCerto v1.0.0' -ForegroundColor Green; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Executando: firebase deploy --only hosting' -ForegroundColor Yellow; Write-Host ''; Write-Host 'Aguarde 5-10 minutos...' -ForegroundColor Yellow; Write-Host ''; firebase deploy --only hosting; Write-Host ''; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ' DEPLOYMENT COMPLETO' -ForegroundColor Green; Write-Host '========================================' -ForegroundColor Cyan; Write-Host 'Janela vai fechar em 10 segundos...' -ForegroundColor Yellow; Start-Sleep -Seconds 10"
