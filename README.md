# KALA — Karnataka State Library Association

A Vite + React site for the Karnataka State Library Association, with a membership
application form, a Neon Postgres backend, and an admin panel to manage members.

## Stack

- **Frontend:** Vite + React, React Router, Framer Motion
- **Backend:** Express API (runs locally as a server, on Vercel as a serverless function)
- **Database:** Neon Postgres (`members` table, auto-created on first run)

## Local development

```bash
npm install
cp server/.env.example server/.env   # then fill in real values
npm run dev                           # runs Vite (5180) + API (4000) together
```

- Site: http://localhost:5180
- Admin: http://localhost:5180/admin

Vite proxies `/api/*` to the local Express server on port 4000.

## Deploying to Vercel

1. Push this folder to GitHub (this repo).
2. In Vercel, **New Project → import the repo**. Framework preset: **Vite** (auto-detected).
3. Add **Environment Variables** (Settings → Environment Variables):
   - `DATABASE_URL` — your Neon connection string (prefer the **pooled** `-pooler` host)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
4. Deploy.

How it works on Vercel:
- The frontend is built to `dist` and served statically.
- `api/[...path].js` wraps the Express app, so `/api/*` runs as a serverless function.
- `vercel.json` rewrites all non-`/api` routes to `index.html` for client-side routing.

> Security: rotate the Neon password and set a strong `ADMIN_PASSWORD` / `JWT_SECRET`
> before sharing the deployment. `server/.env` is gitignored and never committed.
