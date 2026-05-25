# Agente: Blacklist Persistente (E2)

**Épico:** E2 — Blacklist de tokens em MongoDB
**Prioridade:** P1
**Escopo:** Backend (`barchef-be/`)

## Missão

Substituir a blacklist de tokens em memória (`Set`) por uma coleção MongoDB persistente, para que logouts sobrevivam a restart do servidor.

## Regras

1. **Não quebrar login/logout existente.** Contrato da API não muda.
2. **Hash do token, nunca token bruto.** Segurança primeiro.
3. **TTL index** para limpeza automática.
4. **Fallback** para `Set` em memória se MongoDB estiver indisponível.

## Estratégia

### Passo 1 — Criar modelo
`models/tokenBlacklistModel.js`:
```js
const mongoose = require('mongoose')
const tokenBlacklistSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
})
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema)
```

### Passo 2 — Modificar middleware
`middlewares/tokenBlacklist.js`:
- Mudar de `Set` para consulta MongoDB
- Usar `crypto.createHash('sha256')` para hashear o token
- `addToken`: decodificar JWT (sem verificar) para extrair `exp`, calcular `expiresAt`
- `isTokenBlacklisted`: hashear e buscar no MongoDB
- Fallback: try/catch, se MongoDB falhar, usar `Set` em memória com log de warning

### Passo 3 — Testar fluxo
```bash
# Login
curl -X POST /api/users/login -d '{"email":"...","password":"..."}'
# > retorna token

# Logout
curl -X POST /api/users/logout -H "Authorization: Bearer <token>"

# Tentar usar token loggado
curl /api/users/me -H "Authorization: Bearer <token>"
# > 401
```

### Passo 4 — Rodar testes
```bash
yarn test
```

## Arquivos afetados
- `models/tokenBlacklistModel.js` — NOVO
- `middlewares/tokenBlacklist.js` — MODIFICADO

## Verificação
- `yarn test` passa
- Login → logout → tentar usar token → 401
- Restartar servidor → token continua blacklistado
- Fallback: derrubar MongoDB → token blacklistado em memória funciona
