-- Bolt Action Army Builder — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.army_lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null default 'Untitled Force',
  faction_id   text not null,
  total_points integer not null default 0,
  order_dice   integer not null default 0,
  data         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists army_lists_user_updated_idx
  on public.army_lists (user_id, updated_at desc);

-- Keep updated_at in sync
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists army_lists_touch on public.army_lists;
create trigger army_lists_touch
  before update on public.army_lists
  for each row execute function public.touch_updated_at();

-- Row Level Security: every user can only see and modify their own lists
alter table public.army_lists enable row level security;

drop policy if exists "Own lists: select" on public.army_lists;
drop policy if exists "Own lists: insert" on public.army_lists;
drop policy if exists "Own lists: update" on public.army_lists;
drop policy if exists "Own lists: delete" on public.army_lists;

create policy "Own lists: select" on public.army_lists
  for select using (auth.uid() = user_id);
create policy "Own lists: insert" on public.army_lists
  for insert with check (auth.uid() = user_id);
create policy "Own lists: update" on public.army_lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own lists: delete" on public.army_lists
  for delete using (auth.uid() = user_id);
