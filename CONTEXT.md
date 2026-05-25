# BarChef Backend Context

Last updated: 2026-05-23

## Identity

- Repository: `https://github.com/andrelobo/sarara_be.git`
- Runtime: Node.js + Express + MongoDB (Mongoose)
- Deployment target in code/config: Vercel
- Production base URL: `https://sarara-be.vercel.app`
- Production availability verified on 2026-05-20:
  - `GET /` returned HTTP `200`
  - `GET /api-docs` returned HTTP `301` redirect to `/api-docs/`
- Operational deployment workflow in practice: pushes to `origin/main` on GitHub trigger the connected automatic deploys.

## Entry Points

- Main server entry: `app.js`
- Primary route groups:
  - `/api/users`
  - `/api/ingredients`
  - `/api/beverages`
- Vercel routing: [vercel.json](/home/lobo/Área%20de%20trabalho/KODE/BarChef/barchef-be/vercel.json:1) sends all requests to `app.js`
- Alternate process entry for non-Vercel platforms: [Procfile](/home/lobo/Área%20de%20trabalho/KODE/BarChef/barchef-be/Procfile:1)

## Runtime Shape

- HTTP middleware in `app.js`:
  - `cors`
  - `express.json()`
  - `compression`
  - `helmet`
  - `morgan`
- MongoDB connection is established at startup through `process.env.MONGODB_URL`
- If MongoDB connection fails, the process exits immediately
- Swagger UI is exposed at `/api-docs`

## Data Model

### Users

- Core fields: `username`, `email`, `password`, `role`, `status`
- Supported roles: `admin`, `manager`, `waiter`
- Supported statuses: `pending`, `active`, `disabled`
- Invitation flow stores `invitationTokenHash`, `invitationExpiresAt`, `invitationSentAt`, `invitationAcceptedAt`, `invitedBy`
- Password is hashed with `bcrypt`
- Password and invitation secrets are excluded by default from queries
- Login returns a JWT access token plus the sanitized user payload with permissions

### Ingredients

- Core fields: `name`, `category`, `quantity`, `unit`
- Optional fields: `unitOfMeasurement`, `flavorProfile`, `shelfLife`, `properties`
- Maintains per-item stock history in the same document

### Beverages

- Core fields: `name`, `category`, `quantity`, `unit`
- Maintains embedded history entries for stock changes and deletes
- Graph/report routes aggregate embedded history directly from MongoDB

### Tables

- Core fields: `number`, `name`, `status`, `openedAt`, `closedAt`
- Additional operational fields: `currentCommandId`, `waiterId`, `deletedAt`
- Supported statuses: `free`, `occupied`, `closing`, `reserved`
- Uses logical deletion through `deletedAt`
- Keeps an embedded `auditTrail[]` for lifecycle events

### Commands

- Core fields: `tableId`, `waiterId`, `status`, `items`, `subtotal`, `serviceTax`, `total`
- Additional operational fields: `openedAt`, `closedAt`, `payments`, `syncMetadata`
- Supported command statuses: `open`, `closed`, `cancelled`
- Supported command item statuses: `pending`, `preparing`, `delivered`, `cancelled`
- Supported payment methods inside `payments[]`: `cash`, `pix`, `debit`, `credit`, `voucher`
- Commands are linked to tables and update `currentCommandId` on the table document
- Keeps an embedded `auditTrail[]` for lifecycle and item events
- New command items can now be either:
  - `manual`
  - `beverage`
- When a command item references a beverage, the backend validates the beverage exists and snapshots its current name into `nameSnapshot`
- Command close now accepts structured `payments[]` in the request body and requires the informed payment total to match the command total for non-zero commands

### Shifts

- Core fields: `waiterId`, `openedBy`, `closedBy`, `openedAt`, `closedAt`, `status`
- Additional operational fields: `notes`, `totalsSnapshot`, `auditTrail`
- Supported shift statuses: `open`, `closed`, `cancelled`
- Closed shifts persist a `totalsSnapshot` with:
  - `commandsCount`
  - `paymentCount`
  - `salesTotal`
  - `serviceTaxTotal`
  - `payments.cash|pix|debit|credit|voucher|total`

## API Surface

### Users

- `POST /api/users/bootstrap-admin`
- `POST /api/users/login`
- `POST /api/users/setup-password`
- `GET /api/users/me`
- `POST /api/users/logout`
- `POST /api/users`
- `GET /api/users`
- `POST /api/users/:id/resend-invite`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Ingredients

