-- Email Authentication Migration
-- Run this in Supabase SQL editor to add password support

-- Add password_hash column for storing bcrypt-hashed passwords
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add firstname and lastname columns for name storage
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS firstname TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lastname TEXT;

-- Create index on email for faster login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
