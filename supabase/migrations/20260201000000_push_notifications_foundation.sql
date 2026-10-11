-- Migration: Browser Push Notifications Foundation & Security Setup (Phase 1, Unit 1)
-- Timestamp: 20260201000000

-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    student_class TEXT NOT NULL CHECK (student_class IN ('8', '9', '10', '11', '12', 'general_only')),
    study_medium TEXT NOT NULL CHECK (study_medium IN ('english', 'hindi', 'general_only')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_paired_general_only CHECK (
        (student_class = 'general_only' AND study_medium = 'general_only') OR 
        (student_class != 'general_only' AND study_medium != 'general_only')
    )
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_active_targeting 
ON public.push_subscriptions(student_class, study_medium) 
WHERE is_active = true;

-- 2. Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    destination_url TEXT NOT NULL DEFAULT '/',
    target_class TEXT NOT NULL DEFAULT 'all' CHECK (target_class IN ('8', '9', '10', '11', '12', 'all')),
    target_medium TEXT NOT NULL DEFAULT 'all' CHECK (target_medium IN ('english', 'hindi', 'all')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
    total_sent INTEGER NOT NULL DEFAULT 0 CHECK (total_sent >= 0),
    total_successful INTEGER NOT NULL DEFAULT 0 CHECK (total_successful >= 0),
    total_failed INTEGER NOT NULL DEFAULT 0 CHECK (total_failed >= 0),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- 3. Least-Privilege Database Grants
-- Revoke all table-level access from PUBLIC and client roles
REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.announcements FROM PUBLIC, anon, authenticated;

-- Grant ONLY SELECT and DELETE on push_subscriptions to authenticated users (No client INSERT or UPDATE)
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;

-- Grant SELECT on announcements to authenticated and anonymous users
GRANT SELECT ON public.announcements TO authenticated, anon;

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT policy for push_subscriptions
CREATE POLICY "Users can view own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Owner-only DELETE policy for push_subscriptions
CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Public read access for sent announcements only
CREATE POLICY "Anyone can view sent announcements"
    ON public.announcements FOR SELECT
    USING (status = 'sent');
