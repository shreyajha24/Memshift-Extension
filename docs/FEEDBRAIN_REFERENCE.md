# FeedBrain Historical Reference & Architectural Analysis

## 1. Executive Summary

MemShift was originally conceptualized under the working name **FeedBrain** ([Historical Repository](https://github.com/JasvinderKaur77/FeedBrain)). 

While FeedBrain explored the initial friction of online knowledge retention, its architecture was that of an experimental prototype: monolithic state, generic bookmarking patterns, unauthenticated local data stores, lack of relational schemas, and absence of a verifiable privacy model.

**MemShift is a ground-up redesign and complete re-architecture.** It is **not** a migration or UI reskin of FeedBrain. This document preserves the domain insights discovered during the FeedBrain exploration while establishing why MemShift's architecture fundamentally diverges.

---

## 2. The Core Problem & The Paradigm Shift

### The Shared Problem Statement
Every day, developers, researchers, and knowledge workers consume high-value digital content:
- In-depth architectural YouTube breakdowns
- Technical engineering documentation
- Open-source GitHub repositories and pull requests
- Research preprints and long-form technical blogs

Inevitably, they face the *Memory Recall Crisis*:
> *"I know I saw an elegant pattern for distributed cache invalidation somewhere two weeks ago, but where?"*

### Why FeedBrain Failed to Solve This
| Dimension | FeedBrain (Historical Prototype) | MemShift (Production System) |
|---|---|---|
| **Product Metaphor** | Enhanced bookmark manager / read-later list | Privacy-first personal memory layer |
| **Capture Trigger** | Implicit / passive page tracking concepts | **Strictly explicit user intent** (Zero silent tracking) |
| **Trust Model** | Monolithic client bundle with arbitrary storage | Hardened trust boundary (Client = capture only, Backend = intelligence) |
| **Data Storage** | Ad-hoc JSON blobs / localStorage | **Relational Supabase PostgreSQL + pgvector** |
| **Search Paradigm** | Simple string substring matching | **Hybrid Search**: Semantic (pgvector) + Full-Text (tsvector) + Graph Proximity |
| **Knowledge Structuring** | Flat tag lists | **6 MemShift Knowledge Systems** (Topics, Concepts, Knowledge Graph Edges) |
| **Privacy Guarantee** | Unenforced promises | Cryptographic user isolation via Row Level Security (RLS) & local-first processing |

---

## 3. Reusable Domain Insights from FeedBrain

While the FeedBrain codebase is obsolete and not reused, several product and domain insights remain valid and informed the MemShift design:

1. **YouTube Playback Timestamps as Memory Anchors**:
   - In video content, the entire 60-minute video is rarely the memory. The specific 2-minute explanation at `14:22` is what clicked.
   - *MemShift Adoption*: YouTube captures preserve `engagement_timestamp_seconds`, enabling multiple distinct capture moments on the same video resource without collision.

2. **Noise Reduction in Technical Articles**:
   - Raw HTML scraping captures navigation bars, cookie banners, advertisements, and footer links that pollute vector embeddings and search indexes.
   - *MemShift Adoption*: Local DOM sanitization removes non-content elements before generating excerpts and full-text payloads.

3. **Deterministic Local Relevance**:
   - Users know their active learning domains (e.g., `Spring Boot`, `Kubernetes`, `System Design`, `OAuth2`).
   - *MemShift Adoption*: Deterministic keyword scoring occurs instantly on the client prior to any backend transmission, offering immediate relevance feedback (0–100%).

4. **Multi-Source Knowledge Synthesis**:
   - Concepts do not live in isolation; a concept introduced in a video often links to an article read a week later and a GitHub repository explored today.
   - *MemShift Adoption*: First-class `sources`, `topics`, `concepts`, and `knowledge_edges` tables.

---

## 4. What Was Completely Discarded

1. **Monolithic Extension Logic**: FeedBrain attempted to run AI operations, storage, and UI in an unconstrained client context. Discarded in favor of a strict separation of concerns.
2. **Exposing API Keys in Extension Bundles**: Discarded. The extension is an untrusted public client. All AI and embedding operations are handled via authenticated Supabase Edge Functions.
3. **Flat JSON Storage**: Discarded. Replaced with a fully normalized PostgreSQL schema with strong relational integrity and strict foreign keys.
4. **Passive Page Monitoring**: Discarded. MemShift requires explicit user capture actions (`activeTab` scoped).

---

## 5. Architectural Comparison Summary

```
FeedBrain (Deprecated):
Browser Page ──> Content Script (Reads everything) ──> Local Storage / Direct Unauthenticated Cloud (Flat JSON)

MemShift (Current):
[User Intent] ──> activeTab Scoped Extractor ──> Local Sanitization ──> Capture Preview (User Confirmation)
                         │
                         ▼
        Background Service Worker (Offline Queue / Auth)
                         │ (HTTPS + Bearer Token)
                         ▼
             MemShift Supabase Edge Functions
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
PostgreSQL Relational Storage       pgvector & Knowledge Graph
(captures, sources, topics)        (embeddings, concepts, edges)
```
