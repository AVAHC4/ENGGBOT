-- Supabase schema for projects feature
-- Run this in Supabase SQL editor
-- Creates completely separate tables for project conversations (not mixing with regular conversations)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables if they exist (cascade will drop dependent objects)
DROP TABLE IF EXISTS public.project_conversation_messages CASCADE;
DROP TABLE IF EXISTS public.project_conversations CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

-- Projects table (metadata for each project)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_email ON public.projects(user_email);
CREATE INDEX idx_projects_updated ON public.projects(updated_at DESC);

-- Project conversations table (separate from regular conversations)
CREATE TABLE public.project_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_conversations_project_id ON public.project_conversations(project_id);
CREATE INDEX idx_project_conversations_user_email ON public.project_conversations(user_email);
CREATE INDEX idx_project_conversations_updated ON public.project_conversations(updated_at DESC);

-- Project conversation messages table (separate from regular conversation_messages)
CREATE TABLE public.project_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.project_conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  attachments JSONB,
  reply_to_id UUID,
  metadata JSONB,
  is_streaming BOOLEAN DEFAULT false
);

CREATE INDEX idx_project_conversation_messages_conv_id ON public.project_conversation_messages(conversation_id);
CREATE INDEX idx_project_conversation_messages_timestamp ON public.project_conversation_messages(conversation_id, timestamp);

-- Enable RLS (Row Level Security)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_conversation_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
DROP POLICY IF EXISTS "service-role full access projects" ON public.projects;
CREATE POLICY "service-role full access projects" ON public.projects
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service-role full access project_conversations" ON public.project_conversations;
CREATE POLICY "service-role full access project_conversations" ON public.project_conversations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service-role full access project_messages" ON public.project_conversation_messages;
CREATE POLICY "service-role full access project_messages" ON public.project_conversation_messages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Function to automatically update project updated_at timestamp when conversations change
CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET updated_at = now()
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update project timestamp when conversations are added/modified
DROP TRIGGER IF EXISTS update_project_timestamp_trigger ON public.project_conversations;
CREATE TRIGGER update_project_timestamp_trigger
  AFTER INSERT OR UPDATE ON public.project_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_project_timestamp();

-- Function to automatically update project_conversation updated_at timestamp when messages change
CREATE OR REPLACE FUNCTION update_project_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.project_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when messages are added/modified
DROP TRIGGER IF EXISTS update_project_conversation_timestamp_trigger ON public.project_conversation_messages;
CREATE TRIGGER update_project_conversation_timestamp_trigger
  AFTER INSERT OR UPDATE ON public.project_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_project_conversation_timestamp();
