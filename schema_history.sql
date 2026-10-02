-- TruthLens History setup
-- Run this ONCE in Supabase: Dashboard > SQL Editor > New query > Run.
-- Safe to run again.

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source text not null default 'scan',
  product_name text,
  safe_grams int,
  verdict text,
  limiting text,
  nutrients jsonb,
  analysis jsonb,
  summary text
);

alter table public.scans add column if not exists summary text;
create index if not exists scans_user_created on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

drop policy if exists "read own scans" on public.scans;
drop policy if exists "insert own scans" on public.scans;
drop policy if exists "update own scans" on public.scans;
drop policy if exists "delete own scans" on public.scans;

create policy "read own scans"
  on public.scans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own scans"
  on public.scans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own scans"
  on public.scans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own scans"
  on public.scans for delete
  to authenticated
  using ((select auth.uid()) = user_id);
