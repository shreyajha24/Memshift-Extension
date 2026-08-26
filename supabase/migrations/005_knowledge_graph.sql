-- ==============================================================================
-- MemShift Database Schema: Migration 005 - Knowledge Graph Edges & Relationships
-- ==============================================================================

-- 1. Knowledge Edges Table
CREATE TABLE IF NOT EXISTS public.knowledge_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_type TEXT NOT NULL CHECK (from_type IN ('topic', 'concept', 'source', 'capture')),
    from_id UUID NOT NULL,
    to_type TEXT NOT NULL CHECK (to_type IN ('topic', 'concept', 'source', 'capture')),
    to_id UUID NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('contains', 'related_to', 'derived_from', 'supports', 'contradicts', 'similar_to')),
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0.000 AND confidence <= 1.000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_knowledge_edge UNIQUE (user_id, from_type, from_id, to_type, to_id, relationship)
);

-- 2. Knowledge Edges Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_user_id ON public.knowledge_edges (user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_from ON public.knowledge_edges (user_id, from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_to ON public.knowledge_edges (user_id, to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_relationship ON public.knowledge_edges (user_id, relationship);

-- 3. Knowledge Edges RLS
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_edges_select_own" ON public.knowledge_edges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "knowledge_edges_insert_own" ON public.knowledge_edges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "knowledge_edges_update_own" ON public.knowledge_edges
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "knowledge_edges_delete_own" ON public.knowledge_edges
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Knowledge Graph Traversal RPC
CREATE OR REPLACE FUNCTION public.get_knowledge_neighbors(
    node_type TEXT,
    node_id UUID
)
RETURNS TABLE (
    edge_id UUID,
    neighbor_type TEXT,
    neighbor_id UUID,
    relationship TEXT,
    confidence NUMERIC,
    direction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid UUID := auth.uid();
BEGIN
    RETURN QUERY
    -- Outgoing edges
    SELECT
        ke.id AS edge_id,
        ke.to_type AS neighbor_type,
        ke.to_id AS neighbor_id,
        ke.relationship,
        ke.confidence,
        'outgoing'::TEXT AS direction
    FROM public.knowledge_edges ke
    WHERE ke.user_id = current_uid
      AND ke.from_type = node_type
      AND ke.from_id = node_id

    UNION ALL

    -- Incoming edges
    SELECT
        ke.id AS edge_id,
        ke.from_type AS neighbor_type,
        ke.from_id AS neighbor_id,
        ke.relationship,
        ke.confidence,
        'incoming'::TEXT AS direction
    FROM public.knowledge_edges ke
    WHERE ke.user_id = current_uid
      AND ke.to_type = node_type
      AND ke.to_id = node_id;
END;
$$;
