# Agente: Unificação Offline (E1)

**Épico:** E1 — Unificar `utils/db.js` e `services/db.js`
**Prioridade:** P0
**Escopo:** Frontend (`barchef-fe/src/`)

## Missão

Unificar as duas camadas de IndexedDB que coexistem no frontend:
- `src/utils/db.js` (API genérica + helpers de sync/auth/form)
- `src/services/db.js` (API específica por entidade)

## Regras

1. **Não quebrar nada existente.** Login, beverages, ingredients, tables, commands, sync — tudo precisa continuar funcionando.
2. **1 coisa de cada vez.** Cada PR deve ser pequeno e deployável.
3. **Rodar `yarn test` e `yarn build`** antes de cada PR.
4. Não mudar o schema do IndexedDB (mesmo `DB_NAME`, `DB_VERSION`, stores).

## Estratégia

### Passo 1 — Auditar imports
```bash
grep -r "from.*utils/db" src/
grep -r "from.*services/db" src/
```

### Passo 2 — Migrar helpers para módulos dedicados
- Helpers de inventory sync → `src/services/inventorySync.js`
- Helpers de auth → `src/utils/auth.js` (já existe, só adicionar funções)
- Helpers de form-data → manter no local de uso ou migrar
- Sync queue legado → `src/services/syncService.js`

### Passo 3 — Migrar Salon queue para `services/db.js`
Adicionar `saveSalonQueue`, `getSalonQueue`, `updateSalonQueueItem`, `clearSalonQueue` em `services/db.js`.

### Passo 4 — Migrar CRUD genérico
Adicionar `saveData`, `getAllData`, `getDataById`, `deleteData` em `services/db.js` se ainda houver imports.

### Passo 5 — Redirecionar imports
Atualizar todos os arquivos que importam de `utils/db` para importar de `services/db` ou do módulo apropriado.

### Passo 6 — Deprecar e remover
Adicionar warning em `utils/db.js`. Após confirmar que nada mais importa, remover o arquivo.

## Arquivos afetados (auditoria inicial)
- `src/utils/db.js` — será removido
- `src/services/db.js` — receberá funções migradas
- `src/services/syncService.js` — receberá sync queue legado
- `src/workers/dbWorker.js` — verificar imports
- `src/context/OfflineContext.jsx` — verificar imports
- `src/components/SyncManager.jsx` — verificar imports
- `src/components/BeveragesList.jsx` — verificar imports
- `src/components/IngredientsList.jsx` — verificar imports
- `src/utils/useOfflineData.js` — verificar imports
- `src/hooks/useOfflineData.jsx` — verificar imports

## Verificação
- `yarn test` passa
- `yarn build` passa
- Criar beverage offline → sync → verificar no backend
- Criar mesa offline → sync → verificar no backend
- Login offline → verificar token salvo
