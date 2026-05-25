# Agente: Yarn Workspaces (E5)

**Épico:** E5 — Yarn Workspaces para dev local
**Prioridade:** P2
**Escopo:** Raiz do projeto

## Missão

Adicionar Yarn Workspaces na raiz para que `yarn install` e `yarn test` funcionem de forma integrada, sem afetar os deploys separados (Vercel frontend, Render backend).

## Contexto

Os repositórios são separados **por design** (deploys em plataformas diferentes). Workspaces são **apenas para desenvolvimento local**. Cada subprojeto mantém seu próprio `package.json`, Git remote e pipeline de CI/CD.

## Regras

1. **Não afetar deploy.** Vercel e Render ignoram o package.json da raiz.
2. **Cada workspace mantém suas próprias dependências.** Sem hoisting problemático.
3. **Scripts de conveniência** na raiz, sem duplicar lógica dos subprojetos.

## Estratégia

### Passo 1 — `package.json` na raiz

```json
{
  "name": "barchef",
  "private": true,
  "workspaces": ["barchef-be", "barchef-fe"],
  "scripts": {
    "dev:be": "yarn workspace barchef-be dev",
    "dev:fe": "yarn workspace barchef-fe dev",
    "test": "yarn workspaces run test",
    "test:be": "yarn workspace barchef-be test",
    "test:fe": "yarn workspace barchef-fe test",
    "build:fe": "yarn workspace barchef-fe build"
  }
}
```

### Passo 2 — Verificar instalação
```bash
yarn install   # na raiz
# Deve instalar dependências de barchef-be e barchef-fe
```

### Passo 3 — Verificar scripts
```bash
yarn test      # roda testes de ambos
yarn dev:be    # sobe backend
yarn dev:fe    # sobe frontend
```

### Passo 4 — Verificar deploy
- Vercel (frontend): usa `barchef-fe/package.json` → não afetado
- Render (backend): usa `barchef-be/Procfile` → não afetado
- CI/CD de cada um: aponta para o diretório específico → não afetado

### Passo 5 — `.gitignore` na raiz (se não existir)
```
node_modules/
.env
dist/
```

## Arquivos afetados
- `package.json` — NOVO (raiz)
- `.gitignore` — NOVO (raiz, se não existir)

## Verificação
- `yarn install` na raiz funciona
- `yarn test` roda testes de ambos os projetos
- Deploy no Vercel continua funcionando
- Deploy no Render continua funcionando
