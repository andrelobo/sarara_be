# BarChef Technical Debt Backlog

Last updated: 2026-05-25

## Executive Summary

O BarChef está em produção e evoluindo ativamente, mas acumulou dívidas técnicas durante a transição de MVP de inventário para plataforma operacional de salão. Este backlog documenta as 5 dívidas mais críticas, com análise de risco, estratégia de migração e plano de execução incremental.

**Regra de ouro:** Sem quebrar, sem regredir, 1 coisa de cada vez. Nenhuma refatoração deve quebrar login, RBAC, inventário ou o módulo de salão existente.

---

## E1 — Unificação das Camadas Offline (P0)

### Problema

O frontend possui **duas camadas de IndexedDB coexistindo** no mesmo banco (`sarara-db`, versão 2):

| Arquivo | Abordagem | Stores |
|---------|-----------|--------|
| `src/utils/db.js` | Genérica (`saveData`, `getAllData`, `getDataById`) + helpers específicos (sync queue, salon queue, form-data, auth) | beverages, ingredients, tables, commands, sync-queue, salon-queue, form-data, auth |
| `src/services/db.js` | Específica por entidade (`getAllBeverages`, `saveBeverage`, etc.) + sync queue | beverages, ingredients, tables, commands, sync-queue, salon-queue |

**Riscos concretos:**
- Duas implementações de `initDB()` com upgrade concorrente — podem corromper o schema
- Dados salvos por um módulo podem não ser lidos pelo outro se os stores divergirem
- Bugs de sync intermitentes difíceis de reproduzir
- Nova pessoa desenvolvedora não sabe qual importar

### Estratégia

1. **Auditar** todas as importações de `utils/db.js` e `services/db.js` no código
2. **Eleger** uma como fonte da verdade (recomendado: `services/db.js` por ter API mais limpa por entidade)
3. **Migrar** as funções exclusivas de `utils/db.js` (form-data, auth, inventory helpers) para `services/db.js` ou para módulos dedicados
4. **Redirecionar** todos os imports para a camada unificada
5. **Deprecar** `utils/db.js` com warning, depois remover

### Backlog

- [ ] **E1.1** — Mapear todas as importações de `utils/db` e `services/db` no código
  - `grep -r "from.*utils/db" src/`
  - `grep -r "from.*services/db" src/`
  - `grep -r "require.*utils/db" src/`
  - `grep -r "require.*services/db" src/`

- [ ] **E1.2** — Identificar funções exclusivas de cada arquivo
  - `utils/db.js` exclusive: `saveData`, `getAllData`, `getDataById`, `deleteData`, `saveSyncQueue` (legado), `getSyncQueue` (legado), `updateSyncQueueItem` (legado), `clearSyncQueue` (legado), `operationTargetsInventoryEntity`, `getInventorySyncStatusSummary`, `getFailedInventoryEntityIds`, `retrySyncOperationsByEntity`, `retrySyncOperationsByItem`, `saveSalonQueue`, `getSalonQueue`, `updateSalonQueueItem`, `clearSalonQueue`, `saveFormData`, `getFormData`, `clearFormData`, `saveToken`, `getToken`, `isTokenValid`, `syncWithServer`
  - `services/db.js` exclusive: `getAllBeverages`, `getBeverage`, `saveBeverage`, `deleteBeverage`, `getAllIngredients`, `getIngredient`, `saveIngredient`, `deleteIngredient`, `addToSyncQueue`

- [ ] **E1.3** — Migrar funções de Inventory helpers para módulo próprio (`src/services/inventorySync.js`)
  - `operationTargetsInventoryEntity`, `getInventorySyncStatusSummary`, `getFailedInventoryEntityIds`, `retrySyncOperationsByEntity`, `retrySyncOperationsByItem`

- [ ] **E1.4** — Migrar funções de auth para o módulo de auth existente (`src/utils/auth.js`)
  - `saveToken`, `getToken`, `isTokenValid`

- [ ] **E1.5** — Migrar funções de form-data para módulo próprio ou manter onde são usadas

- [ ] **E1.6** — Migrar funções de sync queue legado para `services/syncService.js`
  - `saveSyncQueue`, `getSyncQueue`, `updateSyncQueueItem`, `clearSyncQueue`

- [ ] **E1.7** — Unificar `services/db.js` com funções de Salon queue migradas
  - `saveSalonQueue`, `getSalonQueue`, `updateSalonQueueItem`, `clearSalonQueue`

- [ ] **E1.8** — Adicionar funções CRUD genéricas em `services/db.js` se necessário
  - `saveData`, `getAllData`, `getDataById`, `deleteData` (usadas em alguns lugares)

- [ ] **E1.9** — Redirecionar todos os imports para `services/db` (ou módulo apropriado)

