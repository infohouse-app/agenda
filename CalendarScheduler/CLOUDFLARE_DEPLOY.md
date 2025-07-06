# Deploy no Cloudflare Workers + Pages

## Pré-requisitos

1. **Conta no Cloudflare** com Workers e Pages habilitados
2. **CLI do Wrangler** instalado: `npm install -g wrangler`
3. **Login no Wrangler**: `wrangler login`

## Configuração do Banco de Dados

### 1. Criar D1 Database
```bash
wrangler d1 create scheduling-db
```
Copie o `database_id` retornado e atualize o `wrangler.toml`

### 2. Executar Schema
```bash
wrangler d1 execute scheduling-db --file=./schema.sql
```

### 3. Atualizar wrangler.toml
```toml
name = "scheduling-app"
main = "dist/worker.js"
compatibility_date = "2023-12-01"

[[d1_databases]]
binding = "DB"
database_name = "scheduling-db"
database_id = "SEU-DATABASE-ID-AQUI"

[env.production]
vars = { NODE_ENV = "production" }
```

## Deploy do Backend (Worker)

### 1. Build do Worker
```bash
npx esbuild server/cloudflare-worker.ts --platform=browser --target=es2022 --bundle --format=esm --outfile=dist/worker.js
```

### 2. Deploy
```bash
wrangler deploy
```

### 3. Configurar Variáveis de Ambiente
```bash
wrangler secret put GOOGLE_CALENDAR_ACCESS_TOKEN
wrangler secret put EVOLUTION_API_URL
wrangler secret put EVOLUTION_API_KEY
wrangler secret put EVOLUTION_INSTANCE
```

## Deploy do Frontend (Cloudflare Pages)

### 1. Build do Frontend
```bash
npm run build
```

### 2. Deploy via Git
- Conecte seu repositório ao Cloudflare Pages
- Configure build settings:
  - **Build command**: `npm run build`
  - **Build output directory**: `dist`
  - **Node.js version**: 18

### 3. Configurar Variáveis de Ambiente
No painel do Cloudflare Pages, adicione:
- `NODE_ENV=production`
- Outras variáveis necessárias

## Estrutura Final

```
projeto/
├── dist/                     # Build output
│   ├── worker.js            # Cloudflare Worker
│   └── assets/              # Frontend assets
├── server/
│   ├── cloudflare-worker.ts # Worker source
│   └── ...                  # Outros arquivos do servidor
├── client/                  # Frontend source
├── schema.sql              # D1 Database schema
├── wrangler.toml           # Worker config
└── ...
```

## Recursos Cloudflare Necessários

1. **Cloudflare Workers** - Para API backend
2. **Cloudflare D1** - Banco de dados SQLite serverless
3. **Cloudflare Pages** - Hospedagem do frontend
4. **Cloudflare KV** (opcional) - Para cache/sessões

## Limitações do Cloudflare Workers

1. **Tempo de execução**: Máximo 30 segundos (CPU time) / 15 minutos (wall time)
2. **Memória**: 128 MB
3. **Tamanho do script**: 1 MB após compressão
4. **Requisições simultâneas**: 1000 por Worker
5. **D1 Database**: 
   - 25,000 leituras/dia (gratuito)
   - 100,000 escritas/dia (gratuito)

## Otimizações Aplicadas

### ✅ Removidos do projeto:
- Dependências desnecessárias para Workers
- Express.js (substituído por APIs nativas)
- Session management complexo
- Vite development server configs

### ✅ Mantido:
- Todas as funcionalidades core
- Google Calendar integration
- WhatsApp via Evolution API
- UI completa com shadcn/ui
- Sistema de configuração

### ✅ Adaptado:
- Database queries para D1 (SQLite)
- CORS headers nativos
- Error handling simplificado
- Build process otimizado

## Comandos Úteis

```bash
# Desenvolvimento local com Wrangler
wrangler dev

# Logs do Worker em produção
wrangler tail

# Verificar D1 database
wrangler d1 query scheduling-db "SELECT * FROM appointments LIMIT 5"

# Deploy forçado
wrangler deploy --force
```