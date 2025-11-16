FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código fonte e configs necessárias
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dependências de dev para imagem final
RUN npm prune --production

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/cli/mercuius-js.js", "start"]


