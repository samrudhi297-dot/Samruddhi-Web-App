# Deploy Samruddhi Enterprises (Supabase + Vercel)

This app can run **without Express** in production:
- **Supabase** = Auth + Postgres (products/inquiries) + Storage (product images)
- **Vercel** = hosts the React frontend (static `dist/` + SPA rewrites)
- Catalogue PDF stays in `public/catalogues/` and ships with the frontend

Local fallback: if Supabase env vars are missing, the app still uses the Express API (`npm run dev`).

---

## Step 1 — Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → **New project**
2. Pick org, name, password, region → Create
3. Wait until the project is ready
4. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → only for seeding (never put in Vercel frontend env)

---

## Step 2 — Create tables, RLS, and storage

1. In Supabase → **SQL Editor** → New query
2. Paste the full contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Click **Run**
4. Confirm tables exist under **Table Editor**: `products`, `inquiries`
5. Confirm bucket exists under **Storage**: `product-images` (public)

---

## Step 3 — Create your admin user

1. Supabase → **Authentication → Users → Add user**
2. Create with email + password (your admin login)
3. **Disable public signups** (recommended):  
   Authentication → Providers → Email → turn off “Enable sign ups” (or keep on only if you need it elsewhere)
4. Make this user an admin (SQL Editor):

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'YOUR_ADMIN_EMAIL@example.com';
```

5. Sign out/in after changing metadata so the JWT picks up `role=admin`.

---

## Step 4 — Seed products

From your machine (with Node installed):

```bash
cd /path/to/Samruddhi-enterprises-main

export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

npm run seed:supabase
```

You should see `Seeded 25 products.` Check **Table Editor → products**.

---

## Step 5 — Local test with Supabase

1. Copy env file:

```bash
cp .env.example .env
```

2. Put only these in `.env` for frontend:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. You can run **frontend only** (no Express needed):

```bash
npm run dev:web
```

4. Open http://127.0.0.1:5179/products — products should load from Supabase  
5. Open `/admin/login` → Sign In with the admin email/password  
6. Submit a test inquiry → it should appear under Admin → Inquiries

---

## Step 6 — Deploy frontend to Vercel

1. Push this project to GitHub (new repo)
2. Go to [https://vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Framework: **Vite** (auto-detected)
4. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables** (Production):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | your project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon key |

6. Deploy
7. After deploy, in Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**` and `https://your-app.vercel.app/admin/login`

---

## Step 7 — Smoke-test production

- [ ] Home loads
- [ ] `/products` shows catalog
- [ ] Download Catalogue PDF works
- [ ] Product detail + inquiry form inserts a row in `inquiries`
- [ ] `/admin/login` works with admin user
- [ ] Admin can edit a product / upload an image (Storage)
- [ ] Non-admin user (if any) cannot access admin data

---

## Optional extras

### Custom domain
Vercel → Project → Domains → add `www.yourdomain.com`, then update Supabase Auth Site URL.

### Enquiry emails
With this setup, inquiries are **saved in Supabase** only. For email alerts, add later:
- a Supabase **Database Webhook** / Edge Function that calls Resend, or
- poll the `inquiries` table in the admin panel (already built).

### Netlify instead of Vercel
Same env vars. Publish directory `dist`. SPA redirect: already have `public/_redirects` — confirm it contains `/*    /index.html   200`.

---

## What you no longer need for production

- Express API (`npm start`) — not required if Supabase is configured
- `ADMIN_PASSCODE` / `ADMIN_EMAILS` — admin is controlled by Supabase `app_metadata.role = admin`
- Railway/Render for API — unless you keep Express for something else

Express remains available for local/offline use when Supabase keys are not set.
