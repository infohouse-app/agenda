# Deploy Direto na VPS Contabo (Sem EasyPanel)

## 📋 Método Simples e Confiável

### Pré-requisitos
- VPS Contabo com Ubuntu 20.04+
- Acesso SSH à VPS
- Domínio apontado para IP da VPS (opcional)

---

## 🚀 Instalação do Ambiente na VPS

### 1. Conectar na VPS
```bash
ssh root@seu-ip-vps
```

### 2. Instalar Docker e Docker Compose
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

### 3. Instalar Git e Node.js (para build)
```bash
# Instalar Git
apt install git -y

# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verificar
node --version
npm --version
```

---

## 📁 Deploy da Aplicação

### 1. Clonar Projeto na VPS
```bash
# Criar diretório para aplicação
mkdir -p /opt/appointment-system
cd /opt/appointment-system

# Clonar repositório (substitua pela URL do seu repo)
git clone https://github.com/seu-usuario/appointment-system.git .

# Ou fazer upload manual dos arquivos via SCP
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar exemplo para .env
cp .env.example .env

# Editar configurações
nano .env
```

**Configurações essenciais no .env:**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:senha123@db:5432/appointments

# Google OAuth (do Google Cloud Console)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

# Evolution API
EVOLUTION_API_URL=sua_url
EVOLUTION_API_KEY=sua_chave

# Configurações de produção
BASE_URL=http://seu-ip-vps:5000
OAUTH_REDIRECT_URI=http://seu-ip-vps:5000/api/oauth/google/callback
```

### 3. Build e Deploy
```bash
# Dar permissão ao script
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

---

## 🌐 Configurar Nginx (Opcional)

### Para usar domínio próprio com SSL:

```bash
# Instalar Nginx
apt install nginx -y

# Criar configuração do site
nano /etc/nginx/sites-available/appointment-system
```

**Configuração Nginx:**
```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Ativar site
ln -s /etc/nginx/sites-available/appointment-system /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Instalar Certbot para SSL
apt install certbot python3-certbot-nginx -y
certbot --nginx -d seudominio.com -d www.seudominio.com
```

---

## 🔧 Comandos de Gerenciamento

### Ver Status dos Serviços
```bash
cd /opt/appointment-system
docker-compose ps
```

### Ver Logs
```bash
# Logs da aplicação
docker-compose logs -f app

# Logs do banco
docker-compose logs -f db
```

### Restart dos Serviços
```bash
# Restart completo
docker-compose restart

# Restart só da aplicação
docker-compose restart app
```

### Parar/Iniciar Serviços
```bash
# Parar tudo
docker-compose down

# Iniciar tudo
docker-compose up -d
```

### Backup do Banco
```bash
# Criar backup
docker exec appointment-system-db-1 pg_dump -U postgres appointments > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker exec -i appointment-system-db-1 psql -U postgres appointments < backup.sql
```

---

## 🚨 Troubleshooting

### Problema: Porta 5000 não acessível
```bash
# Verificar se aplicação está rodando
docker-compose ps

# Verificar logs
docker-compose logs app

# Verificar firewall
ufw status
ufw allow 5000
```

### Problema: Banco não conecta
```bash
# Verificar status do PostgreSQL
docker-compose logs db

# Verificar variável DATABASE_URL no .env
cat .env | grep DATABASE_URL
```

### Problema: OAuth não funciona
1. Verificar se `OAUTH_REDIRECT_URI` no .env está correto
2. No Google Cloud Console, adicionar URI: `http://seu-ip-vps:5000/api/oauth/google/callback`
3. Restart da aplicação: `docker-compose restart app`

### Problema: Build falha
```bash
# Verificar se Node.js está instalado
node --version

# Limpar e rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📋 Checklist Final

- [ ] VPS configurada com Docker
- [ ] Projeto clonado/transferido
- [ ] Arquivo .env configurado
- [ ] Deploy executado com sucesso
- [ ] Aplicação acessível via IP:5000
- [ ] Google OAuth funcionando
- [ ] Banco de dados operacional
- [ ] Nginx configurado (se usar domínio)
- [ ] SSL ativo (se usar domínio)

---

## 🎯 URLs Finais

**Sem domínio:**
- Aplicação: `http://seu-ip-vps:5000`
- Configurações: Click no botão "Configurações"

**Com domínio:**
- Aplicação: `https://seudominio.com`
- SSL automático via Let's Encrypt

Este método é mais direto e confiável que usar EasyPanel, dando controle total sobre o deploy.