- `POST /api/ingredients`
- `GET /api/ingredients`
- `GET /api/ingredients/:id`
- `PUT /api/ingredients/:id`
- `DELETE /api/ingredients/:id`
- `GET /api/ingredients/graphs/change-history`

### Tables

- `POST /api/tables`
- `GET /api/tables`
- `GET /api/tables/:id`
- `PUT /api/tables/:id`
- `DELETE /api/tables/:id`
- `POST /api/tables/:id/open`
- `POST /api/tables/:id/close`

### Commands

- `POST /api/commands`
- `GET /api/commands`
- `GET /api/commands/:id`
- `POST /api/commands/:id/items`
- `PATCH /api/commands/:id/items/:itemId`
- `POST /api/commands/:id/close`
- `POST /api/commands/:id/cancel`

### Shifts

- `POST /api/shifts`
- `GET /api/shifts`
- `GET /api/shifts/:id`
- `POST /api/shifts/:id/close`

### Beverages

- `POST /api/beverages`
- `GET /api/beverages`
- `GET /api/beverages/:id`
- `PUT /api/beverages/:id`
- `DELETE /api/beverages/:id`
- `GET /api/beverages/:id/history`
- `POST /api/beverages/:id/history`
- `GET /api/beverages/graphs/most-least-sold`
- `GET /api/beverages/graphs/never-sold`
- `GET /api/beverages/graphs/change-history`

## Environment

Expected environment variables observed in code/docs:

- `PORT`
- `MONGODB_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` optional, defaults to `*`
- `FRONTEND_URL` optional, defaults to `https://barchef-sarara.vercel.app`
- `INVITATION_TTL_HOURS` optional, defaults to `72`

## Integrations

- MongoDB via `mongoose`
- Activation link format is `${FRONTEND_URL}/setup-account?token=...`
- Canonical cross-phase roadmap is tracked in [BARCHEF_PRODUCT_ROADMAP.md](/home/lobo/Área%20de%20trabalho/KODE/BarChef/barchef-be/BARCHEF_PRODUCT_ROADMAP.md:1)
- Canonical backlog for waiter cash reconciliation and daily commissions is tracked in [BARCHEF_WAITER_CASH_RECONCILIATION_BACKLOG.md](/home/lobo/Área%20de%20trabalho/KODE/BarChef/barchef-be/BARCHEF_WAITER_CASH_RECONCILIATION_BACKLOG.md:1)

## Operational Notes

- `package.json` and `README.md` were realigned to the BarChef backend on 2026-05-20.
- Public user access is now limited to `bootstrap-admin`, `login`, and `setup-password`.
- `bootstrap-admin` is only expected to succeed before the first admin exists in the database; after that, the controller returns `403`.
- User-sensitive routes now require `Authorization: Bearer <token>`, and the middleware validates blacklist state before allowing access.
- Authenticated users are loaded from MongoDB on each request, and only `active` users may continue.
- User management is restricted to `admin`.
- Inventory read access is allowed for `admin`, `manager`, and `waiter`.
- Inventory write access is restricted to `admin` and `manager`.
- Table catalog write access is restricted to `admin` and `manager`.
- Table open/close operations are allowed for `admin`, `manager`, and `waiter`.
- Command creation and command item operations are allowed for `admin`, `manager`, and `waiter`.
- Logout blacklist is still in-memory only. Restarting the process clears the blacklist.
- JWT payload is now reduced to `userId`, instead of signing the full fetched user object.
- Beverage deletion is now soft delete via `deletedAt`, preserving embedded history entries for auditing while keeping deleted items out of normal list/detail queries.
- Minimal Salon backend work started on 2026-05-21 with the `tables` domain:
  - `models/tableModel.js`
  - `controllers/tableController.js`
  - `routes/tableRoutes.js`
  - `app.js` mount at `/api/tables`
- The Salon backend domain expanded on 2026-05-21 with `commands`:
  - `models/commandModel.js`
  - `controllers/commandController.js`
  - `routes/commandRoutes.js`
  - `app.js` mount at `/api/commands`
- Waiter-shift foundation started on 2026-05-24:
  - `models/shiftModel.js`
  - `controllers/shiftController.js`
  - `routes/shiftRoutes.js`
  - `utils/shiftRules.js`
  - `app.js` mount at `/api/shifts`
