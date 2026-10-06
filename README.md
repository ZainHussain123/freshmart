# FreshMart Admin — Vegetable, Chicken & Fruit Khata

Admin-only customer khata application for a local mart. Customers do not log in or place orders online. The admin records phone orders, purchases, payments, stock and outstanding balances.

## Included
- English + Urdu labels throughout the admin UI
- Vegetables, chicken and fruits
- Add and edit item name, Urdu name, category, unit, rate and stock
- Historical purchase price snapshots: editing an item's current rate never changes old customer purchases
- Customer accounts, purchase history, payments and outstanding balances
- Mobile responsive UI
- Fixed/defensive Items page so API/database errors are shown instead of a blank screen
- PostgreSQL through Docker Compose

## Start
1. Start Docker Desktop.
2. From the project root:
```bash
docker compose up -d postgres
```
If port 5432 is already used on your Mac, this project maps PostgreSQL to **5433** on the host.
3. Install dependencies once, from the project root (npm workspaces; Node 22 recommended — Vite 7 needs Node 20.19+):
```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
4. Run the backend and the frontend in two terminals:
```bash
npm run dev:api
npm run dev:web
```
5. Open `http://localhost:5173`.

Demo admin:
- Email: `admin@vegetablemart.local`
- Password: `admin123`

## Database note
The backend automatically creates/migrates the required tables when it starts. It also adds the new `name_ur`, `category` and historical purchase snapshot fields to an existing database created by the previous version.

## Price history behavior
When a purchase is created, the current item name, Urdu name, category, unit and rate are copied into `purchase_items`. If you later edit the item's rate, old purchases continue showing the rate that was charged at the time of purchase.

## Project layout
```
api/index.js        Vercel serverless entry — exports the Express app
backend/src/app.js  Express app (routes, CORS, lazy DB init)
backend/src/server.js  Local dev server (app.listen)
frontend/           Vite + React admin UI
vercel.json         Build, output and /api rewrites
```

## Deploy to Vercel (frontend + API + database)
Everything runs in **one Vercel project**: the React app is served as static files, every `/api/*` request goes to the Express app running as a Vercel Function, and the database is Neon Postgres added from the Vercel Marketplace.

1. Push this folder to a GitHub/GitLab/Bitbucket repo and import it in Vercel (**Add New → Project**). Keep the **Root Directory** as the repo root; `vercel.json` already sets the build command and output directory.
2. In the project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL` (pooled) to the environment variables automatically.
3. In **Settings → Environment Variables**, add:
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -hex 32`)
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` — the admin login created on first start (otherwise the public demo login `admin123` is used)
   - Do **not** set `VITE_API_URL`; in production the frontend calls `/api` on the same domain.
4. Deploy (or redeploy after adding the variables). On the first API request the tables are created and the demo data is seeded automatically.
5. Log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The admin is only created when that email doesn't exist yet, so changing the variables later won't change an existing account's password.

CLI alternative: `npm i -g vercel`, then `vercel link`, `vercel env add JWT_SECRET`, and `vercel --prod`.

Notes:
- `.env` files are excluded from deploys (`.vercelignore`), so local `localhost` URLs never get baked into the production build.
- Preview deployments share the same database unless you create a Neon branch per preview in the integration settings.
