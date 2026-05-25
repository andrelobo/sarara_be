# BarChef Waiter Cash Reconciliation Backlog

Last updated: 2026-05-23

## Executive Summary

BarChef already supports:
- tables
- commands
- waiter assignment
- command close
- embedded `payments[]` on commands

What the product still does not solve is the daily money-handling pain of the house:
- waiters receive with pix, debit, credit, and cash
- the manager also acts as cashier
- the manager must reconcile one waiter at a time
- daily workers need commission calculated from validated turnover

The correct next operational module is:

> waiter cash reconciliation + daily commissions

This module should sit on top of the current Salon/Command foundation, not replace it.

## Pain To Solve

Today the operation still lacks:
- structured payment capture at command close
- shift control per waiter
- reconciliation between `expected` and `declared` values
- manager approval per waiter closeout
- commission calculation from reconciled results

The system should answer these questions:
- how much each waiter sold today
- how much each waiter received by method
- how much cash each waiter should physically deliver
- whether there was shortage or overage
- what commission is owed after reconciliation

## MVP Scope

The first implementation cut should cover:
- command payment registration
- waiter shift open/close
- waiter cash close per shift
- manager reconciliation per waiter
- commission ledger generated from reconciled turnover

Do not start with:
- TEF integration
- bank integration
- fiscal automation
- acquirer APIs

## Domain Additions

### 1. Command Payment Enrichment

Current base already exists:
- `commands.payments[]`

MVP target fields per payment entry:
- `method`
- `amount`
- `paidAt`
- `receivedBy`
- `machineLabel`
- `referenceCode`
- `notes`

Suggested payment methods:
- `cash`
- `pix`
- `debit`
- `credit`
- `voucher`

Optional follow-up:
- support split payments in the same command

### 2. Shift

Represents the waiter working window used for operational reconciliation.

Suggested fields:
- `waiterId`
- `openedBy`
- `openedAt`
- `closedAt`
- `status`
- `notes`

Suggested statuses:
- `open`
- `closing`
- `closed`
- `cancelled`

### 3. WaiterCashClose

Represents the one-by-one cashier/manager reconciliation for a waiter.

Suggested fields:
- `shiftId`
- `waiterId`
- `managerId`
- `status`
- `expected`
- `declared`
- `counted`
- `difference`
- `notes`
- `closedAt`
- `approvedAt`

Expected / declared / counted structure:
- `cash`
- `pix`
- `debit`
- `credit`
- `voucher`
- `total`

Suggested statuses:
- `pending`
- `declared`
- `under_review`
- `divergent`
- `approved`
- `reopened`

### 4. CommissionRule

Represents how a house calculates waiter commissions.

Suggested fields:
- `name`
- `active`
- `mode`
- `percentage`
- `appliesToMethods[]`
- `appliesToRole`
- `minimumNetTotal`

Suggested modes:
- `flat_percentage`
- `percentage_by_method`
- `fixed_daily`

### 5. CommissionLedger

Represents the result actually owed for a waiter after reconciliation.

Suggested fields:
- `shiftId`
- `waiterId`
- `cashCloseId`
- `ruleId`
- `baseAmount`
- `commissionAmount`
- `status`
- `generatedAt`
- `approvedBy`
- `notes`

Suggested statuses:
- `pending`
- `approved`
- `paid`
- `cancelled`

## Backend API Backlog

### Command Payment

- `POST /api/commands/:id/payments`
- `DELETE /api/commands/:id/payments/:paymentId`

Rules:
- only open commands can receive new payments
- command close should require payment registration or explicit zero-payment override
- total paid should be validated against command total in the reconciliation flow

### Shift

- `POST /api/shifts`
- `GET /api/shifts`
- `GET /api/shifts/:id`
- `POST /api/shifts/:id/close`

Rules:
- one open shift per waiter
- waiter can open own shift
- manager/admin can close with override

### Waiter Cash Close

- `POST /api/cash-closes`
- `GET /api/cash-closes`
- `GET /api/cash-closes/:id`
- `POST /api/cash-closes/:id/declare`
- `POST /api/cash-closes/:id/reconcile`
- `POST /api/cash-closes/:id/approve`
- `POST /api/cash-closes/:id/reopen`

Rules:
- waiter declares
- manager reconciles
- manager approves
- all changes stay audited

### Commission

- `POST /api/commission-rules`
- `GET /api/commission-rules`
- `PUT /api/commission-rules/:id`
- `POST /api/commission-ledger/generate`
- `GET /api/commission-ledger`
- `GET /api/commission-ledger/:id`

## Frontend Backlog

### Waiter Flow

- `Open shift`
- `Close command with payments`
- `View my shift totals`
- `Declare delivered cash and digital totals`

### Manager/Cashier Flow

- `Waiters in open shift`
- `Reconcile one waiter at a time`
- `Approve or flag divergence`
- `View daily commission summary`

### Recommended Screens

- `/salon/shifts/open`
- `/salon/shifts/:id`
- `/salon/cash-close/:id`
- `/salon/cash-close`
- `/salon/commissions`

## Calculation Rules

### Expected totals

System-calculated from:
- commands closed in the waiter shift
- payments attached to those commands

### Declared totals

Entered by the waiter:
- cash delivered
- pix received
- debit received
- credit received
- optional observations

### Counted totals

Entered or confirmed by the manager:
- cash physically counted
- digital totals checked against machine / pix proofs

### Difference

Formula:
- `difference = counted.total - expected.total`

Should also retain per-method difference:
- `difference.cash`
- `difference.pix`
- `difference.debit`
- `difference.credit`

### Commission base

Recommended first cut:
- commission calculated only from reconciled and approved turnover
- divergence does not erase history; it only changes approval state

## Suggested Sprint Sequence

### Sprint 1

- enrich `payments[]` on commands
- record `receivedBy`
- capture payment method at command close
- add backend validation and tests

Status on 2026-05-23:
- implemented in the current codebase as the first live slice
- `POST /api/commands/:id/close` now accepts structured `payments[]`
- backend now validates exact payment-total match for non-zero commands
- frontend `CommandView.jsx` now captures those payments before close
- offline `command_close` replay now forwards the same payment payload through `salon-queue`

### Sprint 2

- shift model and routes
- open/close shift flow
- waiter totals by shift

Status on 2026-05-24:
- implemented as the first live backend slice
- `Shift` now exists as a persisted domain with `waiterId`, `openedBy`, `closedBy`, `status`, `notes`, `totalsSnapshot`, and `auditTrail`
- backend now exposes:
  - `POST /api/shifts`
  - `GET /api/shifts`
  - `GET /api/shifts/:id`
  - `POST /api/shifts/:id/close`
- open-shift guard now blocks a second simultaneous shift for the same waiter
- shift close now snapshots totals aggregated from the waiter commands closed inside that shift window
- detail fetch now returns live totals for open shifts and the stored snapshot for closed shifts

### Sprint 3

- waiter declaration flow
- manager reconciliation flow
- divergence status and notes

### Sprint 4

- commission rule model
- commission ledger generation
- manager daily commission view

## Guardrails

- Sem quebrar, sem regredir, 1 coisa de cada vez!
- do not replace current command lifecycle
- do not break offline Salon work already in progress
- use current `payments[]` as the seed instead of inventing a parallel payment history
- manager remains a manager in RBAC, but can operate the cashier reconciliation screens
