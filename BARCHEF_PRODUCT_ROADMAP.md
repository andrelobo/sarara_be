# BarChef Product Roadmap

Last updated: 2026-05-22

## Current Stabilization Track

Objetivo imediato:
- consolidar a fase atual do Salon com testes automatizados leves
- proteger regras operacionais criticas antes de expandir offline e realtime

Estado implantado agora:
- backend com `node:test` cobrindo regras puras do Salon em `tests/commandRules.test.js`
- frontend com `node:test` cobrindo helpers de atribuicao operacional em `src/utils/salonAssignment.test.js`
- frontend com a primeira base local de `Offline Salon`:
  - stores `tables`, `commands` e `salon-queue`
  - fallback local para leitura de mesas e comandas
  - operacoes locais de mesa/comanda persistidas em fila dedicada
  - replay inicial da `salon-queue` para o backend via fluxo compartilhado de sincronizacao

## Next Phase: Offline Salon

Objetivo:
transformar o modulo Salon em uma operacao tolerante a falhas de conectividade, mantendo o inventario atual sem regressao.

Escopo:
- mesas offline
- comandas offline
- queue operacional

Slices recomendados:
1. persistencia local de mesas abertas e comandas em IndexedDB
2. fila operacional local para abrir mesa, criar comanda, adicionar item, atualizar status e fechar/cancelar
3. reconciliacao com o backend usando ids temporarios e estrategia de conflito
4. feedback visual por mesa/comanda para estados offline, pendente e sincronizado

Critérios de saida:
- operador consegue abrir mesa e montar comanda sem conexao
- fila local preserva ordem operacional
- sincronizacao nao duplica itens nem fecha a mesa errada

## Parallel Business Phase: Waiter Cash Reconciliation

Objetivo:
resolver a dor operacional de fechamento por garcom, onde o gerente tambem atua como caixa e precisa bater pix, cartao e dinheiro um a um.

Escopo:
- fechamento por garcom
- conferencia com gerente
- totais por metodo
- divergencia de caixa
- comissao diaria

Slices recomendados:
1. registrar pagamentos reais nas comandas usando `payments[]`
2. criar turno do garcom
3. criar fechamento e reconciliacao por garcom
4. gerar ledger de comissao com base no fechamento aprovado

Critérios de saida:
- o sistema sabe quanto cada garcom deveria entregar
- o gerente consegue reconciliar um garcom por vez
- sobra e falta ficam registradas
- comissao diaria nasce de vendas conciliadas

## Later Phase: Realtime

Objetivo:
dar visibilidade operacional em tempo real para salao, cozinha e gestao.

Escopo:
- websocket
- cozinha
- painel salao

Slices recomendados:
1. stream de eventos de mesa/comanda
2. atualizacao em tempo real da grade de mesas
3. painel de cozinha com status operacional
4. painel de salao para acompanhamento de atendimento e gargalos

Critérios de saida:
- mudancas de comanda refletem nos clientes conectados sem refresh manual
- cozinha recebe novos itens e transicoes em tempo real
- o salao enxerga gargalos por mesa e por comanda

## Later Phase: Intelligence Layer

Objetivo:
converter a operacao em leitura gerencial e previsao acionavel.

Escopo:
- analytics
- previsao
- consumo
- perdas
- performance operacional

Slices recomendados:
1. indicadores de consumo por bebida, categoria e turno
2. leitura de perdas e cancelamentos por mesa/comanda
3. previsao de ruptura e reposicao
4. performance operacional por garcom, faixa horaria e mesa
5. paineis analiticos orientados a decisao

Critérios de saida:
- historico operacional alimenta dashboards confiaveis
- previsoes usam dados reais de consumo e ruptura
- a camada de inteligencia ajuda a decidir compra, escala e operacao

## Guardrails

- Sem quebrar, sem regredir, 1 coisa de cada vez!
- nao mudar contratos entre frontend e backend sem necessidade explicita
- fechar testes da fase atual antes de abrir a proxima camada sistemica
