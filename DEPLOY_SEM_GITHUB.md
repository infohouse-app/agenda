# Deploy Direto na VPS (Sem GitHub)

## 📋 Método Simples - Upload Direto

### Opção 1: Upload via SCP (Recomendado)

#### 1. Preparar arquivos localmente
```bash
# No seu computador, compactar o projeto
zip -r appointment-system.zip . -x "node_modules/*" ".git/*" "dist/*"
```

#### 2. Upload para VPS
```bash
# Enviar arquivo para VPS
scp appointment-system.zip root@seu-ip-vps:/tmp/

# Conectar na VPS
ssh root@seu-ip-vps

# Extrair arquivos
cd /opt
mkdir appointment-system
cd appointment-system
unzip /tmp/appointment-system.zip
rm /tmp/appointment-system.zip
```

---

### Opção 2: Usar SFTP (Interface Gráfica)

#### Programas recomendados:
- **WinSCP** (Windows)
- **FileZilla** (Windows/Mac/Linux)
- **Cyberduck** (Mac)

#### Passos:
1. **Conectar via SFTP**
   - Host: IP da sua VPS
   - Usuário: root
   - Senha: senha da VPS
   - Porta: 22

2. **Navegar para /opt/**
3. **Criar pasta: appointment-system**
4. **Upload todos os arquivos do projeto**

---

### Opção 3: Deploy Manual Simplificado

#### 1. Conectar na VPS
```bash
ssh root@seu-ip-vps
```

#### 2. Instalar dependências
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 3. Criar estrutura do projeto
```bash
# Criar diretório
mkdir -p /opt/appointment-system
cd /opt/appointment-system
```

#### 4. Criar arquivos principais manualmente

**Criar docker-compose.yml:**
```bash
nano docker-compose.yml
```
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
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
    restart: unless-stopped
    working_dir: /app
    depends_on:
      - db
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://postgres:senha123@db:5432/appointments
    ports:
      - "5000:5000"
    volumes:
      - ./:/app
    command: sh -c "npm install && npm run build && npm start"

volumes:
  postgres_data:
```

**Criar .env:**
```bash
nano .env
```
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:senha123@db:5432/appointments

# Suas configurações Google OAuth
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

# Evolution API
EVOLUTION_API_URL=sua_url
EVOLUTION_API_KEY=sua_chave

BASE_URL=http://seu-ip-vps:5000
OAUTH_REDIRECT_URI=http://seu-ip-vps:5000/api/oauth/google/callback
```

---

## 🚀 Deploy Simplificado (Sem Build Complexo)

### Criar script de start simples:

**Criar start.sh:**
```bash
nano start.sh
```
```bash
#!/bin/bash
echo "🚀 Iniciando deploy..."

# Parar serviços existentes
docker-compose down 2>/dev/null || true

# Iniciar serviços
docker-compose up -d

echo "✅ Deploy concluído!"
echo "📱 Acesse: http://$(curl -s ifconfig.me):5000"
```

```bash
chmod +x start.sh
```

### Executar deploy:
```bash
./start.sh
```

---

## 📁 Estrutura Mínima Necessária

Se você quiser fazer upload manual apenas dos arquivos essenciais:

```
/opt/appointment-system/
├── docker-compose.yml
├── .env
├── start.sh
├── package.json
├── client/ (pasta completa)
├── server/ (pasta completa)
├── shared/ (pasta completa)
└── schema.sql
```

---

## 🔧 Troubleshooting Sem GitHub

### Problema: Arquivos não encontrados
```bash
# Verificar se todos os arquivos estão presentes
ls -la /opt/appointment-system/

# Verificar estrutura
find /opt/appointment-system -type f -name "*.json" -o -name "*.ts" -o -name "*.tsx" | head -20
```

### Problema: Permissões
```bash
# Corrigir permissões
chown -R root:root /opt/appointment-system
chmod -R 755 /opt/appointment-system
```

### Problema: Node modules
```bash
# Limpar e reinstalar dentro do container
docker-compose exec app npm install
```

---

## 📲 Como Atualizar Sem GitHub

### Método 1: Upload novo arquivo
1. Compactar projeto atualizado
2. Upload via SCP/SFTP
3. Substituir arquivos
4. Restart: `./start.sh`

### Método 2: Edição direta
```bash
# Editar arquivos diretamente na VPS
nano /opt/appointment-system/server/routes.ts

# Restart após alterações
docker-compose restart app
```

---

## 🎯 Resultado Final

Após seguir este guia:
- ✅ Aplicação rodando em `http://seu-ip-vps:5000`
- ✅ Banco PostgreSQL configurado
- ✅ Sem dependência do GitHub
- ✅ Deploy independente e controlado

Este método é mais simples e não depende de configurações complexas do GitHub ou EasyPanel.