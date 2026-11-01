-- ============================================================================
-- SPEAKFLOW MIGRATION: AI ENGLISH TUTOR ROLEPLAY SESSIONS & MESSAGES
-- Run this in your Supabase SQL Editor to support cloud sync for AI Tutor
-- ============================================================================

DO $ai_tutor$
BEGIN
  -- 1. Create roleplay_sessions table
  CREATE TABLE IF NOT EXISTS public.roleplay_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scenario_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    cefr_level VARCHAR(5) NOT NULL DEFAULT 'B1',
    user_role TEXT NOT NULL,
    ai_role TEXT NOT NULL,
    learning_mode VARCHAR(10) NOT NULL DEFAULT 'text', -- 'text' or 'voice'
    correction_mode VARCHAR(15) NOT NULL DEFAULT 'gentle', -- 'gentle', 'standard', 'intensive'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Create roleplay_messages table
  CREATE TABLE IF NOT EXISTS public.roleplay_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.roleplay_sessions(id) ON DELETE CASCADE,
    role VARCHAR(15) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    content_vi TEXT,
    tutor_correction JSONB,
    suggested_replies JSONB,
    is_voice BOOLEAN NOT NULL DEFAULT false,
    audio_match_score INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 3. Create indexes for high-performance lookup
  CREATE INDEX IF NOT EXISTS idx_roleplay_sessions_user_id ON public.roleplay_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_roleplay_sessions_status ON public.roleplay_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_roleplay_messages_session_id ON public.roleplay_messages(session_id);

  -- 4. Enable Row Level Security (RLS)
  ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.roleplay_messages ENABLE ROW LEVEL SECURITY;

  -- 5. Drop existing policies if any
  DROP POLICY IF EXISTS "Users can read own roleplay sessions" ON public.roleplay_sessions;
  DROP POLICY IF EXISTS "Users can insert own roleplay sessions" ON public.roleplay_sessions;
  DROP POLICY IF EXISTS "Users can update own roleplay sessions" ON public.roleplay_sessions;
  DROP POLICY IF EXISTS "Users can delete own roleplay sessions" ON public.roleplay_sessions;

  DROP POLICY IF EXISTS "Users can read own roleplay messages" ON public.roleplay_messages;
  DROP POLICY IF EXISTS "Users can insert own roleplay messages" ON public.roleplay_messages;
  DROP POLICY IF EXISTS "Users can delete own roleplay messages" ON public.roleplay_messages;

  -- 6. Define Strict Isolation Policies for roleplay_sessions
  CREATE POLICY "Users can read own roleplay sessions" ON public.roleplay_sessions
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own roleplay sessions" ON public.roleplay_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own roleplay sessions" ON public.roleplay_sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete own roleplay sessions" ON public.roleplay_sessions
    FOR DELETE USING (auth.uid() = user_id);

  -- 7. Define Strict Isolation Policies for roleplay_messages
  CREATE POLICY "Users can read own roleplay messages" ON public.roleplay_messages
    FOR SELECT USING (
      session_id IN (SELECT id FROM public.roleplay_sessions WHERE user_id = auth.uid())
    );

  CREATE POLICY "Users can insert own roleplay messages" ON public.roleplay_messages
    FOR INSERT WITH CHECK (
      session_id IN (SELECT id FROM public.roleplay_sessions WHERE user_id = auth.uid())
    );

  CREATE POLICY "Users can delete own roleplay messages" ON public.roleplay_messages
    FOR DELETE USING (
      session_id IN (SELECT id FROM public.roleplay_sessions WHERE user_id = auth.uid())
    );

END $ai_tutor$;

-- ============================================================================
-- ROLLBACK SCRIPT (Run only if you need to revert this migration):
--
-- DROP TABLE IF EXISTS public.roleplay_messages CASCADE;
-- DROP TABLE IF EXISTS public.roleplay_sessions CASCADE;
-- ============================================================================
