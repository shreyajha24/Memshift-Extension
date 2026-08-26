# MemShift Backend API & Edge Functions Specification

## 1. Overview

The MemShift API provides authenticated endpoints exposed via **Supabase Edge Functions** (Deno/TypeScript) and PostgreSQL RPCs.

### Authentication
All requests must include a valid Supabase JWT Bearer token:
```http
Authorization: Bearer <SUPABASE_USER_JWT>
Content-Type: application/json
```

---

## 2. Endpoints

### 2.1 `POST /captures`
Creates a new atomic knowledge capture and deduplicates/associates the source.

#### Request Body
```json
{
  "source": {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "canonicalUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "sourceType": "youtube",
    "platform": "YouTube",
    "title": "Rick Astley - Never Gonna Give You Up",
    "author": "Rick Astley",
    "channel": "RickAstleyVEVO",
    "faviconUrl": "https://www.youtube.com/favicon.ico",
    "publishedAt": "2009-10-25T06:57:33Z"
  },
  "content": {
    "text": "Full extracted text or transcript summary...",
    "excerpt": "Never gonna give you up, never gonna let you down..."
  },
  "engagement": {
    "currentTimestampSeconds": 142,
    "engagementDurationSeconds": 212
  },
  "intelligence": {
    "priorityScore": 85.5,
    "matchedKeywords": ["Music", "80s"],
    "topicCandidates": ["Pop Music", "Internet Culture"]
  },
  "privacy": {
    "transcriptCaptured": false,
    "fullTextCaptured": true,
    "metadataCaptured": true,
    "locallyProcessed": true,
    "backendSynced": true
  },
  "captureMethod": "automatic"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "captureId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "sourceId": "550e8400-e29b-41d4-a716-446655440000",
  "processingStatus": "pending",
  "message": "Saved to your memory."
}
```

---

### 2.2 `GET /captures`
List user's captures with pagination and filtering.

#### Query Parameters
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `sourceType` (optional filter: `youtube`, `article`, `github`, `documentation`, `generic`)
- `topicId` (optional UUID)

#### Response (`200 OK`)
```json
{
  "captures": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "source": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Redis Explained in 10 Minutes",
        "url": "https://youtube.com/watch?v=redis",
        "sourceType": "youtube",
        "platform": "YouTube"
      },
      "excerpt": "In-memory key-value store architecture...",
      "priorityScore": 92.0,
      "engagementTimestampSeconds": 340,
      "capturedAt": "2026-08-26T12:00:00Z",
      "processingStatus": "completed"
    }
  ],
  "total": 42
}
```

---

### 2.3 `POST /captures/:id/process`
Triggers server-side NLP extraction and embedding generation.

#### Response (`200 OK`)
```json
{
  "success": true,
  "captureId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "extractedTopics": ["Redis", "Caching", "System Design"],
  "extractedConcepts": ["In-Memory Storage", "Sub-millisecond Latency"],
  "embeddingGenerated": true,
  "processingStatus": "completed"
}
```

---

### 2.4 `POST /memory/search`
Hybrid search across semantic vectors, full-text tokens, topics, and recency.

#### Request Body
```json
{
  "query": "Spring Boot dependency injection video",
  "filters": {
    "sourceType": "youtube",
    "dateFrom": "2026-01-01T00:00:00Z"
  },
  "weights": {
    "semantic": 0.45,
    "keyword": 0.25,
    "topic": 0.15,
    "priority": 0.10,
    "recency": 0.05
  },
  "limit": 10
}
```

#### Response (`200 OK`)
```json
{
  "results": [
    {
      "captureId": "a1b2c3d4-...",
      "sourceId": "e5f6g7h8-...",
      "title": "Spring Boot Tutorial: Dependency Injection & IoC Container",
      "url": "https://youtube.com/watch?v=spring-di",
      "sourceType": "youtube",
      "excerpt": "How the Spring container manages bean lifecycle...",
      "engagementTimestampSeconds": 763,
      "semanticScore": 0.932,
      "keywordScore": 0.884,
      "combinedScore": 0.912,
      "capturedAt": "2026-08-15T09:30:00Z"
    }
  ]
}
```

---

### 2.5 `GET /memory/related/:id`
Finds conceptually and semantically related memories connected in the knowledge graph.

#### Response (`200 OK`)
```json
{
  "captureId": "a1b2c3d4-...",
  "relatedMemories": [
    {
      "captureId": "f9e8d7c6-...",
      "title": "Spring Framework IoC Container Architecture",
      "sourceType": "article",
      "relationship": "related_to",
      "sharedConcepts": ["Inversion of Control", "Dependency Injection"],
      "similarityScore": 0.89
    }
  ]
}
```