- [ ] **E1.10** — Deprecar `utils/db.js` com comentário no topo do arquivo

- [ ] **E1.11** — Rodar `yarn test` e `yarn build` no frontend para validar

- [ ] **E1.12** — Rodar testes offline manuais (criar beverage offline, sync, verificar)

- [ ] **E1.13** — Remover `utils/db.js` após confirmação de que nada mais importa dele

---

## E2 — Blacklist de Tokens Persistente (P1)

### Problema

`barchef-be/middlewares/tokenBlacklist.js` usa um `Set` em memória:

```js
const tokenBlacklist = new Set();
```

**Riscos:**
- Reinicialização do servidor (deploy, crash, restart) **invalida todos os logouts**
- Tokens de usuários desativados continuam válidos até expiração do JWT
- Em ambientes serverless (Vercel), a blacklist é efêmera por instância

### Estratégia

A solução mais simples e de menor acoplamento é usar **uma coleção MongoDB** (`tokenBlacklist`) em vez de Redis. O MongoDB já é dependência do projeto, então não adiciona infraestrutura nova. Cada token blacklistado armazena:
- `token`: hash do token (nunca o token bruto)
- `expiresAt`: TTL para limpeza automática
- `createdAt`: timestamp

### Backlog

- [ ] **E2.1** — Criar `models/tokenBlacklistModel.js` com Mongoose
  ```js
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now }
  }
  ```

- [ ] **E2.2** — Modificar `middlewares/tokenBlacklist.js` para usar MongoDB
  - `addToken(token)`: hashear token, salvar com `expiresAt` baseado no JWT
  - `isTokenBlacklisted(token)`: hashear token, buscar no MongoDB

- [ ] **E2.3** — Adicionar TTL index no MongoDB para expiração automática
  - `expiresAt` com `expireAfterSeconds: 0`

- [ ] **E2.4** — Adicionar graceful fallback: se MongoDB estiver indisponível, usar `Set` em memória como fallback loggado

- [ ] **E2.5** — Rodar `yarn test` no backend para validar

- [ ] **E2.6** — Testar fluxo completo: login → logout → tentar usar token → 401

---

## E3 — Service Layer (P1)

### Problema

O diretório `barchef-be/service/` existe mas está **vazio**. Toda lógica de negócio está nos controllers.

**Sintomas observados:**
- `controllers/commandController.js` contém regras de validação, cálculo de totais, lógica de estoque
- `controllers/tableController.js` contém regras de transição de estado
- Reuso de lógica entre controllers exige duplicação ou importação circular
- Testes de unidade para regras de negócio são difíceis de escrever sem chamar HTTP

### Estratégia

Extrair gradualmente as regras de negócio dos controllers para serviços, começando pelos domínios mais críticos (Command, Shift). Manter controllers enxutos (só parsing de request/response e delegação).

### Backlog

- [ ] **E3.1** — Auditar controllers e identificar blocos de lógica de negócio extraíveis

- [ ] **E3.2** — Criar `service/commandService.js`
  - Migrar de `commandController.js`: cálculo de subtotal/tax/total, validação de itens, regras de estoque
  - Manter `utils/commandRules.js` como helpers puros (sem efeito colateral)

- [ ] **E3.3** — Criar `service/shiftService.js`
  - Migrar de `shiftController.js`: agregação de totais, regras de abertura/fechamento
  - Manter `utils/shiftRules.js` como helpers puros

- [ ] **E3.4** — Criar `service/tableService.js`
  - Migrar de `tableController.js`: regras de transição de estado (free→occupied→closing→free)

- [ ] **E3.5** — Criar `service/beverageService.js`
  - Migrar de `beverageController.js`: lógica de history, dedução de estoque

- [ ] **E3.6** — Criar `service/userService.js`
  - Migrar de `userController.js`: lógica de invitation, hash, bootstrap

- [ ] **E3.7** — Criar `service/ingredientService.js`
  - Migrar de `ingredientController.js`: lógica de history

- [ ] **E3.8** — Refatorar controllers para delegar aos serviços

- [ ] **E3.9** — Verificar que rotas e contratos de API não mudaram

- [ ] **E3.10** — Rodar `yarn test` e testar manualmente fluxos críticos (login, CRUD bebidas, salão)

---

## E4 — Docker para Desenvolvimento Local (P2)

### Problema

O onboarding de novas pessoas desenvolvedoras requer:
1. Instalar Node.js (versão específica)
2. Instalar MongoDB (versão específica)
3. Configurar variáveis de ambiente
4. Garantir que o MongoDB está rodando na porta certa

**Sintomas:**
- Sem Docker, cada pessoa tem um setup diferente
- Dúvidas frequentes sobre "o MongoDB não conecta"
- Sem padronização de versões

### Estratégia

