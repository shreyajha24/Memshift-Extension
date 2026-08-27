import { EXTRACTION_LIMITS } from './constants';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_reader',
  'utm_viz_id',
  'utm_pubreferrer',
  'utm_swu',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'yclid',
  'mc_cid',
  'mc_eid',
  'twclid',
  'igshid',
  'wbraid',
  'gbraid',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'hsctatracking',
  'hsa_cam',
  'hsa_grp',
  'hsa_mt',
  'hsa_src',
  'hsa_ad',
  'hsa_acc',
  'hsa_net',
  'hsa_kw',
  'hsa_tgt',
  'hsa_ver',
  'ref',
  'ref_src',
  'ref_url',
  'source',
  'action_object_map',
  'action_type_map',
  'action_ref_map',
  'spm_id',
  'spm',
  'from_weibo',
  'sc_src',
  'sc_llid',
  'vero_id',
  'vero_conv',
  'mkt_tok',
]);

/**
 * Normalizes a URL by removing tracking query parameters, hashes, and standardizing protocols/paths.
 */
export function normalizeUrl(rawUrl: string, stripTracking = true): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const urlObj = new URL(rawUrl.trim());

    // Normalize protocol and hostname to lowercase
    urlObj.protocol = urlObj.protocol.toLowerCase();
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // Remove standard port defaults
    if ((urlObj.protocol === 'http:' && urlObj.port === '80') || (urlObj.protocol === 'https:' && urlObj.port === '443')) {
      urlObj.port = '';
    }

    // Special handling for YouTube URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
      let videoId = '';
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.replace(/^\/+/, '').split('/')[0] || '';
      } else if (urlObj.pathname.startsWith('/watch')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.pathname.startsWith('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1]?.split('/')[0] || '';
      }

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    // Always strip hash fragments for page identity
    urlObj.hash = '';

    // Strip tracking parameters
    if (stripTracking) {
      const keysToDelete: string[] = [];
      urlObj.searchParams.forEach((_val, key) => {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => urlObj.searchParams.delete(key));
    }

    // Sort remaining search parameters deterministically
    const entries = Array.from(urlObj.searchParams.entries()).sort(([aKey, aVal], [bKey, bVal]) => {
      const keyComp = aKey.localeCompare(bKey);
      return keyComp !== 0 ? keyComp : aVal.localeCompare(bVal);
    });

    urlObj.search = '';
    for (const [k, v] of entries) {
      urlObj.searchParams.append(k, v);
    }

    // Normalize pathname: collapse duplicate slashes and remove trailing slash for non-root paths
    let pathname = urlObj.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;

    // Remove trailing slash on root domain if no search query exists
    let normalized = urlObj.toString();
    if (normalized.endsWith('/') && urlObj.pathname === '/' && !urlObj.search) {
      normalized = normalized.slice(0, -1);
    }

    return normalized.slice(0, EXTRACTION_LIMITS.MAX_URL_CHARS);
  } catch {
    return rawUrl.trim().slice(0, EXTRACTION_LIMITS.MAX_URL_CHARS);
  }
}

/**
 * Extracts a clean root domain from a URL.
 */
export function extractDomain(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl.trim());
    return urlObj.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Generates a stable deterministic memory ID from a canonical URL.
 */
export function generateMemoryId(canonicalUrl: string): string {
  const normalized = normalizeUrl(canonicalUrl);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(12, '0');
  return `mem_${hex}`;
}

/**
 * Formats a duration in seconds into a human-readable string (e.g. 12:43 or 1:02:15).
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0 || isNaN(seconds)) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs.toString().padStart(2, '0');
  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

/**
 * Truncates a string safely to the maximum character limit.
 */
export function truncateString(text: string | undefined | null, maxLen: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trim() + '…';
}

/**
 * Sanitizes plain text input, normalizing whitespace and removing null bytes.
 */
export function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\0/g, '') // remove null characters
    .replace(/[\r\n\t]+/g, ' ') // collapse multi-line/whitespace
    .replace(/\s{2,}/g, ' ') // collapse double spaces
    .trim();
}

/**
 * Fast client-side UUID v4 generator.
 */
export function generateClientUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
