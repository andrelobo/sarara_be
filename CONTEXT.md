# BarChef Backend Context

Last updated: 2026-05-21

## Identity

- Repository: `https://github.com/andrelobo/sarara_be.git`
- Runtime: Node.js + Express + MongoDB (Mongoose)
- Deployment target in code/config: Vercel
- Production base URL: `https://sarara-be.vercel.app`
- Production availability verified on 2026-05-20:
  - `GET /` returned HTTP `200`
  - `GET /api-docs` returned HTTP `301` redirect to `/api-docs/`

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
- Commands are linked to tables and update `currentCommandId` on the table document
- Keeps an embedded `auditTrail[]` for lifecycle and item events
- New command items can now be either:
  - `manual`
  - `beverage`
- When a command item references a beverage, the backend validates the beverage exists and snapshots its current name into `nameSnapshot`

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

## Operational Notes

- `package.json` and `README.md` were realigned to the BarChef backend on 2026-05-20.
- Public user access is now limited to `bootstrap-admin`, `login`, and `setup-password`.
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
- Command creation, close, and cancel now use MongoDB transactions when the deployment supports them.
- In standalone environments without transaction support, the backend falls back to sequential execution to preserve local compatibility.
- Command close/cancel currently frees the linked table automatically.
- Tables now record embedded audit events such as create, update, open, close, delete, and command attach/release transitions.
- Commands now record embedded audit events such as create, item add/update, close, and cancel transitions.
- List endpoints for tables and commands exclude `auditTrail` to keep payloads lighter, while detail fetches still include it.
- Command items can now be linked to existing beverages through `productType=beverage` and `productId`.
- The current stock integration rule is:
  - beverage-linked items deduct stock when the command is closed
  - cancelled items do not deduct stock
  - command close is blocked when linked beverage stock is insufficient
- Admin onboarding supports two modes:
  - activation link with pending account activation
  - direct password definition by the admin
- Email delivery was removed from the active onboarding flow on 2026-05-20.
- The API now always returns the activation link directly when setup mode is `invite`.
- Local route loading succeeded on 2026-05-20 after dependency installation by requiring:
  - `routes/userRoutes.js`
  - `routes/beverageRoutes.js`
  - `routes/ingredientRoutes.js`
- Local route loading also succeeded on 2026-05-21 for:
  - `routes/tableRoutes.js`
  - `routes/commandRoutes.js`
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

## Current Risks

- Medium: logout invalidation still depends on in-memory blacklist state
- Medium: Swagger UI generation is still not aligned with the checked-in `docs/swagger.yaml`
- Medium: Salon backend exists for `tables` and `commands`, and the command lifecycle is transaction-backed when possible, but standalone fallback remains non-atomic and there is still no offline conflict strategy
- Medium: audit trails are stored in the backend, but there is still no dedicated history endpoint or frontend UI for operators/admins to inspect them cleanly
- Medium: CORS had to be expanded to include `PATCH` for command item updates; any external client assuming only `GET/POST/PUT/DELETE` is outdated
