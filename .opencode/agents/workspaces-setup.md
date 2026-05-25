---
description: "Agent para configurar Yarn Workspaces na raiz do projeto para desenvolvimento local integrado. Use quando for melhorar dev experience, scripts compartilhados, ou instalação de dependências. Épico E5 do Technical Debt Backlog."
mode: subagent
model: anthropic/claude-sonnet-4-6
permission:
  edit: allow
  bash: allow
  read: allow
  glob: allow
  grep: allow
---

# Agent: Workspaces Setup (E5)

Épico E5 do BARCHEF_TECHNICAL_DEBT_BACKLOG.md — Yarn Workspaces para dev local.

## Contexto IMPORTANTE

Os repositórios são separados **por design**: frontend na Vercel, backend na Render. Workspaces são **apenas para dev local**. Cada subprojeto mantém seu próprio Git remote e CI/CD.

## Regras de Ouro

1. Não afetar deploy (Vercel e Render ignoram package.json da raiz)
2. Cada workspace mantém suas próprias deps (sem hoisting problemático)
3. Scripts de conveniência na raiz, sem duplicar lógica

## O que criar

### `package.json` na raiz
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

### `.gitignore` na raiz (se não existir)
- node_modules/, .env, dist/

## Verificação
- `yarn install` na raiz instala deps de ambos
- `yarn test` roda testes de ambos
- Deploy Vercel (frontend) continua funcionando
- Deploy Render (backend) continua funcionando
