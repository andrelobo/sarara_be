# Node.js User Management and Email Sending App

## Overview

This is a Node.js application that provides user management functionalities including CRUD operations (Create, Read, Update, Delete), and email sending capabilities for welcome messages and password reset.

## Features

- **User Management**: Create, read, update, and delete user accounts.
- **Email Sending**: Send welcome emails upon user registration and password reset emails.

## Requirements

Before getting started, ensure you have the following installed:

- Node.js and Yarn
- MongoDB

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Create a `.env` file in the root directory and define the following environment variables:

   ```plaintext
   PORT=7777
   MONGODB_URL=your-mongodb-url
   SENDGRID_API_KEY=your-sendgrid-api-key
   JWT_SECRET= SECRET


## Usage

Start the server:

```bash
yarn start
```

The server will be accessible at `http://localhost:7777`.

## API Routes

### Users

- **POST /api/users**: Create a new user. Requires a JSON body with user data.
- **GET /api/users/:id**: Get details of a specific user by ID.
- **PUT /api/users/:id**: Update details of an existing user. Requires a JSON body with updated user data.
- **DELETE /api/users/:id**: Delete an existing user by ID.

### Email Sending

- **POST /api/reset-password**: Request password reset for a user. Requires a JSON body with the user's email.

## Contribution

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
# sarara_be
