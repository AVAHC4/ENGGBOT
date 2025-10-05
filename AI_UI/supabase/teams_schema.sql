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
