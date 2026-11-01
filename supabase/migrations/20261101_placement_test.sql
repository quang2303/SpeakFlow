-- =============================================================================
-- Migration: SpeakFlow English Placement Test & CEFR Diagnostic Engine
-- Version: 20261101_placement_test.sql
-- Description: Creates assessment_attempts, assessment_responses, and assessment_results
--              with strict Row Level Security (RLS) for multi-tenant account isolation.
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG ASSESSMENT_ATTEMPTS (Lưu phiên kiểm tra trình độ)
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL DEFAULT 'quick', -- 'quick', 'full', 'grammar_vocab', 'speaking_only'
    status TEXT NOT NULL DEFAULT 'completed', -- 'in_progress', 'completed', 'abandoned'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    estimated_cefr_level TEXT NOT NULL, -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
    possible_level_range TEXT, -- e.g. 'A2-B1'
    confidence_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    scoring_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for assessment_attempts
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_id 
    ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_created_at 
    ON public.assessment_attempts(created_at DESC);

-- Enable RLS
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read & write their own attempts
DROP POLICY IF EXISTS "assessment_attempts_user_isolation" ON public.assessment_attempts;
CREATE POLICY "assessment_attempts_user_isolation"
    ON public.assessment_attempts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 2. BẢNG ASSESSMENT_RESPONSES (Lưu câu trả lời chi tiết từng câu để audit & review)
CREATE TABLE IF NOT EXISTS public.assessment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    skill TEXT NOT NULL, -- 'grammar', 'vocabulary', 'reading', 'listening', 'speaking'
    answer TEXT NOT NULL DEFAULT '',
    spoken_text TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    score INTEGER NOT NULL DEFAULT 0, -- 0 to 100
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for responses lookup by attempt
CREATE INDEX IF NOT EXISTS idx_assessment_responses_attempt_id 
    ON public.assessment_responses(attempt_id);

-- Enable RLS
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access responses through parent attempt ownership
DROP POLICY IF EXISTS "assessment_responses_user_isolation" ON public.assessment_responses;
CREATE POLICY "assessment_responses_user_isolation"
    ON public.assessment_responses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_attempts a
            WHERE a.id = assessment_responses.attempt_id
            AND a.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessment_attempts a
            WHERE a.id = assessment_responses.attempt_id
            AND a.user_id = auth.uid()
        )
    );


-- 3. BẢNG ASSESSMENT_RESULTS (Lưu tổng kết điểm từng kỹ năng, radar và gợi ý học)
CREATE TABLE IF NOT EXISTS public.assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
    grammar_score INTEGER NOT NULL DEFAULT 0,
    vocabulary_score INTEGER NOT NULL DEFAULT 0,
    reading_score INTEGER NOT NULL DEFAULT 0,
    listening_score INTEGER NOT NULL DEFAULT 0,
    speaking_score INTEGER NOT NULL DEFAULT 0,
    assessed_skills TEXT[] NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    result_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for results lookup by attempt
CREATE INDEX IF NOT EXISTS idx_assessment_results_attempt_id 
    ON public.assessment_results(attempt_id);

-- Enable RLS
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access results through parent attempt ownership
DROP POLICY IF EXISTS "assessment_results_user_isolation" ON public.assessment_results;
CREATE POLICY "assessment_results_user_isolation"
    ON public.assessment_results
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_attempts a
            WHERE a.id = assessment_results.attempt_id
            AND a.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessment_attempts a
            WHERE a.id = assessment_results.attempt_id
            AND a.user_id = auth.uid()
        )
    );

-- =============================================================================
-- ROLLBACK SCRIPT (Run only to reverse this migration):
-- DROP TABLE IF EXISTS public.assessment_results CASCADE;
-- DROP TABLE IF EXISTS public.assessment_responses CASCADE;
-- DROP TABLE IF EXISTS public.assessment_attempts CASCADE;
-- =============================================================================
