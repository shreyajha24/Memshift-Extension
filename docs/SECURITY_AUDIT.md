# MemShift Security Audit

Generated: 2026-08-26T17:46:32+05:30

This document audits current code for logging, storage, and network behaviors that may expose captured user content. It lists current storage locations, data flows, logging locations, network transmissions, risk points, and recommended hardening steps. Follow-up changes will implement the recommendations.

A. Current storage locations
---------------------------
(places where captured user content or related sensitive data are persisted)

- chrome.storage.local (plaintext)
  - src/storage/capture-store.ts
    - Key: STORAGE_KEYS.LOCAL_CAPTURES (memshift_local_captures_v1)
    - Stores KnowledgeCapture objects (content.text, content.excerpt, transcript, metadata, intelligence, privacy, etc.)
    - enqueue/offline queue: STORAGE_KEYS.OFFLINE_QUEUE
  - src/storage/auth-store.ts
    - Key: STORAGE_KEYS.AUTH_SESSION (memshift_auth_session_v1)
    - Persists AuthSession with accessToken and refreshToken in chrome.storage.local
  - src/storage/settings-store.ts
    - Key: STORAGE_KEYS.SETTINGS (memshift_settings_v1)
    - Stores extension settings (allowed)
  - src/storage/knowledge-repository.ts
    - Concept index: memshift_kg_concept_index_v1 (conceptId -> [memoryId]) (plaintext)
    - Topic index: memshift_kg_topic_index_v1 (topicId -> [memoryId]) (plaintext)
    - Relationships: memshift_kg_relationships_v1 (array of relationship objects) (plaintext)
    - Memory index: memshift_kg_memory_index_v1 (id -> {id, title, capturedAt}) (plaintext)
  - Other small items: plugin copied public manifest, icons (not sensitive)

- In-memory only (volatile)
  - Background service worker memory (CaptureProcessor, in-memory session in AuthStore.inMemorySession)
  - capture.intelligence attached in CaptureProcessor prior to saving

- No IndexedDB usage currently (no encrypted storage present)

B. Current data flow
--------------------
Capture flow (current):

1. content script extracts raw data (src/content/index.ts) including:
   - title, canonicalUrl, text, excerpt, transcript (array of transcript chunks)
2. content script constructs RawExtractedData and sends to background via:
   - chrome.runtime.sendMessage({ type: 'PAGE_CAPTURED', payload: raw })
3. Background receives message (MessageRouter -> CaptureProcessor):
   - CaptureBuilder.build(...) creates KnowledgeCapture containing content.text, excerpt, transcript, intelligence fields
   - PrivacyPolicyEngine.enforcePrivacyBoundaries may redact some fields per user settings
   - CaptureStore.saveIfNew() persists KnowledgeCapture into chrome.storage.local under memshift_local_captures_v1 (plaintext)
   - KnowledgeRepository.indexMemory() writes concept/topic indexes and memory index to chrome.storage.local (plaintext)
   - RelationshipEngine.discoverRelationships() may read indices and write relationships to chrome.storage.local (plaintext)
   - If settings.privacy.backendSyncEnabled = true, BackendClient.sendCapture(capture) sends JSON.stringify(capture) via fetch to remote API

C. Current logging locations
---------------------------
(places that call console.* or otherwise produce logs)

- src/background/service-worker.ts
  - console.log('MemShift extension installed successfully.');

- src/content/youtube/metadata-extractor.ts
  - console.warn('MemShift: Error extracting YouTube metadata:', err);

- src/storage/settings-store.ts
  - console.warn('Failed to load settings from chrome.storage.local:', err);
  - console.warn('Failed to save settings to chrome.storage.local:', err);
  - console.warn('Failed to reset settings in chrome.storage.local:', err);

- src/storage/capture-store.ts
  - console.warn('Failed to persist local captures:', err);
  - console.warn('Failed to get local captures:', err);
  - console.warn('Failed to persist sync queue:', err);
  - console.warn('Failed to get sync queue:', err);

- src/storage/auth-store.ts
  - console.warn('Failed to load auth session:', err);
  - console.warn('Failed to save auth session:', err);
  - console.warn('Failed to clear auth session:', err);

- src/popup/hooks/useSettings.ts
  - console.warn('Failed to fetch settings from background:', err);
  - console.warn('Failed to update settings in background:', err);

