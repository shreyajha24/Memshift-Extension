-- ==============================================================================
-- MemShift Database Schema: Migration 001 - Initial Relational Schema
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Sources Table
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'article', 'documentation', 'github', 'generic')),
    platform TEXT NOT NULL,
    title TEXT,
    author TEXT,
    channel TEXT,
    favicon_url TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_canonical_url UNIQUE (user_id, canonical_url)
);

CREATE TRIGGER trigger_sources_updated_at
    BEFORE UPDATE ON public.sources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Captures Table
CREATE TABLE IF NOT EXISTS public.captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    content TEXT,
    excerpt TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    engagement_timestamp_seconds INTEGER CHECK (engagement_timestamp_seconds >= 0),
    engagement_duration_seconds INTEGER CHECK (engagement_duration_seconds >= 0),
    priority_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (priority_score >= 0.00 AND priority_score <= 100.00),
    capture_method TEXT NOT NULL DEFAULT 'manual' CHECK (capture_method IN ('manual', 'auto_detect')),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trigger_captures_updated_at
    BEFORE UPDATE ON public.captures
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Capture Privacy Table (Audit record of extracted fields)
CREATE TABLE IF NOT EXISTS public.capture_privacy (
    capture_id UUID PRIMARY KEY REFERENCES public.captures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript_captured BOOLEAN NOT NULL DEFAULT false,
    full_text_captured BOOLEAN NOT NULL DEFAULT false,
    metadata_captured BOOLEAN NOT NULL DEFAULT true,
    locally_processed BOOLEAN NOT NULL DEFAULT true,
    backend_synced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_topic_normalized_name UNIQUE (user_id, normalized_name)
);

CREATE TRIGGER trigger_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Concepts Table
CREATE TABLE IF NOT EXISTS public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_concept_normalized_name UNIQUE (user_id, normalized_name)
);

CREATE TRIGGER trigger_concepts_updated_at
    BEFORE UPDATE ON public.concepts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Capture Topics Join Table
CREATE TABLE IF NOT EXISTS public.capture_topics (
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0.000 AND confidence <= 1.000),
    source TEXT NOT NULL CHECK (source IN ('user', 'ai', 'keyword', 'system')),
    PRIMARY KEY (capture_id, topic_id)
);

-- 8. Capture Concepts Join Table
CREATE TABLE IF NOT EXISTS public.capture_concepts (
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0.000 AND confidence <= 1.000),
    source TEXT NOT NULL CHECK (source IN ('user', 'ai', 'keyword', 'system')),
    PRIMARY KEY (capture_id, concept_id)
);

-- 9. Sync Queue Table
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capture_id UUID REFERENCES public.captures(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('upsert_capture', 'delete_capture', 'reprocess_ai')),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trigger_sync_queue_updated_at
    BEFORE UPDATE ON public.sync_queue
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Relational Indexes
CREATE INDEX IF NOT EXISTS idx_sources_user_canonical ON public.sources (user_id, canonical_url);
CREATE INDEX IF NOT EXISTS idx_sources_source_type ON public.sources (user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_captures_user_id ON public.captures (user_id);
CREATE INDEX IF NOT EXISTS idx_captures_source_id ON public.captures (source_id);
CREATE INDEX IF NOT EXISTS idx_captures_captured_at ON public.captures (user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_captures_priority ON public.captures (user_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_capture_topics_topic ON public.capture_topics (topic_id);
CREATE INDEX IF NOT EXISTS idx_capture_concepts_concept ON public.capture_concepts (concept_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue (user_id, status);
