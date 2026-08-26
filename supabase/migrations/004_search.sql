-- ==============================================================================
-- MemShift Database Schema: Migration 004 - Full-Text & Hybrid Vector Search
-- ==============================================================================

-- 1. Full-Text Search GIN Index
CREATE INDEX IF NOT EXISTS idx_captures_fts ON public.captures
    USING gin(to_tsvector('english', coalesce(content, '') || ' ' || coalesce(excerpt, '')));

CREATE INDEX IF NOT EXISTS idx_sources_title_fts ON public.sources
    USING gin(to_tsvector('english', coalesce(title, '')));

-- 2. Hybrid Search RPC Function
CREATE OR REPLACE FUNCTION public.match_memories_hybrid(
    query_embedding vector(1536),
    query_text TEXT,
    filter_source_type TEXT DEFAULT NULL,
    semantic_weight NUMERIC DEFAULT 0.45,
    keyword_weight NUMERIC DEFAULT 0.25,
    topic_weight NUMERIC DEFAULT 0.15,
    priority_weight NUMERIC DEFAULT 0.10,
    recency_weight NUMERIC DEFAULT 0.05,
    match_limit INT DEFAULT 20
)
RETURNS TABLE (
    capture_id UUID,
    source_id UUID,
    title TEXT,
    url TEXT,
    source_type TEXT,
    platform TEXT,
    excerpt TEXT,
    captured_at TIMESTAMPTZ,
    engagement_timestamp_seconds INT,
    priority_score NUMERIC,
    semantic_score NUMERIC,
    keyword_score NUMERIC,
    combined_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid UUID := auth.uid();
BEGIN
    RETURN QUERY
    WITH scored_records AS (
        SELECT
            c.id AS capture_id,
            s.id AS source_id,
            s.title,
            s.url,
            s.source_type,
            s.platform,
            c.excerpt,
            c.captured_at,
            c.engagement_timestamp_seconds,
            c.priority_score,
            -- Cosine similarity: 1 - cosine distance (0.0 to 1.0)
            COALESCE(1.0 - (e.embedding <=> query_embedding), 0.0)::NUMERIC AS semantic_score,
            -- Normalized Full-text search ranking
            COALESCE(ts_rank_cd(
                to_tsvector('english', coalesce(s.title, '') || ' ' || coalesce(c.excerpt, '') || ' ' || coalesce(c.content, '')),
                plainto_tsquery('english', query_text)
            ), 0.0)::NUMERIC AS keyword_score,
            -- Exponential Recency decay over 1 year (365 days)
            EXP(-EXTRACT(EPOCH FROM (now() - c.captured_at)) / (86400.0 * 365.0))::NUMERIC AS recency_score
        FROM public.captures c
        JOIN public.sources s ON s.id = c.source_id
        LEFT JOIN public.embeddings e ON e.capture_id = c.id
        WHERE c.user_id = current_uid
          AND (filter_source_type IS NULL OR s.source_type = filter_source_type)
    )
    SELECT
        sr.capture_id,
        sr.source_id,
        sr.title,
        sr.url,
        sr.source_type,
        sr.platform,
        sr.excerpt,
        sr.captured_at,
        sr.engagement_timestamp_seconds,
        sr.priority_score,
        sr.semantic_score,
        sr.keyword_score,
        (
            semantic_weight * sr.semantic_score +
            keyword_weight * LEAST(sr.keyword_score, 1.0) +
            priority_weight * (sr.priority_score / 100.0) +
            recency_weight * sr.recency_score
        )::NUMERIC AS combined_score
    FROM scored_records sr
    ORDER BY combined_score DESC
    LIMIT match_limit;
END;
$$;

-- 3. Related Memories RPC Function
CREATE OR REPLACE FUNCTION public.get_related_memories(
    target_capture_id UUID,
    similarity_threshold NUMERIC DEFAULT 0.70,
    match_limit INT DEFAULT 5
)
RETURNS TABLE (
    capture_id UUID,
    title TEXT,
    url TEXT,
    source_type TEXT,
    excerpt TEXT,
    similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_embedding vector(1536);
    current_uid UUID := auth.uid();
BEGIN
    -- Fetch target capture embedding
    SELECT e.embedding INTO target_embedding
    FROM public.embeddings e
    WHERE e.capture_id = target_capture_id AND e.user_id = current_uid;

    IF target_embedding IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        c.id AS capture_id,
        s.title,
        s.url,
        s.source_type,
        c.excerpt,
        (1.0 - (e.embedding <=> target_embedding))::NUMERIC AS similarity
    FROM public.embeddings e
    JOIN public.captures c ON c.id = e.capture_id
    JOIN public.sources s ON s.id = c.source_id
    WHERE e.user_id = current_uid
      AND e.capture_id != target_capture_id
      AND (1.0 - (e.embedding <=> target_embedding)) >= similarity_threshold
    ORDER BY similarity DESC
    LIMIT match_limit;
END;
$$;
