-- Lazy To-Do cloud sync schema.
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.

-- One row per user holding the whole app state as JSON.
create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each user can only see and change their own row.
alter table public.app_state enable row level security;

drop policy if exists "Read own state" on public.app_state;
create policy "Read own state"
  on public.app_state for select
  using (auth.uid() = user_id);

drop policy if exists "Insert own state" on public.app_state;
create policy "Insert own state"
  on public.app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Update own state" on public.app_state;
create policy "Update own state"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