Criar `docker-compose.yml` na raiz do monorepo com serviços de MongoDB e as aplicações Node (backend + frontend opcional). Não alterar o fluxo de desenvolvimento existente — Docker é aditivo, não substitutivo.

### Backlog

- [ ] **E4.1** — Criar `docker-compose.yml` na raiz
  - Serviço `mongodb`: imagem `mongo:7`, porta `27017`, volume persistente
  - Serviço `backend`: build do `barchef-be`, porta `7777`, depende de mongodb, env vars
  - Serviço `frontend`: build do `barchef-fe`, porta `5173`, depende de backend

- [ ] **E4.2** — Criar `barchef-be/Dockerfile`
  - `node:20-alpine`, `yarn install`, `yarn start`

- [ ] **E4.3** — Criar `barchef-fe/Dockerfile`
  - `node:20-alpine`, `yarn install`, `yarn dev --host`

- [ ] **E4.4** — Atualizar `barchef-be/.env.example` com valores default para Docker
  - `MONGODB_URL=mongodb://mongodb:27017/barchef`

- [ ] **E4.5** — Adicionar seção "Docker Setup" no README (se existir) ou CONTEXT.md

- [ ] **E4.6** — Verificar que `yarn test` roda dentro do container

---

## E5 — Yarn Workspaces para Dev Local (P2)

### Contexto

Os repositórios são **separados por design**: frontend deployado na Vercel, backend na Render. Isso **não vai mudar**. O problema é que não há integração entre eles no ambiente local.

### Problema

```
BarChef/
├── barchef-be/   ← git remote → github.com/andrelobo/sarara_be.git
├── barchef-fe/   ← git remote → github.com/andrelobo/sarara_fe.git
```

- `yarn install` na raiz não instala nada (falta package.json)
- Cada subprojeto precisa ser instalado separadamente
- Scripts de dev/test exigem `cd barchef-be && yarn dev`

### Estratégia

Adicionar Yarn Workspaces **apenas para desenvolvimento local**, sem unificar repositórios Git nem afetar deploy. Cada subprojeto mantém seu próprio remote e CI/CD independente.

### Backlog

- [ ] **E5.1** — Criar `package.json` na raiz com `workspaces`
  ```json
  {
    "name": "barchef",
    "private": true,
    "workspaces": ["barchef-be", "barchef-fe"],
    "scripts": {
      "dev:be": "yarn workspace barchef-be dev",
      "dev:fe": "yarn workspace barchef-fe dev",
      "test": "yarn workspaces run test",
      "build:fe": "yarn workspace barchef-fe build"
    }
  }
  ```

- [ ] **E5.2** — Verificar que `yarn install` na raiz instala dependências de ambos

- [ ] **E5.3** — Verificar que deploy no Vercel (frontend) e Render (backend) continuam funcionando
  - Cada subprojeto tem seu próprio `vercel.json`/`Procfile` — workspaces não afetam deploy

- [ ] **E5.4** — Adicionar `.gitignore` na raiz (node_modules, .env) se não existir

---

## Prioridade Geral

| Épico | Prioridade | Esforço | Impacto | Depende de |
|-------|-----------|---------|---------|-----------|
| E1 — Unificar offline | P0 | Alto | Crítico (bugs em produção potencial) | Nenhuma |
| E2 — Blacklist persistente | P1 | Médio | Alto (segurança pós-restart) | Nenhuma |
| E3 — Service layer | P1 | Alto | Médio (manutenibilidade) | Nenhuma |
| E4 — Docker | P2 | Baixo | Baixo (onboarding) | Nenhuma |
| E5 — Yarn Workspaces | P2 | Baixo | Baixo (dev experience local) | Nenhuma |

## Sprint Sequence Recomendada

### Sprint 1 — Offline + Blacklist
- E1.1 a E1.7 (auditoria e migração das funções auxiliares)
- E2.1 a E2.4 (modelo + middleware MongoDB)

### Sprint 2 — Offline (finalização) + Service Layer início
- E1.8 a E1.13 (redirecionar imports, remover duplicação)
- E3.1 a E3.3 (CommandService + ShiftService)

### Sprint 3 — Service Layer + Docker
- E3.4 a E3.10 (demais services, refatorar controllers)
- E4.1 a E4.6 (Docker)

### Sprint 4 — Docker + Workspaces
- E4.1 a E4.6 (Docker)
- E5.1 a E5.4 (Yarn Workspaces)

## Guardrails

- Sem quebrar, sem regredir, 1 coisa de cada vez
- `yarn test` deve passar em cada PR
- `yarn build` no frontend deve passar em cada PR
- Login, RBAC, inventário e salão existentes não podem regredir
- Cada épico deve ser deployável de forma independente
- Se uma refatoração ficar grande demais, quebrar em PRs menores
