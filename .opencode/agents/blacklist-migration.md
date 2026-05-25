---
description: "Agent para migrar a blacklist de tokens JWT de memória (Set) para MongoDB. Use quando for refatorar autenticação, logout, ou token invalidation. Épico E2 do Technical Debt Backlog."
mode: subagent
model: anthropic/claude-sonnet-4-6
permission:
  edit: allow
  bash: allow
  read: allow
  glob: allow
  grep: allow
---

# Agent: Blacklist Migration (E2)

Épico E2 do BARCHEF_TECHNICAL_DEBT_BACKLOG.md — Migrar blacklist de tokens de `Set` em memória para MongoDB.

## Contexto

`barchef-be/middlewares/tokenBlacklist.js` usa `new Set()`. Quando o servidor reinicia (deploy, crash), todos os tokens blacklistados voltam a ser válidos.

## Regras de Ouro

1. Não quebrar contrato de API de login/logout
2. Hash do token (SHA-256), nunca token bruto no banco
3. TTL index no MongoDB para expiração automática
4. Fallback para `Set` em memória se MongoDB falhar

## Passos

### 1. Criar modelo `models/tokenBlacklistModel.js`
- tokenHash (String, required, unique, indexed)
- expiresAt (Date, required, TTL index)
- createdAt (Date, default: Date.now)

### 2. Modificar `middlewares/tokenBlacklist.js`
- Importar modelo TokenBlacklist
- `addToken(token)`: decodificar JWT sem verificar assinatura, extrair `exp`, hashear token, salvar no MongoDB
- `isTokenBlacklisted(token)`: hashear token, buscar no MongoDB, retornar boolean
- try/catch: se MongoDB falhar, usar `Set` em memória com `console.warn`

### 3. Testar
- Login → logout → tentar usar token → 401
- Restartar servidor → token continua blacklistado
- Derrubar MongoDB → fallback funciona

## Verificação
- `yarn test` passa
- Fluxo completo de logout sobrevive a restart