- src/popup/components/SyncStatus.tsx
  - console.warn('Manual sync failed:', err);

Notes:
- Most console.warn calls log error objects. None appear to intentionally log full capture objects via console.log(JSON.stringify(capture)), except that BackendClient uses JSON.stringify(capture) in the fetch body (network, not console).
- Some UI components read and display memory content (popup/MemoryDetail), but they do not call console.log for content.

D. Current network transmission
-------------------------------
- src/background/backend-client.ts
  - When backend sync is enabled, the full KnowledgeCapture object is sent to configured API:
    body: JSON.stringify(capture)
  - AuthSession.accessToken (from AuthStore) is used to set Authorization header when present.
  - If fetch fails, capture is enqueued for retry in chrome.storage.local (offline queue).

- No other obvious external fetch/XHR calls discovered in the codebase.

E. Sensitive data exposure risks
--------------------------------
1. Plaintext persistent storage of captured content
   - KnowledgeCapture objects (content.text, transcript, excerpt) are stored in chrome.storage.local (memshift_local_captures_v1). chrome.storage.local is stored on disk in the browser profile and accessible to any process with access to the user's profile and to other browser extensions with sufficient permissions (depending on extension security boundaries).

2. Indexes and relationships stored in chrome.storage.local
   - Concept/topic indexes and relationships are stored in plaintext. These may reveal relationships (Spring Boot -> Backend) and concept membership even if full content is restricted.

3. Auth tokens in chrome.storage.local
   - AuthStore persists accessToken and refreshToken in chrome.storage.local (plaintext) — risk of token theft if profile compromised.

4. Network transmission of full capture
   - BackendClient sends the entire capture payload to remote API if backend sync enabled. Even if the user enables sync, no redaction or explicit consent prompt is enforced at the send point (depends on settings elsewhere). The full payload includes transcripts/body unless redacted earlier by PrivacyPolicyEngine.

5. Logging of errors including objects
   - console.warn(..., err) may include error stacks or object payloads. While not directly logging capture content, a careless change or enhanced error messages could cause capture text to be included in logs.

6. Message passing
   - content script sends full raw capture via chrome.runtime.sendMessage to background. Messages are scoped to the extension but other extensions can potentially send messages to this extension if externally_connectable is set in manifest (currently not present). Content scripts themselves execute in isolated world but rely on page DOM — page scripts could attempt to interfere with extraction to cause leakage.

7. No use of IndexedDB or encrypted storage
   - All captured content and KG indexes are stored in chrome.storage.local. No encryption is applied currently.

8. URL privacy
   - Canonical URLs are saved in the capture payload and persisted. While the project normalizes/removes known tracking params (normalizeUrl), other query parameters may still contain sensitive tokens.

F. Recommended architecture (high level)
---------------------------------------
(see section 3–15 in user requirements; summary)

1. Move all sensitive capture data out of chrome.storage.local into an encrypted IndexedDB store (secure-memory-store). Use chrome.storage.local only for non-sensitive configuration (settings, toggles, retention preferences).

2. Implement a browser-based encryption service using Web Crypto API with AES-256-GCM and PBKDF2-SHA-256 key derivation from a user passphrase. Store only salts/metadata in chrome.storage.local; never persist derived keys.

3. Key lifecycle: implement initializeEncryption(), unlock(passphrase), lock(), isUnlocked(). Key exists in memory only while unlocked; when locked or on restart the key is not available and decrypted payloads are inaccessible.

4. Encrypted memory format: store each memory in IndexedDB as { id, schemaVersion, createdAt, encryptedPayload: { ciphertext, iv, version } } with AAD binding memory id and schemaVersion.

5. Indexing/search: do not store raw plaintext tokens in a plaintext index. Instead use privacy-preserving tokens (HMACs or keyed hashes) for essential searchable terms or perform on-the-fly decryption of candidate records after retrieving candidates by privacy-safe metadata. Keep metadata minimal and non-sensitive in chrome.storage.local (title-only index allowed if user consents; otherwise keep only hashed tokens).

6. Relationship storage: either encrypt relationships object as part of memory payloads, or store relationships using privacy-preserving IDs only (no plaintext labels) and derive human-readable explanations only after decryption.

7. Logging: centralize logging into src/utils/logger.ts. Ensure logger scrubs values and disallows dumping full capture objects. Disable debug-level logs in production build. Add tests that verify logger does not include sensitive fields.

