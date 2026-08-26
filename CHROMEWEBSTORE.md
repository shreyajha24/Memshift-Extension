# Chrome Web Store Listing & Store Metadata

> Single source of truth for the Chrome Developer Dashboard submission for **MemShift — Your Internet Memory**.

---

## 1. Extension Metadata

- **Extension Name**: MemShift — Your Internet Memory
- **Short Name**: MemShift
- **Version**: 1.0.0
- **Primary Category**: Productivity
- **Secondary Category**: Search Tools
- **Language**: English

---

## 2. Store Descriptions

### 2.1 Short Description (Max 132 characters)
Capture what matters on the internet and turn it into lasting, interconnected personal memory with privacy-first AI knowledge recall.

### 2.2 Detailed Store Description
**MemShift is your privacy-first personal memory layer for the internet.**

Every day you encounter game-changing insights: deep architectural YouTube videos, crucial GitHub repositories, authoritative documentation, and technical blog posts. Days or weeks later, you find yourself thinking: *"I know I saw an answer to this somewhere."*

Traditional bookmarks get buried. Browser history collects thousands of irrelevant pages. Read-later apps turn into endless digital hoarding lists.

MemShift is fundamentally different: it captures **only what you intentionally choose to remember**, extracts the key concepts locally, links them to what you already know, and lets you find anything instantly using hybrid semantic and keyword search.

#### Key Features:
- **Instant Intentional Capture**: One-click capture with activeTab privacy. Zero background monitoring, zero silent history tracking.
- **YouTube Memory Anchors**: Captures the exact playback timestamp where an insight occurred, not just the entire video.
- **Noise-Free Content Extraction**: Automatically strips cookie banners, advertisements, and navigation bars from technical articles.
- **Public GitHub Extraction**: Extracts repository documentation, README markdown, and code snippets seamlessly.
- **Deterministic Local Relevance**: Define your priority topics (e.g., *Spring Boot, Redis, Distributed Systems*) and see immediate relevance scoring (0–100%).
- **Pre-Capture Preview**: Review title, source, extracted topics, and priority before saving anything.
- **Hybrid Semantic Search**: Combines pgvector semantic understanding with PostgreSQL full-text keyword precision.
- **Knowledge Graph Connections**: Automatically maps relationships between concepts, topics, and sources.
- **Offline Reliability**: Capture locally even without an internet connection — automatic sync resumes when you're back online.

---

## 3. Permissions Justification

| Permission | Review Team Plain-English Justification |
|---|---|
| `activeTab` | Required to temporarily access the URL, title, and DOM of the currently active tab exclusively when the user clicks the extension action or capture button. No access is granted to inactive tabs or background browsing. |
| `scripting` | Required to execute the local content extractor function into the active tab to extract article text, YouTube timestamps, or GitHub documentation upon explicit user request. |
| `storage` | Required to store user settings, priority keywords, offline capture queue, and session state locally in `chrome.storage.local`. |

---

## 4. Privacy & Data Use Disclosure

- **Single Purpose**: Personal knowledge capture and structured memory recall.
- **Data Collection Summary**:
  - *Web Page Content*: Extracted only on explicit user capture command, processed locally, and stored in user's isolated account.
  - *No Silent Tracking*: The extension never collects or logs browsing history, search history, or visits to non-captured pages.
  - *No Sale of Data*: User data is never sold, transferred, or monetized for advertising.
  - *No Unrelated Uses*: Data is used strictly for personal memory storage and retrieval.

---

## 5. Version History

- **v1.0.0 (Initial Production Release - August 2026)**:
  - Ground-up Manifest V3 architecture.
  - YouTube timestamp & optional transcript extraction.
  - Clean article DOM readability extraction.
  - Public GitHub repository documentation parser.
  - Local relevance scoring with user priority keywords.
  - Capture preview modal.
  - Supabase PostgreSQL + pgvector integration.
  - Offline capture queue and background sync.
