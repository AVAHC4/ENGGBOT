-- Persist pinned conversations so they remain pinned across sessions and devices.
alter table public.conversations
  add column if not exists pinned boolean not null default false;

create index if not exists idx_conversations_pinned_updated
  on public.conversations(user_email, pinned desc, updated_at desc);
