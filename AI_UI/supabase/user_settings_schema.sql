-- Supabase schema for user settings
-- Run this in Supabase SQL editor after other schema files

create extension if not exists pgcrypto;

-- Drop existing table if exists
drop table if exists public.user_settings cascade;

-- User settings table (stores all settings per user)
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  
  -- Profile settings
  username text,
  bio text,
  urls jsonb, -- Array of URL objects [{value: "https://..."}]
  
  -- Appearance settings
  theme text default 'light',
  font text default 'inter',
  background text default 'flicker',
  avatar text, -- base64 compressed image
  
  -- Notifications settings
  notification_type text default 'all', -- all, mentions, none
  mobile_notifications boolean default false,
  communication_emails boolean default false,
  social_emails boolean default true,
  marketing_emails boolean default false,
  security_emails boolean default true,
  
  -- Display settings
  sidebar_items jsonb default '["chat", "compiler", "teams", "projects"]'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_user_settings_email on public.user_settings(user_email);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Service role full access for user_settings
drop policy if exists "service-role full access user_settings" on public.user_settings;
create policy "service-role full access user_settings" on public.user_settings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
