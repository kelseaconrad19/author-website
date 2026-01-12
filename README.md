# author-website

## Backend setup

This project includes a lightweight Node/Express API backed by SQLite for managing blog posts.

### Environment variables

Set these in your deployment environment (or a `.env` file if your platform supports it):

- `PORT` (optional): Port for the API server (defaults to `3000`).
- `DATABASE_URL` (optional): Path to the SQLite database file (defaults to `backend/data/author.db`).
- `JWT_SECRET`: Secret used to sign admin JWT tokens.
- `ADMIN_USER`: Admin username for logging into the admin UI.
- `ADMIN_PASSWORD`: Admin password for logging into the admin UI.

### Install dependencies

```bash
npm install
```

### Run migrations

```bash
npm run migrate
```

### Start the API

```bash
npm start
```

### Admin UI

Open `admin.html` in the browser (or serve the site) and log in using the credentials configured
in `ADMIN_USER` and `ADMIN_PASSWORD`. Once logged in you can create, edit, and publish posts.
