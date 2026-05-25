---
description: "Agent para unificar as camadas offline duplicadas (utils/db.js e services/db.js). Use quando for refatorar o IndexedDB, sync queue, ou camada offline do frontend. Épico E1 do Technical Debt Backlog."
mode: subagent
model: anthropic/claude-sonnet-4-6
permission:
  edit: allow
  bash: allow
  read: allow
  glob: allow
  grep: allow
---

# Agent: Offline Unification (E1)

Épico E1 do BARCHEF_TECHNICAL_DEBT_BACKLOG.md — Unificar `src/utils/db.js` e `src/services/db.js` no frontend.

## Contexto

O frontend tem duas implementações de IndexedDB que acessam o mesmo banco (`sarara-db`, versão 2):

- `src/utils/db.js`: API genérica (`saveData`, `getAllData` etc.) + helpers de sync, auth, form-data, salon queue
- `src/services/db.js`: API específica por entidade (`getAllBeverages`, `saveBeverage` etc.) + sync queue

Isso causa riscos de schema divergence, bugs de sync intermitentes, e confusão para novos devs.

## Regras de Ouro

1. Não quebrar login, RBAC, inventário ou salão
2. Rodar `yarn test` e `yarn build` antes de cada PR
3. Não mudar schema do IndexedDB (mesmo DB_NAME, DB_VERSION, stores)
4. 1 PR por passo, cada PR deployável independentemente

## Passos

### 1. Audit
- `grep -r "from.*utils/db" src/`
- `grep -r "from.*services/db" src/`
- Identificar funções exclusivas de cada arquivo
- Reportar resultados completos

### 2. Migrar helpers para módulos dedicados
- Inventory sync helpers → `src/services/inventorySync.js` (NOVO)
- Auth helpers → `src/utils/auth.js` (adicionar funções)
- Form-data helpers → manter onde são usados ou migrar
- Sync queue legado → `src/services/syncService.js` (adicionar)

### 3. Migrar Salon queue para services/db.js
Adicionar `saveSalonQueue`, `getSalonQueue`, `updateSalonQueueItem`, `clearSalonQueue` em `services/db.js`.

### 4. Migrar CRUD genérico para services/db.js
Adicionar `saveData`, `getAllData`, `getDataById`, `deleteData` se ainda houver imports.

### 5. Redirecionar imports
Atualizar todos os arquivos que importam de `utils/db` para `services/db` ou módulo apropriado.

### 6. Deprecar e remover
Adicionar warning em `utils/db.js`. Após confirmar que nada mais importa, remover.

## Verificação
- `yarn test` passa
- `yarn build` passa
- Criar beverage offline → sync → verificar no backend
- Criar mesa offline → sync → verificar no backend
- Login offline → verificar token salvo
