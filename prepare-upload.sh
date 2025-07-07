#!/bin/bash

# Script para preparar projeto para upload na VPS

echo "🚀 Preparando projeto para upload..."

# Criar pasta temporária
mkdir -p temp-deploy
cd temp-deploy

# Copiar arquivos essenciais
echo "📁 Copiando arquivos principais..."
cp -r ../client ./
cp -r ../server ./
cp -r ../shared ./
cp ../package.json ./
cp ../package-lock.json ./
cp ../tsconfig.json ./
cp ../vite.config.ts ./
cp ../tailwind.config.ts ./
cp ../postcss.config.js ./
cp ../components.json ./
cp ../drizzle.config.ts ./
cp ../schema.sql ./

# Copiar configurações de deploy
cp ../docker-compose.yml ./
cp ../.env.example ./
cp ../Dockerfile ./
cp ../nginx.conf ./

# Criar .env de produção
echo "⚙️ Criando arquivo .env de exemplo..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:senha123@db:5432/appointments

# Configure estas variáveis com seus dados reais:
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI

# Evolution API (WhatsApp)
EVOLUTION_API_URL=SUA_URL_EVOLUTION_AQUI
EVOLUTION_API_KEY=SUA_CHAVE_AQUI
EVOLUTION_INSTANCE=SEU_NOME_INSTANCIA

# URLs de produção (substitua pelo IP da sua VPS)
BASE_URL=http://SEU-IP-VPS:5000
OAUTH_REDIRECT_URI=http://SEU-IP-VPS:5000/api/oauth/google/callback

# Senha admin (opcional)
ADMIN_PASSWORD=admin123
EOF

# Criar script de start simplificado
echo "📋 Criando script de inicialização..."
cat > start-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando sistema de agendamentos..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instalando..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Parar serviços existentes
echo "🛑 Parando serviços existentes..."
docker-compose down 2>/dev/null || true

# Iniciar serviços
echo "🔄 Iniciando serviços..."
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 30

# Verificar status
echo "📊 Status dos serviços:"
docker-compose ps

# Mostrar URL de acesso
IP_EXTERNO=$(curl -s ifconfig.me 2>/dev/null || echo "SEU-IP-VPS")
echo ""
echo "✅ Deploy concluído!"
echo "🌐 Acesse: http://$IP_EXTERNO:5000"
echo "⚙️ Configurações: Clique no botão 'Configurações' na página inicial"
echo ""
echo "📋 Comandos úteis:"
echo "  Ver logs: docker-compose logs -f app"
echo "  Restart: docker-compose restart"
echo "  Parar: docker-compose down"
EOF

chmod +x start-production.sh

# Criar README para deploy
cat > INSTRUCOES-DEPLOY.md << 'EOF'
# Instruções de Deploy

## 📋 Arquivos Preparados

Este diretório contém todos os arquivos necessários para deploy na VPS.

## 🚀 Como fazer deploy:

### 1. Upload para VPS
- Comprima esta pasta em um arquivo ZIP
- Faça upload via SCP, SFTP ou interface web da VPS
- Extraia na pasta `/opt/appointment-system/`

### 2. Configure variáveis
- Edite o arquivo `.env` com suas configurações reais
- Principalmente: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, IP da VPS

### 3. Execute o deploy
```bash
cd /opt/appointment-system
chmod +x start-production.sh
./start-production.sh
```

### 4. Acesse a aplicação
- URL: http://SEU-IP-VPS:5000
- Configure Google OAuth e WhatsApp na interface

## 🔧 Comandos úteis:
- Ver logs: `docker-compose logs -f app`
- Restart: `docker-compose restart`
- Parar: `docker-compose down`
- Status: `docker-compose ps`

## ⚠️ Importante:
- Configure as variáveis no .env antes de executar
- Certifique-se que a porta 5000 está liberada no firewall
- Para usar domínio, configure Nginx conforme documentação
EOF

# Compactar tudo
echo "📦 Criando arquivo para upload..."
cd ..
zip -r projeto-pronto-para-vps.zip temp-deploy/

echo "✅ Projeto preparado!"
echo "📦 Arquivo criado: projeto-pronto-para-vps.zip"
echo "📋 Próximos passos:"
echo "   1. Faça upload do arquivo ZIP para sua VPS"
echo "   2. Extraia em /opt/appointment-system/"
echo "   3. Configure o arquivo .env"
echo "   4. Execute: ./start-production.sh"
echo ""
echo "📖 Leia o arquivo INSTRUCOES-DEPLOY.md dentro do ZIP para detalhes completos"

# Limpar pasta temporária
rm -rf temp-deploy