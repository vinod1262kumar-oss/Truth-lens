-- Run this once in Supabase: SQL Editor > New query > Run
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  scans_used int not null default 0,
  plan text not null default 'free',   -- 'free' or 'pro'
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

create or replace function public.increment_scans(uid uuid) returns int
language sql security definer set search_path = public as $$
  update profiles set scans_used = scans_used + 1 where id = uid returning scans_used;
$$;
revoke execute on function public.increment_scans(uuid) from public, anon, authenticated;
grant execute on function public.increment_scans(uuid) to service_role;
