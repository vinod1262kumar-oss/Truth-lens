-- Durva persistent chat history for Supabase
create table if not exists public.durva_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','model')),
  message text not null check (char_length(message) <= 1200),
  created_at timestamptz not null default now()
);

create index if not exists durva_messages_user_created_idx
  on public.durva_messages(user_id, created_at desc);

alter table public.durva_messages enable row level security;

create policy "Durva users can read their own messages"
  on public.durva_messages for select
  using (auth.uid() = user_id);

create policy "Durva users can insert their own messages"
  on public.durva_messages for insert
  with check (auth.uid() = user_id);
