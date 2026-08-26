# MemShift Privacy Policy & Architecture

## 1. The Core Privacy Principle

> **"MemShift remembers only what you choose to remember."**

MemShift is not a browsing tracker, not a history aggregator, and not a background telemetry agent. We hold privacy as an immutable architectural requirement across both the browser extension and backend infrastructure.

---

## 2. Fundamental Privacy Invariants

1. **Zero Silent Tracking**: MemShift never observes, logs, or transmits URLs or pages visited during normal web browsing.
2. **Zero Automatic History Collection**: We do not request or use the `chrome.history` API.
3. **Zero Bookmark Harvesting**: We do not request or use the `chrome.bookmarks` API.
4. **Explicit User Intent**: The extension only activates when the user explicitly triggers an action (e.g., clicking the popup "Capture" button or keyboard shortcut).
5. **Scoped Tab Access (`activeTab`)**: We do not request broad `<all_urls>` host permissions. The extension receives temporary, scoped access exclusively to the active tab upon user interaction.
6. **Local-First Processing**: Content extraction, HTML sanitization, and relevance scoring execute entirely locally on the user's device before any remote transmission.
7. **Granular Extraction Controls**: Users maintain discrete toggles for video transcripts, article full-text, and remote backend synchronization.
8. **Master Toggle Gate**: When the Master Toggle is disabled, all extraction, injection, synchronization, and storage routines are immediately suspended.

---

## 3. Data Flow & Boundary Isolation

```
                                  [ User Intent ]
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │    Active Browser     │
                             │       DOM Scope       │
                             └───────────┬───────────┘
                                         │ (DOM Read Only)
                                         ▼
                             ┌───────────────────────┐
                             │ Local Content Script  │
                             │  • Readability Filter │
                             │  • Sanitization       │
                             │  • Strip PII / Forms  │
                             └───────────┬───────────┘
                                         │ (Structured Object)
                                         ▼
                             ┌───────────────────────┐
                             │ Capture Preview Modal │
                             │  (User Reviews Data)  │
                             └───────────┬───────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       │ (User Confirms)                   │ (User Cancels)
                       ▼                                   ▼
        ┌─────────────────────────────┐             [ Discarded ]
        │  Local Encrypted Storage    │
        │   (chrome.storage.local)    │
        └──────────────┬──────────────┘
                       │ (If Sync Enabled)
                       ▼
        ┌─────────────────────────────┐
        │   Authenticated Supabase    │
        │  (Isolated via User RLS)    │
        └─────────────────────────────┘
```

---

## 4. Privacy Audit Trail (`capture_privacy`)

Every capture stored in the database includes an immutable record of the privacy settings in effect at the moment of capture:
- `transcript_captured`: Whether the video transcript was included.
- `full_text_captured`: Whether full article body text was retained.
- `metadata_captured`: Whether public metadata tags were recorded.
- `locally_processed`: Confirms local execution.
- `backend_synced`: Confirms whether the memory was synchronized to the cloud.

---

## 5. Third-Party Script & Network Policy
- **Content Scripts**: Strictly prohibited from initiating network connections (`fetch`, `XMLHttpRequest`, `WebSocket`).
- **No Third-Party Analytics**: No Google Analytics, Mixpanel, or telemetry trackers in the extension bundle.
- **AI Processing**: AI models run only on private, trusted backend infrastructure (Supabase Edge Functions); extension clients never call third-party AI APIs directly.
