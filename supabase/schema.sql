-- =========================================================================
-- Bolt Action Army Builder — Supabase Schema & Protecciones de Seguridad
-- =========================================================================
-- Instrucciones:
-- 1. Ve a Supabase -> SQL Editor -> New Query
-- 2. Asegúrate de borrar cualquier texto anterior
-- 3. Pega este código completo (sin seleccionar nada con el ratón) y dale a RUN
-- =========================================================================

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

-- Índices de consulta rápida
create index if not exists army_lists_user_updated_idx
  on public.army_lists (user_id, updated_at desc);

-- -------------------------------------------------------------------------
-- 1. PROTECCIÓN DE TAMAÑO (Máx 512 KB por lista)
-- -------------------------------------------------------------------------
alter table public.army_lists
  drop constraint if exists army_lists_max_data_size,
  drop constraint if exists army_lists_max_name_len,
  drop constraint if exists army_lists_max_faction_len;

alter table public.army_lists
  add constraint army_lists_max_data_size check (pg_column_size(data) <= 524288),
  add constraint army_lists_max_name_len check (length(name) <= 120),
  add constraint army_lists_max_faction_len check (length(faction_id) <= 60);

-- -------------------------------------------------------------------------
-- 2. TOPE DE LISTAS POR USUARIO (Máximo 50 listas en la nube por cuenta)
-- -------------------------------------------------------------------------
create or replace function public.check_army_lists_quota()
returns trigger language plpgsql as $quota$
begin
  if (select count(*) from public.army_lists where user_id = new.user_id) >= 50 then
    raise exception 'Has alcanzado el límite máximo de 50 listas guardadas en la nube. Borra alguna para guardar una nueva.';
  end if;
  return new;
end;
$quota$;

drop trigger if exists army_lists_quota_trigger on public.army_lists;
create trigger army_lists_quota_trigger
  before insert on public.army_lists
  for each row execute function public.check_army_lists_quota();

-- -------------------------------------------------------------------------
-- 3. MANTENER updated_at ACTUALIZADO
-- -------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $touch$
begin
  new.updated_at = now();
  return new;
end;
$touch$;

drop trigger if exists army_lists_touch on public.army_lists;
create trigger army_lists_touch
  before update on public.army_lists
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) — Cada usuario solo puede ver y editar lo suyo
-- -------------------------------------------------------------------------
alter table public.army_lists enable row level security;

drop policy if exists "Own lists: select" on public.army_lists;
drop policy if exists "Own lists: insert" on public.army_lists;
drop policy if exists "Own lists: update" on public.army_lists;
drop policy if exists "Own lists: delete" on public.army_lists;

create policy "Own lists: select" on public.army_lists
  for select to authenticated
  using (auth.uid() = user_id);

create policy "Own lists: insert" on public.army_lists
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Own lists: update" on public.army_lists
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Own lists: delete" on public.army_lists
  for delete to authenticated
  using (auth.uid() = user_id);
