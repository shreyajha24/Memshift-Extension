// Extraction content limits
export const EXTRACTION_LIMITS = {
  MAX_ARTICLE_CHARS: 50_000,
  MAX_TRANSCRIPT_CHARS: 100_000,
  MAX_TITLE_CHARS: 500,
  MAX_DESCRIPTION_CHARS: 2_000,
  MAX_EXCERPT_CHARS: 1_000,
  MAX_URL_CHARS: 2_048,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'memshift_settings_v1',
  AUTH_SESSION: 'memshift_auth_session_v1',
  OFFLINE_QUEUE: 'memshift_offline_queue_v1',
  LOCAL_CAPTURES: 'memshift_local_captures_v1',
  CRYPTO_META: 'memshift_crypto_meta_v1',
} as const;

// Embedding configuration
export const EMBEDDING_CONFIG = {
  MODEL: 'text-embedding-3-small',
  DIMENSIONS: 1536,
} as const;

// Hybrid search default weights
export const SEARCH_WEIGHTS = {
  SEMANTIC: 0.45,
  KEYWORD: 0.25,
  TOPIC: 0.15,
  PRIORITY: 0.10,
  RECENCY: 0.05,
} as const;

// Humanized product copy
export const PRODUCT_COPY = {
  CAPTURE_SUCCESS: 'Saved to your memory.',
  OFFLINE_CAPTURED: 'Captured locally — sync pending.',
  CAPTURE_FOUND: 'Found something worth remembering.',
  MASTER_DISABLED: 'MemShift is currently turned off.',
  UNSUPPORTED_URL: 'MemShift cannot capture browser system pages.',
} as const;
