-- Samruddhi Enterprises — run this in Supabase → SQL Editor (once)

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'seals',
  price text not null default '',
  description text not null default '',
  images jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_slug_idx on public.products (slug);

-- Inquiries / leads
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  company text not null default '',
  message text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

-- Admin check: set role on a user after creating them in Auth dashboard:
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   where email = 'you@yourcompany.com';
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- RLS
alter table public.products enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "inquiries_public_insert" on public.inquiries;
create policy "inquiries_public_insert"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);

drop policy if exists "inquiries_admin_select" on public.inquiries;
create policy "inquiries_admin_select"
  on public.inquiries for select
  to authenticated
  using (public.is_admin());

drop policy if exists "inquiries_admin_delete" on public.inquiries;
create policy "inquiries_admin_delete"
  on public.inquiries for delete
  to authenticated
  using (public.is_admin());

-- Storage bucket for product images (run once; ignore error if bucket exists)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Testimonials
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_name text not null,
  location text not null default '',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Blogs
create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  cover_image text not null default '',
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists blogs_slug_idx on public.blogs (slug);

-- Resources / downloads
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  file_url text not null default '',
  category text not null default 'general',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;
alter table public.blogs enable row level security;
alter table public.resources enable row level security;

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read"
  on public.testimonials for select to anon, authenticated
  using (published = true);

drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all"
  on public.testimonials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blogs_public_read" on public.blogs;
create policy "blogs_public_read"
  on public.blogs for select to anon, authenticated
  using (published = true);

drop policy if exists "blogs_admin_all" on public.blogs;
create policy "blogs_admin_all"
  on public.blogs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "resources_public_read" on public.resources;
create policy "resources_public_read"
  on public.resources for select to anon, authenticated
  using (published = true);

drop policy if exists "resources_admin_all" on public.resources;
create policy "resources_admin_all"
  on public.resources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
