#!/bin/bash

# Sistema de Agendamentos - Setup VPS Simples
# Para iniciantes - sem Docker, sem EasyPanel

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SISTEMA DE AGENDAMENTOS - SETUP VPS  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Este script deve ser executado como root${NC}"
   echo "Execute: sudo bash vps-setup.sh"
   exit 1
fi

echo -e "${YELLOW}[1/7] Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/7] Instalando Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo -e "${YELLOW}[3/7] Instalando PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

echo -e "${YELLOW}[4/7] Configurando PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE appointments;"
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'senha123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE appointments TO appuser;"

echo -e "${YELLOW}[5/7] Instalando PM2 (gerenciador de processos)...${NC}"
npm install -g pm2

echo -e "${YELLOW}[6/7] Configurando projeto...${NC}"
mkdir -p /opt/appointment-system
cd /opt/appointment-system

# Criar package.json básico
cat > package.json << 'EOF'
{
  "name": "appointment-system",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  }
}
EOF

# Criar servidor simplificado
cat > server.js << 'EOF'
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota básica de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema funcionando!' });
});

// Servir arquivos estáticos
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`🌐 Acesse: http://$(curl -s ifconfig.me):${port}`);
});
EOF

# Criar página HTML simples
mkdir -p public
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Agendamentos</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; text-align: center; }
        .status {
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .btn {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
        }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗓️ Sistema de Agendamentos</h1>
        <div class="status">
            ✅ <strong>Sistema funcionando!</strong><br>
            Seu servidor está rodando corretamente.
        </div>
        
        <h2>📋 Próximos Passos:</h2>
        <ol>
            <li>✅ Servidor funcionando</li>
            <li>⏳ Fazer upload dos arquivos do projeto</li>
            <li>⏳ Configurar Google OAuth</li>
            <li>⏳ Configurar WhatsApp</li>
        </ol>
        
        <h2>📁 Upload dos Arquivos:</h2>
        <p>Faça upload dos arquivos do seu projeto para:</p>
        <code>/opt/appointment-system/</code>
        
        <h2>🔧 Comandos Úteis:</h2>
        <ul>
            <li>Ver logs: <code>pm2 logs appointment-system</code></li>
            <li>Reiniciar: <code>pm2 restart appointment-system</code></li>
            <li>Parar: <code>pm2 stop appointment-system</code></li>
            <li>Status: <code>pm2 status</code></li>
        </ul>
        
        <button class="btn" onclick="window.location.reload()">🔄 Recarregar</button>
        <button class="btn" onclick="testApi()">🧪 Testar API</button>
    </div>

    <script>
        function testApi() {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    alert('✅ API funcionando: ' + data.message);
                })
                .catch(error => {
                    alert('❌ Erro na API: ' + error.message);
                });
        }
    </script>
</body>
</html>
EOF

# Criar arquivo .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://appuser:senha123@localhost:5432/appointments

# Configure suas credenciais Google OAuth:
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
BASE_URL=http://SEU-IP-VPS:5000
OAUTH_REDIRECT_URI=http://SEU-IP-VPS:5000/api/oauth/google/callback

# Senha do admin (opcional)
ADMIN_PASSWORD=admin123
EOF

# Instalar dependências
echo -e "${YELLOW}[7/7] Instalando dependências...${NC}"
npm install

# Configurar PM2
pm2 start server.js --name "appointment-system"
pm2 startup
pm2 save

# Configurar firewall
ufw allow 5000/tcp
ufw --force enable

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}          SETUP CONCLUÍDO!             ${NC}"
echo -e "${GREEN}========================================${NC}"
echo

IP_EXTERNO=$(curl -s ifconfig.me)
echo -e "${GREEN}🌐 Acesse: http://${IP_EXTERNO}:5000${NC}"
echo -e "${GREEN}📊 Status: pm2 status${NC}"
echo -e "${GREEN}📋 Logs: pm2 logs appointment-system${NC}"
echo

echo -e "${YELLOW}📁 Para fazer upload dos arquivos do projeto:${NC}"
echo -e "   Use SCP/SFTP para enviar para: /opt/appointment-system/"
echo -e "   Após upload, execute: pm2 restart appointment-system"
echo

echo -e "${YELLOW}⚙️ Não esqueça de configurar:${NC}"
echo -e "   - Editar .env com suas credenciais reais"
echo -e "   - Configurar Google OAuth no console"
echo -e "   - Configurar WhatsApp Evolution API"
echo