8. Backend sync: require explicit opt-in. When enabled, perform explicit redaction and present consent UI. Send only encrypted payloads or remove sensitive fields unless user explicitly agrees. Never include underlying access tokens in logs or non-secure storage.

9. Migration: provide an idempotent migration path that reads plaintext captures from chrome.storage.local, encrypts them (after user unlock/create key), verifies, then removes plaintext copies.

10. Content script behavior: ensure content scripts do not collect data unless capture enabled, and never record sensitive form fields or cookies.

G. Changes to be made (implementation plan)
-------------------------------------------
(Will implement after audit confirmation — summarized)

1. Add docs/SECURITY_AUDIT.md (this file).
2. Add src/utils/logger.ts, replace direct console.* with logger calls. Ensure logger sanitizes and disables debug logs in production.
3. Create src/security/crypto-types.ts, src/security/crypto-service.ts, src/security/key-manager.ts, src/security/secure-memory-store.ts implementing AES-256-GCM encryption, PBKDF2 key derivation, secure IndexedDB usage for encrypted records.
4. Migrate CaptureStore to write only minimal metadata to chrome.storage.local; full encrypted captures move to IndexedDB via SecureMemoryStore.
5. Modify KnowledgeRepository to avoid plaintext indexes for concepts/relationships; use encrypted relationships or privacy-preserving identifiers and/or HMAC-based search tokens.
6. Update CaptureProcessor to run classification and relationship discovery on decrypted plaintext only in-memory, then store encrypted payloads and privacy-preserving indexes.
7. Implement migration routine: detect plaintext records, prompt user to initialize encryption, then encrypt and remove plaintext copies after verification.
8. Add automated tests for encryption/decryption, tamper detection, key lock/unlock, no plaintext stored, and logger sanitization.

H. Remaining limitations and risks (post-implementation)
------------------------------------------------------
- If the user's browser profile itself is compromised (attacker has filesystem access and the user has unlocked MemShift and key is in memory or stored in OS), the attacker can access decrypted content while the key resides in process memory.
- If the user selects weak passphrase, offline brute-force is possible; provide guidance and enforce minimum strength.
- HMAC/token-based search requires care: it may leak presence of certain keywords if tokens are enumerated. Trade-offs must be documented.
- Some metadata (titles, timestamps) may remain in chrome.storage.local for usability; these expose limited context (title strings) unless fully moved behind encryption.
- Inter-process leaks: extensions with host permissions and debuggers attached to the profile may access storage; minimize permissions and document threat model.

Appendix: files discovered referencing sensitive flows
----------------------------------------------------
- src/content/index.ts — constructs RawExtractedData (includes transcript) and sends via chrome.runtime.sendMessage
- src/core/capture/capture-builder.ts — builds KnowledgeCapture with content.text and transcript
- src/storage/capture-store.ts — saves KnowledgeCapture to chrome.storage.local (memshift_local_captures_v1)
- src/storage/knowledge-repository.ts — stores concept/topic indexes and relationships into chrome.storage.local
- src/background/backend-client.ts — JSON.stringify(capture) sent via fetch when sync enabled
- src/storage/auth-store.ts — stores AuthSession (accessToken/refreshToken) in chrome.storage.local
- src/popup/components/MemoryDetail.tsx — displays memory content (consumers of decrypted data)
- src/shared/schemas.ts — truncates transcript for schemas (still stores transcript in payload)
- src/privacy/privacy-policy.ts — enforces some redaction based on settings; verify completeness


Next step
---------
Please confirm you want me to proceed and implement the recommended hardening steps in the following order (minimal breaking changes first):

1. Implement centralized logger and replace console.* usages with sanitized logger calls.
2. Implement Web Crypto-based key manager and crypto service (AES-256-GCM/PBKDF2) and secure storage abstractions (IndexedDB).
3. Migrate storage to encrypted IndexedDB and adjust capture pipeline to encrypt before persist; keep settings in chrome.storage.local only.
4. Implement migration tool to encrypt existing plaintext memories.
5. Add tests and CI checks for logging and encryption behaviors.

If confirmed, I will start with the logger (low-risk) and then implement crypto/key-manager and secure-memory-store, updating capture persistence to IndexedDB after tests pass.

