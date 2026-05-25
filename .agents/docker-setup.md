# Agente: Docker Setup (E4)

**Épico:** E4 — Docker para desenvolvimento local
**Prioridade:** P2
**Escopo:** Projeto inteiro (raiz)

## Missão

Criar `docker-compose.yml` e `Dockerfile`s para que qualquer pessoa consiga rodar o BarChef localmente com um único comando, sem instalar MongoDB ou configurar variáveis de ambiente manualmente.

## Regras

1. **Docker é aditivo.** Não quebrar o fluxo de dev existente (quem não usa Docker continua funcionando).
2. **Usar `node:20-alpine`** para consistência com o ambiente de produção.
3. **MongoDB 7** para compatibilidade com o código existente.
4. **Volumes persistentes** para dados do MongoDB.

## Estratégia

### Passo 1 — `docker-compose.yml` na raiz

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  backend:
    build: ./barchef-be
    ports:
      - "7777:7777"
    environment:
      - PORT=7777
      - MONGODB_URL=mongodb://mongodb:27017/barchef
      - JWT_SECRET=dev-secret-change-in-production
      - CORS_ORIGIN=*
      - FRONTEND_URL=http://localhost:5173
    depends_on:
      - mongodb
    restart: unless-stopped

  frontend:
    build: ./barchef-fe
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:7777/api
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongodb_data:
```

### Passo 2 — `barchef-be/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
EXPOSE 7777
CMD ["yarn", "start"]
```

### Passo 3 — `barchef-fe/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0"]
```

### Passo 4 — Atualizar `.env.example`

Adicionar valores default compatíveis com Docker:
```
MONGODB_URL=mongodb://localhost:27017/barchef
```

### Passo 5 — Testar

```bash
docker compose up --build
# Backend em http://localhost:7777
# Frontend em http://localhost:5173
# API Docs em http://localhost:7777/api-docs
```

## Arquivos afetados
- `docker-compose.yml` — NOVO (raiz)
- `barchef-be/Dockerfile` — NOVO
- `barchef-fe/Dockerfile` — NOVO
- `barchef-be/.env.example` — MODIFICADO

## Verificação
- `docker compose up --build` sobe sem erros
- `http://localhost:7777` responde 200
- `http://localhost:5173` carrega o frontend
- Login funciona contra o backend no container
