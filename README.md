# BarChef Backend

## Overview

Backend API for BarChef. It provides authentication, user management, beverage inventory, ingredient inventory, and stock history endpoints backed by MongoDB.

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Swagger UI at `/api-docs`

## Requirements

- Node.js
- Yarn
- MongoDB

## Setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Create a `.env` file in the project root:

   ```env
   PORT=7777
   MONGODB_URL=your-mongodb-url
   JWT_SECRET=your-jwt-secret
   CORS_ORIGIN=http://localhost:5173
   FRONTEND_URL=https://barchef-sarara.vercel.app
   INVITATION_TTL_HOURS=72
   ```

## Running

Development:

```bash
yarn dev
```

Production-style local run:

```bash
yarn start
```

Default local URL: `http://localhost:7777`

## Main Routes

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

## Notes

- `bootstrap-admin`, `login` and `setup-password` are the only public user routes.
- User management is now admin-only.
- Inventory routes require `Authorization: Bearer <token>`.
- `admin` can manage users and inventory.
- `manager` can create, edit and delete beverages and ingredients.
- `waiter` can only read inventory and history.
- `admin` and `manager` can create, edit and delete tables.
- `admin`, `manager` and `waiter` can open and close tables.
- `admin`, `manager` and `waiter` can create and operate commands.
- Beverage deletion is logical and preserves history for auditing.
- User onboarding no longer depends on email delivery.
- Admin user creation supports two modes:
  - generate an activation link for the admin to share manually
  - define an initial password directly during creation
- Initial Salon backend behavior is already available:
  - tables can be created, listed, opened, closed and soft deleted
  - commands can be opened for a table, receive items, be updated, closed or cancelled
  - command creation, close and cancel use MongoDB transactions when supported by the deployment
  - tables and commands now keep embedded audit trails for lifecycle events
  - command items can reference existing beverages and snapshot the beverage name
  - beverage-linked command items deduct stock when the command is closed
  - command close is blocked when linked beverage stock is insufficient
