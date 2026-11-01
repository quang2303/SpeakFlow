-- ============================================================================
-- SPEAKFLOW MIGRATION: AI PERSONALIZED LEARNING PATH
-- Tables: learning_goals, learning_plans, learning_task_progress
-- ============================================================================

DO $learning_path$
BEGIN
  -- Enable pgcrypto if needed
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- 1. Create learning_goals table
  CREATE TABLE IF NOT EXISTS public.learning_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    primary_goal VARCHAR(50) NOT NULL,
    custom_goal_text TEXT,
    current_level VARCHAR(5) NOT NULL DEFAULT 'B1',
    target_level VARCHAR(5) NOT NULL DEFAULT 'B2',
    daily_minutes INT NOT NULL DEFAULT 20,
    days_per_week INT NOT NULL DEFAULT 5,
    rest_days INT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    duration_days INT NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    placement_test_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Create learning_plans table
  CREATE TABLE IF NOT EXISTS public.learning_plans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    goal_id UUID REFERENCES public.learning_goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    total_days INT NOT NULL DEFAULT 30,
    current_day INT NOT NULL DEFAULT 1,
    plan_version INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    ai_provider TEXT,
    phases JSONB NOT NULL DEFAULT '[]'::jsonb,
    days JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 3. Create learning_task_progress table
  CREATE TABLE IF NOT EXISTS public.learning_task_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    day_number INT NOT NULL,
    task_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_via VARCHAR(30) DEFAULT 'user_confirm'
  );

  -- 4. Create helpful indexes
  CREATE INDEX IF NOT EXISTS idx_learning_goals_user ON public.learning_goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_learning_plans_user ON public.learning_plans(user_id);
  CREATE INDEX IF NOT EXISTS idx_learning_task_progress_user ON public.learning_task_progress(user_id, plan_id);

  -- 5. Enable Row Level Security (RLS)
  ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.learning_task_progress ENABLE ROW LEVEL SECURITY;

  -- 6. Drop existing policies if any
  DROP POLICY IF EXISTS "Users can read own learning goals" ON public.learning_goals;
  DROP POLICY IF EXISTS "Users can insert own learning goals" ON public.learning_goals;
  DROP POLICY IF EXISTS "Users can update own learning goals" ON public.learning_goals;
  DROP POLICY IF EXISTS "Users can delete own learning goals" ON public.learning_goals;

  DROP POLICY IF EXISTS "Users can read own learning plans" ON public.learning_plans;
  DROP POLICY IF EXISTS "Users can insert own learning plans" ON public.learning_plans;
  DROP POLICY IF EXISTS "Users can update own learning plans" ON public.learning_plans;
  DROP POLICY IF EXISTS "Users can delete own learning plans" ON public.learning_plans;

  DROP POLICY IF EXISTS "Users can read own task progress" ON public.learning_task_progress;
  DROP POLICY IF EXISTS "Users can insert own task progress" ON public.learning_task_progress;
  DROP POLICY IF EXISTS "Users can update own task progress" ON public.learning_task_progress;

  -- 7. Define Strict User Isolation Policies
  CREATE POLICY "Users can read own learning goals" ON public.learning_goals
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own learning goals" ON public.learning_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own learning goals" ON public.learning_goals
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete own learning goals" ON public.learning_goals
    FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "Users can read own learning plans" ON public.learning_plans
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own learning plans" ON public.learning_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own learning plans" ON public.learning_plans
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete own learning plans" ON public.learning_plans
    FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "Users can read own task progress" ON public.learning_task_progress
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own task progress" ON public.learning_task_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own task progress" ON public.learning_task_progress
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $learning_path$;

-- ============================================================================
-- ROLLBACK SCRIPT (Run only to revert this migration):
--
-- DROP TABLE IF EXISTS public.learning_task_progress CASCADE;
-- DROP TABLE IF EXISTS public.learning_plans CASCADE;
-- DROP TABLE IF EXISTS public.learning_goals CASCADE;
-- ============================================================================
