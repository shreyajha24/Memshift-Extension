import { RawExtractedData } from '../core/capture/capture-builder';
import { hashContent } from '../shared/hashing';
import { STORAGE_KEYS } from '../shared/constants';
import { DEFAULT_SETTINGS, MemShiftSettings } from '../types/settings';
import { ExtensionMessage } from '../types/messages';
import { SourceDetector } from './source-detector';
import { ArticleExtractor } from './web/article-extractor';
import { GitHubExtractor } from './github/github-extractor';
import { YouTubeExtractor } from './youtube/youtube-extractor';
import { ext } from '../shared/browser-api';
import { hasMeaningfulContent } from './extraction/content-normalizer';
import { logger } from '../utils/logger';

const ARTICLE_TIMEOUT_MS = 5_000;
const YOUTUBE_TIMEOUT_MS = 8_000;
const INITIAL_DELAY_MS = 700;
const DYNAMIC_RETRY_WINDOW_MS = 6_000;
const DYNAMIC_RETRY_DEBOUNCE_MS = 600;
const MAX_DYNAMIC_ATTEMPTS = 3;
const UTILITY_PATH = /\/(?:signin|login|logout|account|settings|preferences|notifications)(?:\/|$)/i;
let enabled = false;
let generation = 0;
let captureTimer: number | undefined;
let retryTimer: number | undefined;
let dynamicObserver: MutationObserver | undefined;
let dynamicAttempts = 0;
let dynamicDeadline = 0;
let listeningForRoutes = false;

function isPotentiallyCapturablePage(): boolean {
  if (!document.body || document.querySelector('input[type="password"], form[action*="login" i], form[action*="signin" i]')) return false;
  const url = new URL(window.location.href);
  if (UTILITY_PATH.test(url.pathname)) return false;
  if (url.hostname === 'youtu.be') return url.pathname.length > 1;
  if (url.hostname.includes('youtube.com')) return url.pathname === '/watch' && url.searchParams.has('v');
  return url.protocol === 'http:' || url.protocol === 'https:';
}

