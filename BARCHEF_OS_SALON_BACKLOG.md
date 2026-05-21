# BARCHEF_OS_SALON_BACKLOG.md

Last updated: 2026-05-21

## Executive Summary

The BarChef codebase already has the first Salon implementation in place, but the module is still incomplete.

What is already in place:
- frontend authentication and route protection
- backend JWT auth and RBAC
- admin user management
- inventory CRUD
- offline IndexedDB infrastructure
- sync queue infrastructure
- PWA build pipeline
- `tables` backend domain
- `commands` backend domain
- Salon frontend routes and initial UI

What is not in place yet:
- no offline stores for tables/commands
- no command sync flow
- no richer command/table analytics

The right conclusion is:

> the platform foundations are ready and the first Salon/Table/Command flows already exist, but offline, inventory integration and operational hardening are still backlog work.

---

## Current Status By Area

### Already Ready

#### Backend

- Auth middleware and Bearer token flow are active
- RBAC base is active
- user roles already exist: `admin`, `manager`, `waiter`
- inventory routes are protected
- backend routes currently boot successfully

Current live backend domains found in code:
- `users`
- `beverages`
- `ingredients`
- `tables`
- `commands`

#### Frontend

- route guard exists in `src/App.jsx`
- login/session persistence exists
- current user roles are used in UI protection
- PWA/offline shell exists
- frontend production build passes locally

Current live frontend areas found in code:
- login
- user management
- beverages
- ingredients
- beverage history
- Salon dashboard
- tables grid
- table detail
- command detail

### Partial Foundations

- offline infrastructure exists, but is still specialized around `beverages` and `ingredients`
- sync queue exists, but is not yet generalized for Salon operations
- worker persistence exists, but only knows inventory entities
- current waiter role model now works for Salon operational writes, but not yet for Salon offline sync

### Missing Salon Features

#### Offline Missing

- IndexedDB stores for tables
- IndexedDB stores for commands
- IndexedDB persistence for command items
- sync queue entity handling for tables/commands
- pending sync UI states for Salon operations

#### Inventory Integration Missing

- stock deduction rule for command items
- automatic reconciliation between product-linked command items and stock movement
- safe reconciliation between command close/cancel and inventory movement

#### Operational Hardening Missing

- dedicated filtering/reporting layer for audit trails
- stronger analytics for operational reports

---

## Recommended Backlog

### P0 - Protect The Base Before Salon

- [x] Consolidate the Salon backlog assumptions with current RBAC:
  waiter should be able to open tables, create commands and add items without receiving inventory write permissions.
- [x] Decide the stock integration rule:
  discount linked beverage items only when the command closes.
- [x] Preserve existing inventory flows as non-breaking baseline.
- [x] Keep Salon implementation incremental with no framework migration.

### P1 - Backend Salon Domain

- [x] Add `models/tableModel.js`
  fields:
  - `number`
  - `name`
  - `status`
  - `openedAt`
  - `closedAt`
  - `currentCommandId`
  - `waiterId`
  - `deletedAt`

- [x] Add `models/commandModel.js`
  fields:
  - `tableId`
  - `waiterId`
  - `status`
  - `items[]`
  - `subtotal`
  - `serviceTax`
  - `total`
  - `openedAt`
  - `closedAt`
  - `payments[]`
  - `syncMetadata`

- [x] Add backend statuses and validation rules:
  - table: `free | occupied | closing | reserved`
  - command: `open | closed | cancelled`
  - command item: `pending | preparing | delivered | cancelled`

- [x] Add `controllers/tableController.js`
- [x] Add `controllers/commandController.js`
- [x] Add `routes/tableRoutes.js`
- [x] Add `routes/commandRoutes.js`
- [x] Mount new routes in `app.js`

- [x] Implement routes:
  - `POST /api/tables`
  - `GET /api/tables`
  - `GET /api/tables/:id`
  - `PUT /api/tables/:id`
  - `DELETE /api/tables/:id`
  - `POST /api/tables/:id/open`
  - `POST /api/tables/:id/close`
  - `POST /api/commands`
  - `GET /api/commands`
  - `GET /api/commands/:id`
  - `POST /api/commands/:id/items`
  - `PATCH /api/commands/:id/items/:itemId`
  - `POST /api/commands/:id/close`
  - `POST /api/commands/:id/cancel`

### P2 - RBAC For Salon Operations

- [x] Extend `constants/userAccess.js` with Salon-specific permissions
- [x] Keep inventory write permission separate from Salon operational permission
- [x] Recommended first cut:
  - `admin`: full Salon access
  - `manager`: full Salon access
  - `waiter`: table open/close, command create/read/update, command item add/update

### P3 - Frontend Salon Skeleton

- [x] Add routes in `src/App.jsx`
  - `/salon`
  - `/salon/tables`
  - `/salon/tables/:id`
  - `/salon/commands/:id`

- [x] Add initial components:
  - `SalonDashboard.jsx`
  - `TablesGrid.jsx`
  - `TableCard.jsx`
  - `TableDetail.jsx`
  - `CommandView.jsx`
  - `AddCommandItemModal.jsx`

- [x] Add Salon navigation entry in `Nav.jsx`
- [x] Protect Salon routes by role
- [x] Preserve mobile-first interaction from the start

### P4 - Minimal Salon Offline Layer

- [ ] Add IndexedDB stores for:
  - `tables`
  - `commands`

- [ ] Extend sync queue payloads for Salon entities
- [ ] Extend `dbWorker.js` to persist and retrieve Salon entities
- [ ] Mark pending local operations with visible UI state
- [ ] Keep initial sync strategy simple:
  - create/update queue
  - retry later
  - no advanced conflict resolution yet

### P5 - Inventory Integration

- [x] Define the first mapping boundary for command items and inventory:
  beverage selection from existing inventory is the first implementation cut
- [x] Add first `productType` and `productId` usage rules for product-linked command items
- [x] Apply the first stock movement rule:
  beverage-linked items deduct stock only when the command closes
- [ ] Define snapshot strategy:
  - name snapshot
  - price snapshot
  - quantity snapshot if needed
- [x] Decide first implementation boundary:
  - read-only product selection from beverage inventory first
  - ingredients integration later if needed

### P6 - Operational Hardening

- [x] Add audit/history for table lifecycle transitions
- [x] Add audit/history for command state changes
- [x] Add safe command lifecycle consistency for create/close/cancel when transaction support is available
- [ ] Review logout blacklist strategy later
- [ ] Review Swagger coverage after Salon routes exist

---

## Suggested Sprint Sequence

### Sprint 1

- backend table model + routes
- backend command model + routes
- minimal RBAC for Salon
- frontend Salon route skeleton
- table list and table detail

### Sprint 2

- create/open/close tables in UI
- create command from table
- add command items
- mobile waiter flow

### Sprint 3

- minimal offline persistence for tables/commands
- sync queue for Salon operations
- pending sync UI states

### Sprint 4

- inventory integration
- audit trails
- operational analytics
