-- Supabase schema for per-account, per-team real-time groups
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

-- Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_email text not null,
  created_by_name text,
  created_at timestamptz not null default now()
);

-- Team members
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_email text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, member_email)
);

create index if not exists idx_team_members_email on public.team_members(member_email);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_email text not null,
  sender_name text,
  content text not null,
  created_at timestamptz not null default now()
);

-- Backfill schema differences if an older messages table already exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'messages'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'messages' and column_name = 'team_id'
    ) then
      alter table public.messages add column team_id uuid;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'messages' and column_name = 'sender_email'
    ) then
      alter table public.messages add column sender_email text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'messages' and column_name = 'sender_name'
    ) then
      alter table public.messages add column sender_name text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'messages' and column_name = 'content'
    ) then
      alter table public.messages add column content text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'messages' and column_name = 'created_at'
    ) then
      alter table public.messages add column created_at timestamptz;
    end if;
  end if;
end
$$;

-- Ensure constraints/defaults on messages for legacy tables
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'created_at'
  ) then
    execute 'alter table public.messages alter column created_at set default now()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'team_id'
  ) then
    if exists (select 1 from public.messages where team_id is null) then
      raise notice 'public.messages.team_id is null for some rows; populate before setting NOT NULL.';
    else
      execute 'alter table public.messages alter column team_id set not null';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'sender_email'
  ) then
    if exists (select 1 from public.messages where sender_email is null) then
      raise notice 'public.messages.sender_email has NULL values; populate before enforcing NOT NULL.';
    else
      execute 'alter table public.messages alter column sender_email set not null';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'content'
  ) then
    if exists (select 1 from public.messages where content is null) then
      raise notice 'public.messages.content has NULL values; populate before enforcing NOT NULL.';
    else
      execute 'alter table public.messages alter column content set not null';
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_team_id_fkey'
      and conrelid = 'public.messages'::regclass
  ) then
    execute 'alter table public.messages add constraint messages_team_id_fkey foreign key (team_id) references public.teams(id) on delete cascade';
  end if;
end
$$;

create index if not exists idx_messages_team_created on public.messages(team_id, created_at);

-- Enable RLS and restrict by default (API uses service role)
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.messages enable row level security;

-- Allow service role full access
-- Note: PostgreSQL does not support CREATE POLICY IF NOT EXISTS.
-- Use DROP POLICY IF EXISTS followed by CREATE POLICY.
drop policy if exists "service-role full access" on public.teams;
create policy "service-role full access" on public.teams
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
 
drop policy if exists "service-role full access" on public.team_members;
create policy "service-role full access" on public.team_members
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
 
drop policy if exists "service-role full access" on public.messages;
create policy "service-role full access" on public.messages
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Realtime: enable replication for messages (UI: Database -> Replication -> Configure -> Select messages)
-- This comment is a reminder; configure in Supabase dashboard.
