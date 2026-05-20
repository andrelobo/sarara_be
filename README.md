# BarChef Backend

## Overview

Backend API for BarChef. It provides authentication, user management, beverage inventory, ingredient inventory, and stock history endpoints backed by MongoDB.

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- SendGrid for welcome emails
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
   SENDGRID_API_KEY=your-sendgrid-api-key
   CORS_ORIGIN=http://localhost:5173
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

- `POST /api/users`
- `POST /api/users/login`
- `POST /api/users/logout`
- `GET /api/users`
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

- User read/update/delete routes require `Authorization: Bearer <token>`.
- Beverage deletion is logical and preserves history for auditing.
- Welcome email sending is optional at runtime; if SendGrid is not configured, user creation still succeeds.
