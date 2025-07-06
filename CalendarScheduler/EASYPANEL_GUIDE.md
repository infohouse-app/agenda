# EasyPanel Deploy Guide - Sistema de Agendamentos

## 📋 Pré-requisitos

### 1. VPS Contabo Preparada
- Ubuntu 20.04+ ou similar
- Docker e Docker Compose instalados
- EasyPanel instalado: https://easypanel.io/docs/installation

### 2. Repositório Git
- Código commitado no GitHub/GitLab
- Arquivos de deploy incluídos (Dockerfile, docker-compose.yml)

---

## 🚀 Deploy no EasyPanel

### Passo 1: Criar Projeto
1. **Login no EasyPanel**
   - Acesse: `http://seu-ip-vps:3000`
   - Faça login com suas credenciais

2. **Novo Projeto**
   - Clique em "Create Project"
   - Nome: `appointment-system`
   - Tipo: **App from Source Code**

### Passo 2: Configurar Repositório
```
Repository URL: https://github.com/seu-usuario/appointment-system
Branch: main
Build Command: npm run build
Start Command: npm start
Port: 5000
```

### Passo 3: Variáveis de Ambiente
No EasyPanel, adicione as seguintes variáveis:

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:senha123@db:5432/appointments

# Google OAuth (obter do Google Cloud Console)
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# Evolution API (WhatsApp)
EVOLUTION_API_URL=sua_evolution_api_url
EVOLUTION_API_KEY=sua_evolution_api_key
EVOLUTION_INSTANCE=seu_nome_instancia

# Configurações opcionais
ADMIN_PASSWORD=admin123
BASE_URL=https://seudominio.com
OAUTH_REDIRECT_URI=https://seudominio.com/api/oauth/google/callback
```

### Passo 4: Banco de Dados
1. **Criar Serviço PostgreSQL**
   - No EasyPanel: "Add Service" → "PostgreSQL"
   - Nome: `appointment-db`
   - Password: `senha123`
   - Database: `appointments`

2. **Conectar ao App**
   - O DATABASE_URL será: `postgresql://postgres:senha123@appointment-db:5432/appointments`

### Passo 5: Deploy
1. **Iniciar Deploy**
   - Clique em "Deploy"
   - EasyPanel fará pull do código e build automático

2. **Aguardar Conclusão**
   - Logs aparecem em tempo real
   - Deploy leva ~3-5 minutos

---

## 🌐 Configuração de Domínio

### No EasyPanel
1. **Adicionar Domínio**
   - Settings → Domains
   - Adicione: `seudominio.com`
   - SSL automático via Let's Encrypt

### No DNS (Cloudflare/outros)
```
Type: A
Name: @
Content: IP_DA_SUA_VPS
TTL: Auto
```

### Atualizar Google OAuth
No Google Cloud Console:
- Authorized JavaScript origins: `https://seudominio.com`
- Authorized redirect URIs: `https://seudominio.com/api/oauth/google/callback`

---

## 📊 Monitoramento

### Logs no EasyPanel
- **Application Logs**: Ver erros da aplicação
- **Build Logs**: Ver problemas no deploy
- **Database Logs**: Ver problemas no PostgreSQL

### Health Check
O EasyPanel monitora automaticamente:
- Status da aplicação (porta 5000)
- Uso de CPU/RAM
- Uptime

---

## 🔧 Comandos Úteis

### Via SSH na VPS
```bash
# Ver containers rodando
docker ps

# Logs da aplicação
docker logs appointment-system

# Restart da aplicação
# (Feito pelo EasyPanel interface)

# Backup do banco
docker exec appointment-db pg_dump -U postgres appointments > backup.sql
```

### Via EasyPanel Interface
- **Restart**: Botão "Restart" no painel
- **Rebuild**: Botão "Redeploy" com new build
- **Scale**: Ajustar recursos (CPU/RAM)
- **Logs**: Ver em tempo real

---

## 🚨 Troubleshooting

### Deploy Falha
1. **Verificar Logs**: EasyPanel → Logs
2. **Variáveis**: Confirmar todas as env vars
3. **Banco**: Testar conexão PostgreSQL

### OAuth Não Funciona
1. **Redirect URI**: Deve ser `https://seudominio.com/api/oauth/google/callback`
2. **Client ID/Secret**: Verificar credenciais Google
3. **Domínio**: Aguardar propagação DNS

### Performance
1. **Scale Up**: Aumentar CPU/RAM no EasyPanel
2. **Database**: Otimizar queries se necessário
3. **Cache**: Considerar Redis para sessões

---

## 🎯 Resultado Final

Após deploy bem sucedido:
- ✅ **URL**: `https://seudominio.com`
- ✅ **SSL**: Certificado automático
- ✅ **Google Calendar**: OAuth2 permanente
- ✅ **WhatsApp**: Evolution API integrada
- ✅ **Banco**: PostgreSQL persistente
- ✅ **Monitoring**: EasyPanel dashboard

### Acesso ao Sistema
1. **Frontend**: `https://seudominio.com`
2. **Configurações**: Botão "Configurações" (senha: admin123)
3. **OAuth**: Autorizar Google Calendar
4. **Testes**: Criar agendamento de teste