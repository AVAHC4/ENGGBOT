-- Supabase schema for user conversations
-- Run this in Supabase SQL editor after teams_schema.sql

create extension if not exists pgcrypto;

-- Drop existing tables if they exist (cascade will drop dependent objects)
drop table if exists public.conversation_messages cascade;
drop table if exists public.conversations cascade;

-- Conversations table (metadata)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  title text not null,
  project_id uuid, -- nullable, links to project if conversation is project-specific
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_user_email on public.conversations(user_email);
create index idx_conversations_project_id on public.conversations(project_id);
create index idx_conversations_updated on public.conversations(updated_at desc);

-- Conversation messages table
create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  content text not null,
  is_user boolean not null,
  timestamp timestamptz not null default now(),
  attachments jsonb, -- array of attachment objects
  reply_to_id uuid, -- references another message in the same conversation
  metadata jsonb, -- for search results, thinking mode data, etc.
  is_streaming boolean default false
);

create index idx_conversation_messages_conv_id on public.conversation_messages(conversation_id);
create index idx_conversation_messages_timestamp on public.conversation_messages(conversation_id, timestamp);

-- Enable RLS (Row Level Security)
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

-- Since we're using service role authentication through API routes,
-- we only need to allow service role full access.
-- Authorization is handled in the API routes by checking the email parameter.

-- Service role full access for conversations
drop policy if exists "service-role full access conversations" on public.conversations;
create policy "service-role full access conversations" on public.conversations
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Service role full access for conversation_messages
drop policy if exists "service-role full access messages" on public.conversation_messages;
create policy "service-role full access messages" on public.conversation_messages
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

-- Trigger to update conversation timestamp when messages are added/modified
drop trigger if exists update_conversation_timestamp_trigger on public.conversation_messages;
create trigger update_conversation_timestamp_trigger
  after insert or update on public.conversation_messages
  for each row
  execute function update_conversation_timestamp();
