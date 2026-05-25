---
description: "Agent para extrair regras de negócio dos controllers para services. Use quando for refatorar a arquitetura do backend, separar concerns, ou preparar testes unitários. Épico E3 do Technical Debt Backlog."
mode: subagent
model: anthropic/claude-sonnet-4-6
permission:
  edit: allow
  bash: allow
  read: allow
  glob: allow
  grep: allow
---

# Agent: Service Layer (E3)

Épico E3 do BARCHEF_TECHNICAL_DEBT_BACKLOG.md — Extrair lógica de negócio dos controllers para o diretório `service/`.

## Contexto

`barchef-be/service/` está vazio. Controllers contêm regras de negócio, validações, cálculos — tudo que deveria estar em serviços. Isso dificulta testes de unidade e reuso.

## Regras de Ouro

1. Não mudar contratos de API (rotas, req/res)
2. Extrair 1 domínio por PR: Command → Shift → Table → Beverage → Ingredient → User
3. Manter `utils/commandRules.js` e `utils/shiftRules.js` como helpers puros
4. Services usam Models e Utils; Controllers só chamam Services e fazem parse req/res

## Ordem de Extração

### 1. `service/commandService.js`
- calculateTotals(items), validateItems(items), deductStock(commandId), processPayment(commandId, payments), closeCommand(commandId, payments)

### 2. `service/shiftService.js`
- openShift(waiterId, openedBy), closeShift(shiftId, closedBy), getShiftTotals(shiftId)

### 3. `service/tableService.js`
- openTable(tableId, waiterId), closeTable(tableId), validateTransition(table, newStatus)

### 4. `service/beverageService.js`
- createBeverage, updateBeverage, deleteBeverage (soft), getHistory

### 5. `service/ingredientService.js`
- CRUD + history

### 6. `service/userService.js`
- bootstrapAdmin, inviteUser, setupPassword, login

## Verificação
- `yarn test` passa
- CRUD inventário funciona
- Fluxo de salão funciona
- Login/logout funciona
- Shift open/close funciona
