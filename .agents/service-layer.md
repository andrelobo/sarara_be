# Agente: Service Layer (E3)

**Épico:** E3 — Extrair regras de negócio dos controllers para services
**Prioridade:** P1
**Escopo:** Backend (`barchef-be/`)

## Missão

O diretório `barchef-be/service/` está vazio. Toda lógica de negócio está nos controllers. Extrair para serviços dedicados, deixando controllers responsáveis apenas por parsing de request/response e delegação.

## Regras

1. **Não mudar contratos de API.** Nenhuma rota existente muda de assinatura.
2. **Extrair gradualmente.** 1 domínio por PR. Começar pelos mais críticos (Command, Shift).
3. **Manter `utils/commandRules.js` e `utils/shiftRules.js`** como helpers puros (funções sem side effect).
4. **Services podem usar models e utils.** Controllers só chamam services (e fazem parse de req/res).

## Estratégia

### Domínios (por ordem)

1. **Command** → `service/commandService.js`
   - `calculateTotals(items)`: subtotal, serviceTax (10%), total
   - `validateItems(items, session)`: verificar bebidas existentes, estoque
   - `deductStock(commandId)`: deduzir estoque no fechamento
   - `processPayment(commandId, payments)`: validar pagamentos
   - `closeCommand(commandId, payments)`: orquestrar fechamento
   - Controlador chama service, service retorna resultado ou lança erro

2. **Shift** → `service/shiftService.js`
   - `openShift(waiterId, openedBy)`: abrir turno, validar duplicidade
   - `closeShift(shiftId, closedBy)`: fechar turno, agregar totais
   - `getShiftTotals(shiftId)`: totais ao vivo ou snapshot

3. **Table** → `service/tableService.js`
   - `openTable(tableId, waiterId)`: transição free→occupied
   - `closeTable(tableId)`: transição occupied→free
   - `validateTransition(table, newStatus)`: regras de estado

4. **Beverage** → `service/beverageService.js`
   - `createBeverage(data)`: criar com validações
   - `updateBeverage(id, data)`: atualizar com history
   - `deleteBeverage(id)`: soft delete
   - `getHistory(id)`: buscar histórico

5. **Ingredient** → `service/ingredientService.js`
   - Similar a beverage

6. **User** → `service/userService.js`
   - `bootstrapAdmin(data)`: criar primeiro admin
   - `inviteUser(data, invitedBy)`: criar convite
   - `setupPassword(token, password)`: aceitar convite
   - `login(email, password)`: autenticar

### Passos para cada domínio

1. Criar `service/<domain>Service.js`
2. Mover funções do controller para o service
3. Refatorar controller para importar e chamar service
4. Verificar que rotas funcionam (teste manual ou `yarn test`)
5. Commit

## Arquivos afetados
- `service/commandService.js` — NOVO
- `service/shiftService.js` — NOVO
- `service/tableService.js` — NOVO
- `service/beverageService.js` — NOVO
- `service/ingredientService.js` — NOVO
- `service/userService.js` — NOVO
- `controllers/*.js` — MODIFICADOS (reduzidos)

## Verificação
- `yarn test` passa
- CRUD bebidas/ingredientes funciona (API existente)
- Fluxo de salão (mesas, comandas) funciona
- Login/logout/setup funciona
- Shift open/close funciona
