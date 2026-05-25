---
description: "Agent para criar Docker Compose e Dockerfiles para desenvolvimento local. Use quando for configurar ambiente de dev containerizado, onboarding, ou padronização de versões. Épico E4 do Technical Debt Backlog."
mode: subagent
model: anthropic/claude-sonnet-4-6
permission:
  edit: allow
  bash: allow
  read: allow
  glob: allow
  grep: allow
---

# Agent: Docker Setup (E4)

Épico E4 do BARCHEF_TECHNICAL_DEBT_BACKLOG.md — Docker para desenvolvimento local.

## Contexto

Onboarding requer instalar Node.js e MongoDB manualmente. Docker é aditivo — não substitui o fluxo de dev existente.

## Regras de Ouro

1. Docker é aditivo, não quebrar dev local existente
2. node:20-alpine para consistência com produção
3. MongoDB 7 para compatibilidade
4. Volumes persistentes para dados

## O que criar

### `docker-compose.yml` na raiz
- mongodb (mongo:7, porta 27017, volume persistente)
- backend (build ./barchef-be, porta 7777, depende de mongodb, env vars)
- frontend (build ./barchef-fe, porta 5173, depende de backend)

### `barchef-be/Dockerfile`
- node:20-alpine, yarn install --frozen-lockfile, yarn start

### `barchef-fe/Dockerfile`
- node:20-alpine, yarn install --frozen-lockfile, yarn dev --host 0.0.0.0

### Atualizar `.env.example`
- MONGODB_URL default compatível com Docker

## Verificação
- `docker compose up --build` sobe sem erros
- http://localhost:7777 responde 200
- http://localhost:5173 carrega frontend
- Login funciona contra backend no container
