-- Supabase schema for projects
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

-- Drop existing tables if they exist
drop table if exists public.project_files cascade;
drop table if exists public.projects cascade;

-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  name text not null,
  description text,
  emoji text default '📁',
  color text default '#3b82f6',
  custom_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_user_email on public.projects(user_email);
create index idx_projects_updated on public.projects(updated_at desc);

-- Project Files table
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text, -- mime type
  size integer,
  content text, -- for code files, optional
  upload_date timestamptz not null default now()
);

create index idx_project_files_project_id on public.project_files(project_id);

-- Enable RLS
alter table public.projects enable row level security;
alter table public.project_files enable row level security;

-- RLS Policies (Service Role Access Only for API)
drop policy if exists "service-role full access projects" on public.projects;
create policy "service-role full access projects" on public.projects
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service-role full access project_files" on public.project_files;
create policy "service-role full access project_files" on public.project_files
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Trigger to update updated_at on projects
create or replace function update_project_timestamp()
returns trigger as $$
begin
  update public.projects
  set updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_project_timestamp_trigger on public.projects;
create trigger update_project_timestamp_trigger
  before update on public.projects
  for each row
  execute function update_project_timestamp();
