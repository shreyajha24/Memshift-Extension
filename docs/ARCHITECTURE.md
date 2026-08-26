# MemShift extension architecture

## Capture lifecycle

MemShift is automatic but opt-in. A content script is registered only for normal `http` and `https` websites. On startup it reads `memshift_settings_v1` from `chrome.storage.local`. When `enabled` is false, it performs no extraction and installs no page-route listeners. When enabled, it waits briefly for page content, performs one bounded eligibility and extraction attempt, and sends only a structured local payload to the service worker.

The service worker builds the `KnowledgeCapture`, applies privacy boundaries and local relevance scoring, prevents duplicates, and saves it locally before attempting optional backend sync. Content scripts never make backend requests and never receive auth state.

Supported extraction is deliberately narrow: YouTube watch pages, GitHub pages with README/documentation content, and public article/documentation containers. Login, account, search, utility, Chrome Web Store, and browser-internal pages are ignored. The extension does not modify page requests or navigation.

## Responsibilities

- `src/content`: DOM-only eligibility detection and bounded extraction. It does not access cookies, browser history, website local/session storage, form values, or passwords.
- `src/background/service-worker.ts`: MV3 runtime messages, storage coordination, settings notifications, capture processing, sync queue badge, and optional backend synchronization. It has no `window`, `document`, alarm, DOM-scraping, network-interception, or history-monitoring logic.
- `src/background/capture-processor.ts`: local-first capture construction, duplicate check, storage, and optional sync.
- `src/storage`: bounded state in `chrome.storage.local`: settings, auth session, up to 50 recent captures, and the offline sync queue.
- `src/popup`: the Master Toggle and source/privacy settings. The toggle is the primary privacy control.

Each capture retains source, content, metadata, engagement, intelligence, privacy, `captureMethod: "automatic"`, processing status, and sync status for the six MemShift knowledge systems: metadata extraction, mapping, timeline, graph, source tracking, and retention/decay.

## Permissions

`storage` persists settings, captures, authentication state, and the bounded offline queue. `tabs` is used only to notify already-open HTTP/HTTPS content scripts immediately after a settings change; it is not used to monitor tabs. Host permissions for `http://*/*` and `https://*/*` allow automatic public-web content scripts across supported sites, including Google, YouTube, GitHub, MDN, Stack Overflow, documentation, and articles.

No request interception or blocking permission is present: no `webRequest`, `webRequestBlocking`, `declarativeNetRequest`, or `declarativeNetRequestWithHostAccess`. `alarms` is not used.

## Duplicate prevention and performance

Content scripts hash canonical URL, title, and extracted public content. Before storage, `CaptureDeduplicator` compares canonical URL and content hash. YouTube also treats moments within 30 seconds as duplicates. A generation token invalidates work after settings or SPA route changes. There is no interval, polling loop, unrestricted mutation observer, or infinite retry.

Generic/GitHub extraction has a five-second bound; YouTube transcript extraction has an eight-second bound; backend requests abort after ten seconds. Failures are caught and silent from the host webpage's perspective.

## Privacy and sync

The Master Toggle overrides all work. Disabling it cancels scheduled extraction and makes the service worker reject capture messages; no capture is processed or synced. Source settings control transcript, full text, and metadata. URL query parameters can be anonymized. Backend sync is optional; failures leave the local capture intact and enqueue it. Queue retry is user-triggered from the popup or capture-event triggered—there is no alarm-based background surveillance.
