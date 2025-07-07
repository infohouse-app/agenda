# ⚡ Deploy Rápido - 3 Opções Simples

## 🎯 Problema: GitHub com erro, EasyPanel não funciona

## ✅ SOLUÇÃO 1: Upload Direto (Mais Fácil)

### Passo a Passo:
1. **Baixar o projeto completo** deste Replit
   - Clique em "Download as Zip" no menu do Replit
   - Ou use: Files → Download → All files

2. **Upload para VPS**
   - Use WinSCP, FileZilla ou similar
   - Conecte na VPS: `ssh root@seu-ip-vps`
   - Upload para: `/opt/appointment-system/`

3. **Executar na VPS**
```bash
cd /opt/appointment-system
chmod +x deploy.sh
./deploy.sh
```

---

## ✅ SOLUÇÃO 2: Comandos Manuais (100% Controle)

### Na sua VPS:
```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# 2. Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 3. Criar projeto
mkdir -p /opt/appointment-system
cd /opt/appointment-system

# 4. Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: appointments
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: senha123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  app:
    image: node:18-alpine
    working_dir: /app
    depends_on: [db]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:senha123@db:5432/appointments
    ports:
      - "5000:5000"
    volumes:
      - ./:/app
    command: sh -c "npm install && npm run build && npm start"

volumes:
  postgres_data:
EOF

# 5. Fazer upload dos arquivos do projeto aqui
# (client/, server/, shared/, package.json, etc.)

# 6. Iniciar
docker-compose up -d
```

---

## ✅ SOLUÇÃO 3: Deploy Local (Para Testes)

### No seu computador:
```bash
# 1. Clonar/baixar projeto
# 2. Instalar dependências
npm install

# 3. Configurar banco local
# Instalar PostgreSQL localmente
# Criar banco: appointments

# 4. Configurar .env
DATABASE_URL=postgresql://postgres:senha@localhost:5432/appointments

# 5. Rodar
npm run dev
# Acessar: http://localhost:5000
```

---

## 🔧 Configurações Importantes

### No arquivo .env (qualquer método):
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:senha123@db:5432/appointments

# OBRIGATÓRIO: Suas credenciais Google
GOOGLE_CLIENT_ID=seu_client_id_real
GOOGLE_CLIENT_SECRET=seu_client_secret_real

# URLs (substitua pelo IP da VPS)
BASE_URL=http://SEU-IP-VPS:5000
OAUTH_REDIRECT_URI=http://SEU-IP-VPS:5000/api/oauth/google/callback
```

### No Google Cloud Console:
- Authorized redirect URIs: `http://SEU-IP-VPS:5000/api/oauth/google/callback`

---

## 🎯 Resultado Final

Qualquer método resultará em:
- **URL**: `http://seu-ip-vps:5000`
- **Sistema completo** funcionando
- **Google Calendar** integrado
- **WhatsApp** pronto para configurar

---

## 🚨 Se tudo mais falhar:

### Opção Emergency (Porta 3000):
```bash
# Na VPS, método ultra-simples
git clone https://github.com/seu-usuario/repo.git || echo "Sem git, fazer upload manual"
cd seu-projeto
npm install
npm start
# Acesse: http://ip-vps:3000
```

**💡 Dica**: O método 1 (Upload direto) é o mais confiável para contornar problemas com GitHub/EasyPanel.