# Dockerfile otimizado para EasyPanel
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    dumb-init \
    curl \
    bash

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para build)
RUN npm ci --silent

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Remover dependências de desenvolvimento após build
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Ajustar permissões
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 5000

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server/index.js"]