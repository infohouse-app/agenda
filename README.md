# Sistema de Agendamento

Este é um sistema de agendamento de horários com frontend em React (Vite) e backend em Node.js com Express.js. Utiliza PostgreSQL (NeonDB) e oferece integrações com Google Calendar e WhatsApp.

**Arquitetura Simplificada:** O projeto utiliza exclusivamente o backend Express.js. Implementações anteriores com Cloudflare Workers foram removidas para unificar a lógica e a fonte de dados.

## Pré-requisitos

*   Node.js (>=18.x)
*   npm
*   Docker e Docker Compose (para deploy com `deploy.sh`)

## Configuração

1.  Copie `.env.example` para `.env`: `cp .env.example .env`
2.  Edite `.env` com suas configurações:
    *   `DATABASE_URL`: Conexão do PostgreSQL (NeonDB).
    *   `SESSION_SECRET`: Segredo para sessões Express.
    *   `ENCRYPTION_KEY`: Chave de 32 bytes para criptografia (gerar com `openssl rand -hex 32`).
    *   Detalhes das integrações (Google Calendar, WhatsApp), também configuráveis via UI.

## Desenvolvimento Local

1.  `npm install`
2.  `npm run dev` (Backend Express e frontend Vite com hot-reloading)
    *   Acesso: `http://localhost:5000`

## Build para Produção (local)

1.  `npm run build` (Gera arquivos otimizados em `dist/`)
2.  `npm run start` (Executa a aplicação de `dist/`)

## Deploy com Docker

O script `deploy.sh` automatiza o deploy com Docker:
1.  Configure `.env`.
2.  Execute: `bash deploy.sh`
    *   Acesso: `http://localhost:5000`
    *   DB (se no compose): Porta `5432`
    *   Logs: `docker-compose logs -f app`
    *   Parar: `docker-compose down`

## Scripts `package.json`

*   `dev`: Desenvolvimento.
*   `build`: Build de produção.
*   `start`: Executar build de produção.
*   `check`: Type-checking TypeScript.
*   `db:push`: Aplicar migrações Drizzle (requer `DATABASE_URL`).

---
*README atualizado para refletir a arquitetura simplificada.*