- Command creation, close, and cancel now use MongoDB transactions when the deployment supports them.
- In standalone environments without transaction support, the backend falls back to sequential execution to preserve local compatibility.
- Command close/cancel currently frees the linked table automatically.
- Tables now record embedded audit events such as create, update, open, close, delete, and command attach/release transitions.
- Commands now record embedded audit events such as create, item add/update, close, and cancel transitions.
- List endpoints for tables and commands exclude `auditTrail` to keep payloads lighter, while detail fetches still include it.
- Command items can now be linked to existing beverages through `productType=beverage` and `productId`.
- `commands.payments[]` is now the real seed for the waiter cash-reconciliation roadmap:
  - each payment stores `method`, `amount`, `paidAt`, `receivedBy`, `machineLabel`, `referenceCode`, and `notes`
  - command close now rejects non-zero commands without payment entries
  - command close now rejects payment totals that do not match the command total exactly
- This still does not solve waiter shift closing, cashier reconciliation, or daily commission logic by itself; it only establishes the payment ledger at command level.
- `POST /api/shifts` now opens one shift per waiter at a time:
  - waiter opens own shift
  - manager/admin can open a shift for a chosen waiter
- `POST /api/shifts/:id/close` now closes the shift and snapshots totals aggregated from closed commands in that waiter time window.
- `GET /api/shifts/:id` now returns live computed totals for open shifts and the stored snapshot for closed shifts.
- The current stock integration rule is:
  - beverage-linked items deduct stock when the command is closed
  - cancelled items do not deduct stock
  - command close is blocked when linked beverage stock is insufficient
- Admin onboarding supports two modes:
  - activation link with pending account activation
  - direct password definition by the admin
- Email delivery was removed from the active onboarding flow on 2026-05-20.
- The API now always returns the activation link directly when setup mode is `invite`.
- This makes the admin panel copy/share flow possible without email delivery or `curl`-only recovery work.
- Local route loading succeeded on 2026-05-20 after dependency installation by requiring:
  - `routes/userRoutes.js`
  - `routes/beverageRoutes.js`
  - `routes/ingredientRoutes.js`
- Local route loading also succeeded on 2026-05-21 for:
  - `routes/tableRoutes.js`
  - `routes/commandRoutes.js`
- A lightweight automated backend test base now exists with `node:test`:
  - `tests/commandRules.test.js`
  - `utils/commandRules.js`
- Shift foundation helpers are now also covered by:
  - `tests/shiftRules.test.js`
  - `utils/shiftRules.js`
- Local `yarn test` completed successfully on 2026-05-23 after adding structured payment validation for command close.
- Local `yarn test` also completed successfully on 2026-05-24 after adding the first `Shift` foundation and totals aggregation helpers.
- The canonical Salon/Table/Command backlog for backend planning is tracked in [BARCHEF_OS_SALON_BACKLOG.md](/home/lobo/Área%20de%20trabalho/KODE/BarChef/barchef-be/BARCHEF_OS_SALON_BACKLOG.md:1).
- Swagger UI is generated from `routes/*.js`. The checked-in `docs/swagger.yaml` exists, but `app.js` does not load that YAML file directly.

## Frontend Contract Assumptions

- The frontend is hardcoded to this production backend URL in multiple places: `https://sarara-be.vercel.app/api`
- There are already contract mismatches to watch:
  - backend exposes beverage history as `POST /api/beverages/:id/history`
  - some frontend files call history endpoints with `GET` or alternate paths

## Local Development

- Install dependencies: `yarn install`
- Start production-style server locally: `yarn start`
- Start with auto-reload: `yarn dev`
- Run automated tests: `yarn test`

## Current Risks

- Medium: logout invalidation still depends on in-memory blacklist state
- Medium: Swagger UI generation is still not aligned with the checked-in `docs/swagger.yaml`
- Medium: Salon backend exists for `tables` and `commands`, and the command lifecycle is transaction-backed when possible, but standalone fallback remains non-atomic and there is still no offline conflict strategy
- Medium: the product now records structured payments and has the first `Shift` foundation, but it still does not solve waiter declaration, manager cashier reconciliation, or daily commission calculation end-to-end.
- Medium: audit trails are stored in the backend, but there is still no dedicated history endpoint or frontend UI for operators/admins to inspect them cleanly
- Medium: CORS had to be expanded to include `PATCH` for command item updates; any external client assuming only `GET/POST/PUT/DELETE` is outdated
- Medium: the automated backend tests currently cover extracted Salon rules, not full HTTP integration or Mongo-backed flows yet
