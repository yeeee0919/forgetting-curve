-- Toocheep：Google 帳號隔離、inbox RLS、AI 額度
-- 在 Supabase SQL Editor 整段執行。接著到 Authentication → Providers 開啟 Google。

create table if not exists public.user_cards (
  id text primary key,
  user_id text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists user_cards_user_id_idx on public.user_cards (user_id);
alter table public.user_cards add column if not exists updated_at timestamptz default now();

create table if not exists public.temp_inbox (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  word text not null,
  context_sentence text,
  source_url text,
  translation text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.temp_inbox add column if not exists user_id uuid references auth.users(id);
alter table public.temp_inbox add column if not exists translation text;

create index if not exists temp_inbox_user_id_idx on public.temp_inbox (user_id);

create table if not exists public.ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cards_created integer not null default 0,
  updated_at timestamptz default now()
);

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_cards' loop
    execute format('drop policy if exists %I on public.user_cards', r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'temp_inbox' loop
    execute format('drop policy if exists %I on public.temp_inbox', r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'ai_usage' loop
    execute format('drop policy if exists %I on public.ai_usage', r.policyname);
  end loop;
end $$;

alter table public.user_cards enable row level security;
alter table public.temp_inbox enable row level security;
alter table public.ai_usage enable row level security;

create policy "user_cards_select_own" on public.user_cards for select using (user_id = auth.uid()::text);
create policy "user_cards_insert_own" on public.user_cards for insert with check (user_id = auth.uid()::text);
create policy "user_cards_update_own" on public.user_cards for update using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "user_cards_delete_own" on public.user_cards for delete using (user_id = auth.uid()::text);

create policy "inbox_select_own" on public.temp_inbox for select using (user_id = auth.uid());
create policy "inbox_insert_own" on public.temp_inbox for insert with check (user_id = auth.uid());
create policy "inbox_delete_own" on public.temp_inbox for delete using (user_id = auth.uid());

create policy "ai_usage_select_own" on public.ai_usage for select using (user_id = auth.uid());

create or replace function public.get_ai_quota()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  used int := 0;
  cap int := 50;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select coalesce((select cards_created from public.ai_usage where user_id = uid), 0) into used;
  return json_build_object('used', used, 'limit', cap, 'remaining', greatest(cap - used, 0));
end;
$$;

create or replace function public.consume_ai_quota(requested integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  used int := 0;
  cap int := 50;
  allowed int := 0;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if requested is null or requested < 1 then
    return json_build_object('allowed', 0, 'used', used, 'limit', cap, 'remaining', cap);
  end if;

  insert into public.ai_usage (user_id, cards_created)
  values (uid, 0)
  on conflict (user_id) do nothing;

  select cards_created into used from public.ai_usage where user_id = uid for update;
  used := coalesce(used, 0);
  allowed := least(requested, greatest(cap - used, 0));

  if allowed > 0 then
    update public.ai_usage
      set cards_created = cards_created + allowed, updated_at = now()
      where user_id = uid;
    used := used + allowed;
  end if;

  return json_build_object(
    'allowed', allowed,
    'used', used,
    'limit', cap,
    'remaining', greatest(cap - used, 0)
  );
end;
$$;

create or replace function public.refund_ai_quota(amount integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  used int := 0;
  cap int := 50;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if amount is null or amount < 1 then
    select coalesce((select cards_created from public.ai_usage where user_id = uid), 0) into used;
    return json_build_object('allowed', 0, 'used', used, 'limit', cap, 'remaining', greatest(cap - used, 0));
  end if;

  update public.ai_usage
    set cards_created = greatest(cards_created - amount, 0), updated_at = now()
    where user_id = uid
  returning cards_created into used;

  used := coalesce(used, 0);
  return json_build_object(
    'allowed', 0,
    'used', used,
    'limit', cap,
    'remaining', greatest(cap - used, 0)
  );
end;
$$;

revoke all on function public.get_ai_quota() from public;
revoke all on function public.consume_ai_quota(integer) from public;
revoke all on function public.refund_ai_quota(integer) from public;
grant execute on function public.get_ai_quota() to authenticated;
grant execute on function public.consume_ai_quota(integer) to authenticated;
grant execute on function public.refund_ai_quota(integer) to authenticated;
