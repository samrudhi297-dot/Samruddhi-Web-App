# Samruddhi Enterprises

React + Vite storefront. **Production target:** Supabase (Auth + DB + Storage) + Vercel (frontend). Express is optional for local fallback only.

## Quick start (after Supabase is configured)

```bash
cp .env.example .env
# set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run seed:supabase   # needs SUPABASE_SERVICE_ROLE_KEY once
npm run dev:web         # frontend only — no Express required
```

## Full step-by-step deploy

Follow **[DEPLOY.md](./DEPLOY.md)** — creates schema, admin user, seeds products, deploys to Vercel.

## Local Express fallback

If Supabase env vars are missing, `npm run dev` still runs Vite + Express using `server/data/*.json`.

## Admin

- Supabase mode: Sign In with a user that has `app_metadata.role = "admin"`
- Express fallback: passcode / `ADMIN_EMAILS` as before

## Product catalogue PDF

Served from `/catalogues/samruddhi-product-catalogue.pdf` (Download buttons on the Products page).