async function withTimeout<T>(work: () => T | Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: number | undefined;
  try {
    return await Promise.race([Promise.resolve().then(work), new Promise<T>((_, reject) => {
      timeout = window.setTimeout(() => reject(new Error('Extraction timed out')), timeoutMs);
    })]);
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

async function extract(settings: MemShiftSettings): Promise<RawExtractedData | undefined> {
  if (!isPotentiallyCapturablePage()) return undefined;
  const detection = SourceDetector.detect(window.location.href, document.title);
  let raw: RawExtractedData | undefined;
  if (detection.sourceType === 'youtube') {
    const result = await withTimeout(() => YouTubeExtractor.extract(settings.youtube), YOUTUBE_TIMEOUT_MS);
    if (!result) return undefined;
    raw = {
      sourceType: 'youtube',
      platform: 'YouTube',
      url: window.location.href,
      canonicalUrl: result.canonicalUrl,
      title: result.title,
      channel: result.channel,
      siteName: 'YouTube',
      description: result.description,
      transcript: result.transcript,
      currentTimestampSeconds: result.currentTimestampSeconds,
      engagementDurationSeconds: result.durationSeconds,
      faviconUrl: result.faviconUrl,
      contentType: detection.pageType,
      extractionMethod: result.transcript?.length ? 'site-fallback' : 'metadata-only',
      extractionStatus: result.transcript?.length || result.description ? 'success' : 'partial',
      extractionMetadata: {
        videoId: result.videoId,
        transcriptAvailableInDom: Boolean(result.transcript?.length),
      },
    };
  } else if (detection.sourceType === 'github') {
    const result = await withTimeout(() => GitHubExtractor.extract(), ARTICLE_TIMEOUT_MS);
    if (!result) return undefined;
    const metadataDescription = settings.web.metadataEnabled ? result.description : undefined;
    const text = result.readmeText || result.codeSnippet;
    raw = {
      sourceType: 'github',
      platform: 'GitHub',
      url: window.location.href,
      canonicalUrl: result.canonicalUrl,
      title: result.title,
      siteName: 'GitHub',
      description: metadataDescription,
      text: settings.web.fullTextEnabled ? text : undefined,
      excerpt: settings.web.fullTextEnabled ? metadataDescription || text?.slice(0, 500) : metadataDescription,
      faviconUrl: result.faviconUrl,
      contentType: result.pageKind === 'documentation' ? 'documentation' : 'github',
      extractionMethod: result.extractionMethod || (result.codeSnippet ? 'site-fallback' : 'metadata-only'),
      extractionStatus: text || metadataDescription ? 'success' : 'partial',
      extractionMetadata: result.extractionMetadata,
    };
  } else {
    const result = await withTimeout(() => ArticleExtractor.extract(settings.web, detection.pageType), ARTICLE_TIMEOUT_MS);
    raw = {
      sourceType: detection.sourceType,
      platform: detection.platform,
      url: window.location.href,
      canonicalUrl: result.metadata.canonicalUrl,
      title: result.metadata.title,
      author: result.metadata.author,
      siteName: result.metadata.siteName,
      description: result.metadata.description,
      publishedAt: result.metadata.publishedAt,
      text: settings.web.fullTextEnabled ? result.fullText : undefined,
      excerpt: settings.web.fullTextEnabled ? result.excerpt : result.metadata.description,
      faviconUrl: result.metadata.faviconUrl,
      contentType: result.contentType,
      extractionMethod: result.extractionMethod,
      extractionStatus: result.status,
      extractionMetadata: result.extractionMetadata,
    };
  }
  raw.contentHash = await hashContent([raw.canonicalUrl || raw.url, raw.title || '', raw.text || '', raw.transcript?.map((item) => item.text).join(' ') || ''].join('\n'));
  logExtraction(raw);
  return raw;
}

function shouldSendCapture(raw: RawExtractedData | undefined): raw is RawExtractedData {
  if (!raw) return false;
  if (raw.extractionStatus === 'failed') return false;
  if (raw.sourceType === 'youtube') return Boolean(raw.title && (raw.description || raw.transcript?.length));
  if (raw.sourceType === 'github') return Boolean(raw.title && (raw.text || raw.excerpt || raw.description));
  return hasMeaningfulContent(raw.text || raw.excerpt, raw.description);
}

function logExtraction(raw: RawExtractedData): void {
  logger.debug('[MemShift Extractor]', {
    detectedPage: raw.contentType || raw.sourceType,
    method: raw.extractionMethod,
    characters: (raw.text || raw.excerpt || raw.description || raw.transcript?.map((item) => item.text).join(' ') || '').length,
    status: raw.extractionStatus || 'success',
  });
}

async function extractAndSend(settings: MemShiftSettings, captureGeneration: number): Promise<boolean> {
  const raw = await extract(settings);
  if (shouldSendCapture(raw) && enabled && captureGeneration === generation) {
    await ext.runtime.sendMessage({ type: 'PAGE_CAPTURED', payload: raw } satisfies ExtensionMessage);
    return true;
  }
  return false;
}

async function captureOnce(): Promise<void> {
  const captureGeneration = generation;
  if (!enabled || !isPotentiallyCapturablePage()) return;
  try {
    const stored = await ext.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = stored[STORAGE_KEYS.SETTINGS] as MemShiftSettings | undefined;
    if (!settings?.enabled || captureGeneration !== generation) return;
    const sent = await extractAndSend(settings, captureGeneration);
    if (!sent && enabled && captureGeneration === generation) startDynamicRetry(settings, captureGeneration);
  } catch {
    // Best-effort extraction must never affect the host page.
  }
}

function startDynamicRetry(settings: MemShiftSettings, captureGeneration: number): void {
  stopDynamicRetry();
  if (!document.body || typeof MutationObserver === 'undefined') return;

  dynamicAttempts = 0;
  dynamicDeadline = Date.now() + DYNAMIC_RETRY_WINDOW_MS;
  dynamicObserver = new MutationObserver(() => {
    if (Date.now() > dynamicDeadline || dynamicAttempts >= MAX_DYNAMIC_ATTEMPTS || captureGeneration !== generation || !enabled) {
      stopDynamicRetry();
      return;
    }
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      dynamicAttempts += 1;
      void extractAndSend(settings, captureGeneration).then((sent) => {
        if (sent || dynamicAttempts >= MAX_DYNAMIC_ATTEMPTS || Date.now() > dynamicDeadline) stopDynamicRetry();
      }).catch(() => stopDynamicRetry());
    }, DYNAMIC_RETRY_DEBOUNCE_MS);
  });

  dynamicObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  retryTimer = window.setTimeout(() => {
    dynamicAttempts += 1;
    void extractAndSend(settings, captureGeneration).then((sent) => {
      if (sent || dynamicAttempts >= MAX_DYNAMIC_ATTEMPTS || Date.now() > dynamicDeadline) stopDynamicRetry();
    }).catch(() => {
      stopDynamicRetry();
    });
  }, DYNAMIC_RETRY_DEBOUNCE_MS);
  window.setTimeout(stopDynamicRetry, DYNAMIC_RETRY_WINDOW_MS);
}

function stopDynamicRetry(): void {
  if (retryTimer !== undefined) window.clearTimeout(retryTimer);
  retryTimer = undefined;
  dynamicObserver?.disconnect();
  dynamicObserver = undefined;
  dynamicAttempts = 0;
  dynamicDeadline = 0;
}

function scheduleCapture(): void {
  if (!enabled) return;
  if (captureTimer !== undefined) window.clearTimeout(captureTimer);
  stopDynamicRetry();
  captureTimer = window.setTimeout(() => void captureOnce(), INITIAL_DELAY_MS);
}

function onRouteChange(): void { generation += 1; scheduleCapture(); }

function setEnabled(value: boolean): void {
  enabled = value;
  generation += 1;
  if (!enabled) {
    if (captureTimer !== undefined) window.clearTimeout(captureTimer);
    captureTimer = undefined;
    stopDynamicRetry();
    return;
  }
  if (!listeningForRoutes) {
    window.addEventListener('popstate', onRouteChange, { passive: true });
    window.addEventListener('yt-navigate-finish', onRouteChange, { passive: true });
    listeningForRoutes = true;
  }
  scheduleCapture();
}

ext.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if ((message.type === 'SETTINGS_UPDATED' || message.type === 'UPDATE_SETTINGS') && typeof message.payload.enabled === 'boolean') setEnabled(message.payload.enabled);
});
ext.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.SETTINGS]) setEnabled(Boolean((changes[STORAGE_KEYS.SETTINGS].newValue as MemShiftSettings | undefined)?.enabled));
});

// OFF means no extraction and no page-route observation. Storage is only read to
// obtain the user-selected master toggle; content is never sent to a backend here.
void ext.storage.local.get(STORAGE_KEYS.SETTINGS).then((stored) => {
  const settings = (stored[STORAGE_KEYS.SETTINGS] as MemShiftSettings | undefined) || DEFAULT_SETTINGS;
  setEnabled(settings.enabled);
}).catch(() => setEnabled(false));
