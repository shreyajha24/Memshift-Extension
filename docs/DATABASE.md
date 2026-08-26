# MemShift Database Schema & Vector Search Architecture

## 1. System of Record: Supabase PostgreSQL + pgvector

MemShift uses **Supabase PostgreSQL** as the single canonical source of truth for all structured user data, relational knowledge connections, and vector embeddings.

### Why Relational PostgreSQL + pgvector?
1. **Unified Relational & Semantic Queries**: Personal memory requires structured filtering (by source type, author, date range, topic, priority) seamlessly combined with vector similarity.
2. **ACID Compliance & Cryptographic Isolation**: Strict foreign key constraints and Row Level Security (RLS) enforce complete user data isolation.
3. **No Distributed Synchronization Overhead**: Eliminates dual-write consistency issues between a primary database and an external vector database (e.g., Pinecone/Milvus).

---

## 2. Relational Schema Architecture

```
                    ┌─────────────────┐
                    │   auth.users    │
                    └────────┬────────┘
                             │ 1:1
                             ▼
                    ┌─────────────────┐
                    │    profiles     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │ 1:N               │ 1:N               │ 1:N
         ▼                   ▼                   ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   sources   │     │   topics    │     │  concepts   │
  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
         │ 1:N               │                   │
         ▼                   │ N:M               │ N:M
  ┌─────────────┐            │                   │
  │  captures   │◀───────────┼───────────────────┘
  └──────┬──────┘            │
         │                   ├─────────────────────────┐
         │ 1:1               ▼                         ▼
         ├───▶ ┌─────────────────────┐       ┌─────────────────────┐
         │     │   capture_privacy   │       │   capture_topics    │
         │     └─────────────────────┘       └─────────────────────┘
         │ 1:1                                         │
         ├───▶ ┌─────────────────────┐                 ▼
         │     │     embeddings      │       ┌─────────────────────┐
         │     └─────────────────────┘       │  capture_concepts   │
         │ 1:N                               └─────────────────────┘
         └───▶ ┌─────────────────────┐
               │     sync_queue      │
               └─────────────────────┘

               ┌─────────────────────┐
               │   knowledge_edges   │ (Graph: Source, Capture, Topic, Concept)
               └─────────────────────┘
```

---

## 3. Table Definitions & Constraints

### 3.1 `profiles`
Extends `auth.users` with user profile settings.
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 3.2 `sources`
Canonical web origin and platform metadata.
```sql
CREATE TABLE public.sources (
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
```

### 3.3 `captures`
The primary atomic unit of user memory.
```sql
CREATE TABLE public.captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    content TEXT,
    excerpt TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    engagement_timestamp_seconds INTEGER CHECK (engagement_timestamp_seconds >= 0),
    engagement_duration_seconds INTEGER CHECK (engagement_duration_seconds >= 0),
    priority_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (priority_score >= 0 AND priority_score <= 100),
    capture_method TEXT NOT NULL DEFAULT 'automatic' CHECK (capture_method IN ('automatic')),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 3.4 `capture_privacy`
Audit trail of what was extracted for each capture.
```sql
CREATE TABLE public.capture_privacy (
    capture_id UUID PRIMARY KEY REFERENCES public.captures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript_captured BOOLEAN NOT NULL DEFAULT false,
    full_text_captured BOOLEAN NOT NULL DEFAULT false,
    metadata_captured BOOLEAN NOT NULL DEFAULT true,
    locally_processed BOOLEAN NOT NULL DEFAULT true,
    backend_synced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 3.5 `topics` & `concepts`
Taxonomical entities representing domains and granular ideas.
```sql
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_topic_name UNIQUE (user_id, normalized_name)
);

CREATE TABLE public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_concept_name UNIQUE (user_id, normalized_name)
);
```

### 3.6 `capture_topics` & `capture_concepts`
Join tables with confidence scoring and attribution source.
```sql
CREATE TABLE public.capture_topics (
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1.0),
    source TEXT NOT NULL CHECK (source IN ('user', 'ai', 'keyword', 'system')),
    PRIMARY KEY (capture_id, topic_id)
);

CREATE TABLE public.capture_concepts (
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1.0),
    source TEXT NOT NULL CHECK (source IN ('user', 'ai', 'keyword', 'system')),
    PRIMARY KEY (capture_id, concept_id)
);
```

### 3.7 `knowledge_edges`
Knowledge graph connections between nodes.
```sql
CREATE TABLE public.knowledge_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_type TEXT NOT NULL CHECK (from_type IN ('topic', 'concept', 'source', 'capture')),
    from_id UUID NOT NULL,
    to_type TEXT NOT NULL CHECK (to_type IN ('topic', 'concept', 'source', 'capture')),
    to_id UUID NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('contains', 'related_to', 'derived_from', 'supports', 'contradicts', 'similar_to')),
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_knowledge_edge UNIQUE (user_id, from_type, from_id, to_type, to_id, relationship)
);
```

### 3.8 `embeddings`
pgvector embeddings table.
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Canonical Model: text-embedding-3-small (1536 dimensions)
CREATE TABLE public.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_capture_embedding UNIQUE (capture_id)
);
```

---

## 4. Vector & Full-Text Search Strategy

### 4.1 Indexing Strategy
```sql
-- Relational & foreign key performance
CREATE INDEX idx_captures_user_id ON public.captures(user_id);
CREATE INDEX idx_captures_source_id ON public.captures(source_id);
CREATE INDEX idx_captures_captured_at ON public.captures(captured_at DESC);
CREATE INDEX idx_sources_user_canonical ON public.sources(user_id, canonical_url);
CREATE INDEX idx_knowledge_edges_from ON public.knowledge_edges(user_id, from_type, from_id);
CREATE INDEX idx_knowledge_edges_to ON public.knowledge_edges(user_id, to_type, to_id);

-- PostgreSQL Full-Text Search index (GIN)
CREATE INDEX idx_captures_fts ON public.captures 
    USING gin(to_tsvector('english', coalesce(content, '') || ' ' || coalesce(excerpt, '')));

-- Vector Similarity Index (HNSW with Cosine distance)
CREATE INDEX idx_embeddings_hnsw_cosine ON public.embeddings 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
```

---

## 5. Hybrid Search Formula & RPC Function

MemShift implements a configurable hybrid scoring formula:

$$\text{Final Score} = w_{\text{semantic}} \cdot S_{\text{cosine}} + w_{\text{keyword}} \cdot S_{\text{tsrank}} + w_{\text{topic}} \cdot S_{\text{topic}} + w_{\text{priority}} \cdot \left(\frac{P}{100}\right) + w_{\text{recency}} \cdot R$$

### Default Configuration Weights:
- $w_{\text{semantic}} = 0.45$
- $w_{\text{keyword}} = 0.25$
- $w_{\text{topic}} = 0.15$
- $w_{\text{priority}} = 0.10$
- $w_{\text{recency}} = 0.05$

### Hybrid Search RPC Function: `match_memories_hybrid`
```sql
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
            c.excerpt,
            c.captured_at,
            c.engagement_timestamp_seconds,
            c.priority_score,
            -- Cosine similarity: 1 - cosine distance
            COALESCE(1 - (e.embedding <=> query_embedding), 0.0)::NUMERIC AS semantic_score,
            -- Full text ts_rank normalized
            COALESCE(ts_rank_cd(
                to_tsvector('english', coalesce(s.title, '') || ' ' || coalesce(c.excerpt, '') || ' ' || coalesce(c.content, '')),
                plainto_tsquery('english', query_text)
            ), 0.0)::NUMERIC AS keyword_score,
            -- Recency decay: exp(-days / 365)
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
```
