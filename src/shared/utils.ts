import { EXTRACTION_LIMITS } from './constants';

/**
 * Normalizes a URL by removing tracking query parameters and standardizing protocols.
 */
export function normalizeUrl(rawUrl: string, stripTracking = true): string {
  try {
    const urlObj = new URL(rawUrl);

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
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.pathname.startsWith('/watch')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.pathname.startsWith('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1] || '';
      }

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    // Strip tracking parameters
    if (stripTracking) {
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'yclid',
        'mc_cid',
        'mc_eid',
        'ref',
        'source',
        'action_object_map',
        'action_type_map',
        'action_ref_map',
      ];
      for (const param of trackingParams) {
        urlObj.searchParams.delete(param);
      }
    }

    // Remove trailing slash for root paths if no search params
    let normalized = urlObj.toString();
    if (normalized.endsWith('/') && urlObj.pathname === '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized.slice(0, EXTRACTION_LIMITS.MAX_URL_CHARS);
  } catch {
    return rawUrl.trim().slice(0, EXTRACTION_LIMITS.MAX_URL_CHARS);
  }
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
