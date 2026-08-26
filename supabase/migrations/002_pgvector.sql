-- ==============================================================================
-- MemShift Database Schema: Migration 002 - pgvector & Semantic Embeddings
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Embeddings Table
-- Central configuration standard: 1536 dimensions (text-embedding-3-small / standard high-accuracy embeddings)
CREATE TABLE IF NOT EXISTS public.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_capture_embedding UNIQUE (capture_id)
);

-- 3. Indexes for Vector Search and Joins
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON public.embeddings (user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_capture_id ON public.embeddings (capture_id);

-- HNSW Vector Cosine Distance Index
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw_cosine ON public.embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
