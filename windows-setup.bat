@echo off
title Sistema de Agendamentos - Setup Windows
color 0A

echo ===============================================
echo    SISTEMA DE AGENDAMENTOS - SETUP WINDOWS
echo ===============================================
echo.

echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo.
    echo Por favor instale Node.js 18+ de: https://nodejs.org
    echo Após instalar, execute este script novamente.
    pause
    exit /b 1
) else (
    echo ✅ Node.js encontrado
)

echo.
echo [2/5] Instalando dependências...
npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências
    echo Tentando limpar cache...
    npm cache clean --force
    rmdir /s /q node_modules 2>nul
    del package-lock.json 2>nul
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Falha na instalação
        pause
        exit /b 1
    )
)
echo ✅ Dependências instaladas

echo.
echo [3/5] Configurando banco de dados...
echo Criando arquivo .env...
(
echo NODE_ENV=development
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointments
echo.
echo # Configure suas credenciais Google OAuth:
echo GOOGLE_CLIENT_ID=seu_client_id_aqui
echo GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
echo BASE_URL=http://localhost:5000
echo OAUTH_REDIRECT_URI=http://localhost:5000/api/oauth/google/callback
echo.
echo # Senha do admin ^(opcional^)
echo ADMIN_PASSWORD=admin123
) > .env
echo ✅ Arquivo .env criado

echo.
echo [4/5] Verificando PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL nao encontrado localmente
    echo.
    echo OPCOES:
    echo A) Instalar PostgreSQL local: https://www.postgresql.org/download/windows/
    echo B) Usar banco online gratuito: https://www.elephantsql.com/
    echo C) Usar SQLite ^(mais simples^)
    echo.
    echo Configurando para usar SQLite...
    (
    echo NODE_ENV=development
    echo DATABASE_URL=sqlite:./database.sqlite
    echo.
    echo # Configure suas credenciais Google OAuth:
    echo GOOGLE_CLIENT_ID=seu_client_id_aqui
    echo GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
    echo BASE_URL=http://localhost:5000
    echo OAUTH_REDIRECT_URI=http://localhost:5000/api/oauth/google/callback
    echo.
    echo # Senha do admin ^(opcional^)
    echo ADMIN_PASSWORD=admin123
    ) > .env
    echo ✅ Configurado para SQLite
) else (
    echo ✅ PostgreSQL encontrado
)

echo.
echo [5/5] Iniciando aplicação...
echo.
echo ===============================================
echo    SISTEMA INICIANDO...
echo ===============================================
echo.
echo 🌐 URL: http://localhost:5000
echo ⚙️ Configurações: Clique em "Configurações" na página
echo 🔑 Senha admin: admin123
echo.
echo Para parar: Ctrl+C
echo.

start http://localhost:5000
npm run dev

pause