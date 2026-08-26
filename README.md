# MemShift — Your Internet Memory

> **Privacy-first personal memory layer for the internet.**
> Official Chrome / Chromium Browser Extension & Supabase Backend Architecture.

---

## 1. Overview

MemShift turns useful insights from web browsing into a structured, interconnected, and instantly recallable personal knowledge graph.

### The Core Loop
```
CONSUME ──▶ CAPTURE ──▶ UNDERSTAND ──▶ CONNECT ──▶ REMEMBER ──▶ RECALL
 (Browser)   (Extension)   (Local+AI)    (Graph)    (Database)    (Hybrid Search)
```

- **Browser Extension**: Responsible for **Capture + Local Understanding**.
- **Supabase PostgreSQL & pgvector**: Responsible for **Connect + Remember + Recall**.

---

## 2. Key Features

- **Toggle-Controlled Automatic Capture**: When MemShift is ON, it extracts only eligible public knowledge pages; when OFF, it performs no extraction or sync.
- **YouTube Memory Anchors**: Captures playback timestamps (`12:43`) and optional transcripts without third-party scrapers.
- **Noise-Free Web Extraction**: Strips ads, navigation bars, and cookie banners from technical articles.
- **Public GitHub Support**: Extracts repository documentation, README markdown, and code snippets safely.
- **Deterministic Local Relevance**: Instant 0–100% priority scoring matching user-defined learning keywords.
- **Local-First Capture**: Eligible content is processed and stored locally before optional backend synchronization.
- **Offline-First Resilience**: Local queue ensures captures are preserved if offline, automatically syncing when connected.
- **Hybrid Semantic Search**: Combines pgvector cosine similarity with PostgreSQL full-text keyword ranking.
- **Row Level Security (RLS)**: 100% user data isolation enforced cryptographically at the database level.

---

## 3. Project Structure

```text
memshift-extension/
├── public/
│   ├── manifest.json              # Manifest V3 (activeTab, scripting, storage)
│   └── icons/                     # Generated icon assets (16, 32, 48, 128px)
├── src/
│   ├── popup/                     # React 19 + Tailwind popup UI
│   │   ├── components/            # Master toggle, Preview, Options, Keywords
│   │   └── hooks/                 # Reactive settings and capture hooks
│   ├── background/                # Service worker, message router, offline sync
│   ├── content/                   # Source detector, YouTube, Web, GitHub extractors
│   ├── core/                      # Scorer, keyword matcher, deduplicator, builder
│   ├── storage/                   # Typed chrome.storage wrappers
│   ├── privacy/                   # Master toggle and boundary policies
│   ├── types/                     # Strict TypeScript interfaces
│   └── shared/                    # Constants, sanitizers, and utilities
├── supabase/
│   ├── config.toml                # Supabase CLI local configuration
│   ├── migrations/                # SQL schema, pgvector, RLS, Hybrid search, Graph
│   └── functions/                 # Deno Edge Functions (process-capture, embeddings, search)
├── docs/                          # Architecture, Database, Privacy, Security, API specs
└── tests/                         # Vitest unit and integration test suite
```

---

## 4. Getting Started

### 4.1 Prerequisites
- **Node.js**: v18+ (tested on v24.x)
- **npm**: v9+
- **Supabase CLI** (optional, for local backend development)

### 4.2 Installation
```bash
# Clone the repository
git clone https://github.com/JasvinderKaur77/memshift-extension.git
cd memshift-extension

# Install dependencies
npm install

# Generate icon assets (if needed)
npm run generate-icons
```

### 4.3 Running Unit & Integration Tests
```bash
npm test
```

### 4.4 Building the Extension
```bash
npm run build
```
This outputs the complete Manifest V3 extension bundle into the `dist/` directory.

---

## 5. Loading Unpacked Extension in Chrome / Edge / Brave

1. Open your browser and navigate to the extension management page:
   - **Google Chrome**: `chrome://extensions/`
   - **Microsoft Edge**: `edge://extensions/`
   - **Brave Browser**: `brave://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` folder inside this repository.
5. Click the MemShift icon in your browser toolbar to launch!

---

## 6. Supabase Database & Migrations

MemShift database changes are strictly version-controlled via SQL migrations:

```bash
# Local Supabase development
supabase start

# Apply migrations
supabase db reset

# Deploy Edge Functions
supabase functions deploy process-capture
supabase functions deploy generate-embedding
supabase functions deploy search-memory
```

### Migration Order:
1. `001_initial_schema.sql` — Profiles, sources, captures, topics, concepts, sync queue.
2. `002_pgvector.sql` — pgvector extension and 1536-dimensional embeddings table.
3. `003_rls.sql` — Row Level Security policies guaranteeing user isolation.
4. `004_search.sql` — Full-text GIN indexes & `match_memories_hybrid` search RPC.
5. `005_knowledge_graph.sql` — `knowledge_edges` table and graph traversal RPCs.

---

## 7. Security & Privacy Guarantees

- **No Secrets in Extension**: The browser bundle contains zero service role keys or AI provider secrets.
- **Untrusted Client Protection**: Identity is cryptographically verified from the Supabase Auth JWT (`auth.uid()`).
- **No Background Scraping**: Tab content is read solely upon user interaction.
- **Content Limits**: Strict bounds on text payload lengths to prevent denial-of-service.

---

## 8. Documentation

Detailed architectural and operational documentation is available in `docs/`:
- [FeedBrain Historical Context & Analysis](docs/FEEDBRAIN_REFERENCE.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Database Schema & Search Strategy](docs/DATABASE.md)
- [Privacy Policy & Guarantees](docs/PRIVACY.md)
- [Security & Threat Model](docs/SECURITY.md)
- [API & Edge Functions Contract](docs/API.md)
- [Chrome Web Store Listing Metadata](CHROMEWEBSTORE.md)

---

## 9. License
MIT License.
