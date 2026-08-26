-- ==============================================================================
-- MemShift Database Schema: Migration 003 - Row Level Security (RLS)
-- ==============================================================================

-- 1. Profiles Table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- 2. Sources Table RLS
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources_select_own" ON public.sources
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sources_insert_own" ON public.sources
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sources_update_own" ON public.sources
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sources_delete_own" ON public.sources
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Captures Table RLS
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "captures_select_own" ON public.captures
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "captures_insert_own" ON public.captures
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captures_update_own" ON public.captures
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captures_delete_own" ON public.captures
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Capture Privacy Table RLS
ALTER TABLE public.capture_privacy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capture_privacy_select_own" ON public.capture_privacy
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "capture_privacy_insert_own" ON public.capture_privacy
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "capture_privacy_update_own" ON public.capture_privacy
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "capture_privacy_delete_own" ON public.capture_privacy
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Topics Table RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_select_own" ON public.topics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "topics_insert_own" ON public.topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topics_update_own" ON public.topics
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topics_delete_own" ON public.topics
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Concepts Table RLS
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concepts_select_own" ON public.concepts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "concepts_insert_own" ON public.concepts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concepts_update_own" ON public.concepts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concepts_delete_own" ON public.concepts
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Capture Topics Table RLS
ALTER TABLE public.capture_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capture_topics_select_own" ON public.capture_topics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "capture_topics_insert_own" ON public.capture_topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "capture_topics_update_own" ON public.capture_topics
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "capture_topics_delete_own" ON public.capture_topics
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Capture Concepts Table RLS
ALTER TABLE public.capture_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capture_concepts_select_own" ON public.capture_concepts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "capture_concepts_insert_own" ON public.capture_concepts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "capture_concepts_update_own" ON public.capture_concepts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "capture_concepts_delete_own" ON public.capture_concepts
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Sync Queue Table RLS
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_queue_select_own" ON public.sync_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sync_queue_insert_own" ON public.sync_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_queue_update_own" ON public.sync_queue
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_queue_delete_own" ON public.sync_queue
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Embeddings Table RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeddings_select_own" ON public.embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "embeddings_insert_own" ON public.embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "embeddings_update_own" ON public.embeddings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "embeddings_delete_own" ON public.embeddings
    FOR DELETE USING (auth.uid() = user_id);
