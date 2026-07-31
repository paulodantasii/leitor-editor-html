@echo off
title Leitor e Editor de HTML - Servidor Local
echo ========================================================
echo   Iniciando o Leitor e Editor de HTML...
echo   Servidor rodando em: http://localhost:3000
echo ========================================================
echo.

:: Aguarda 2 segundos e abre o navegador no endereço local
timeout /t 2 /nobreak >nul
start http://localhost:3000

:: Executa o servidor de desenvolvimento Vite
npm run dev
