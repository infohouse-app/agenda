# Guia de Deploy - Sistema de Agendamentos

## 🏠 Hospedagem Local (Development/Production)

### Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- Git

### 1. Preparação do Ambiente
```bash
# Clone o projeto
git clone <seu-repositorio>
cd appointment-system

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
```

### 2. Configuração do Banco PostgreSQL
```bash
# No PostgreSQL, crie o banco
createdb appointment_system

# Configure a conexão no .env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/appointment_system"
```

### 3. Migração do Banco
```bash
# Execute as migrações
npm run db:push
```

### 4. Execução
```bash
# Desenvolvimento
npm run dev

# Produção (usando Docker - Recomendado)
./deploy.sh

# Ou manualmente
npm run build
npm start
```

---

## 🚀 Deploy no EasyPanel (Contabo VPS)

### Preparação da VPS
1. **Acesse sua VPS Contabo**
2. **Instale Docker e Docker Compose**
3. **Instale EasyPanel**: https://easypanel.io/docs/installation

### 1. Dockerfile para Produção
Criamos um Dockerfile otimizado para o sistema completo.

### 2. Docker Compose
Arquivo com PostgreSQL + Aplicação configurados.

### 3. Configuração no EasyPanel
- **Tipo**: Docker Compose
- **Repositório**: Seu GitHub/GitLab
- **Branch**: main
- **Porta**: 5000

### 4. Variáveis de Ambiente no EasyPanel
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:senha123@db:5432/appointments
PORT=5000
```

### 5. Deploy Automático
O EasyPanel fará:
- Pull do código
- Build da imagem
- Deploy com PostgreSQL
- SSL automático

---

## 📋 Checklist de Deploy

### Antes do Deploy
- [ ] Código commitado no Git
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado
- [ ] Domínio configurado (opcional)

### Pós Deploy
- [ ] Aplicação acessível
- [ ] Banco conectado
- [ ] Google Calendar OAuth funcionando
- [ ] WhatsApp API testado
- [ ] SSL configurado (EasyPanel automático)

---

## 🔧 Troubleshooting

### Problemas Comuns
1. **Erro de conexão DB**: Verifique DATABASE_URL
2. **OAuth não funciona**: Atualize redirect_uri no Google Cloud
3. **Porta ocupada**: Mude PORT no .env
4. **Build falha**: Verifique Node.js version

### Logs
```bash
# Ver logs da aplicação
docker logs container_name

# EasyPanel
Acesse painel → Logs
```

---

## 🌐 Configuração de Domínio

### No EasyPanel
1. Adicione domínio personalizado
2. SSL é automático
3. Configure DNS para apontar para VPS

### Atualize OAuth Redirect
No Google Cloud Console:
- Authorized redirect URIs: `https://seudominio.com/api/oauth/google/callback`