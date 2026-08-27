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

const ARTICLE_TIMEOUT_MS = 5_000;
const YOUTUBE_TIMEOUT_MS = 8_000;
const INITIAL_DELAY_MS = 700;
const UTILITY_PATH = /\/(?:search|signin|login|logout|account|settings|preferences|notifications)(?:\/|$)/i;
let enabled = false;
let generation = 0;
let captureTimer: number | undefined;
let listeningForRoutes = false;

function isEligiblePage(): boolean {
  if (!document.body || document.querySelector('input[type="password"], form[action*="login" i], form[action*="signin" i]')) return false;
  const url = new URL(window.location.href);
  if (UTILITY_PATH.test(url.pathname)) return false;
  if (url.hostname.endsWith('google.com') && (url.pathname === '/search' || url.searchParams.has('q'))) return false;
  if (url.hostname.includes('youtube.com')) return url.pathname === '/watch' && url.searchParams.has('v');
  if (url.hostname === 'github.com') return Boolean(document.querySelector('#readme, article.markdown-body, [data-testid="readme"]'));
  return Boolean(document.querySelector('article, main, [role="main"], .post-content, .article-body, #content'));
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
  if (!isEligiblePage()) return undefined;
  const detection = SourceDetector.detect(window.location.href, document.title);
  let raw: RawExtractedData | undefined;
  if (detection.sourceType === 'youtube') {
    const result = await withTimeout(() => YouTubeExtractor.extract(settings.youtube), YOUTUBE_TIMEOUT_MS);
    if (!result || (!result.transcript?.length && !settings.youtube.metadataEnabled)) return undefined;
    raw = { sourceType: 'youtube', platform: 'YouTube', url: window.location.href, canonicalUrl: result.canonicalUrl, title: result.title, channel: result.channel, description: result.description, transcript: result.transcript, currentTimestampSeconds: result.currentTimestampSeconds, engagementDurationSeconds: result.durationSeconds, faviconUrl: result.faviconUrl };
  } else if (detection.sourceType === 'github') {
    const result = await withTimeout(() => GitHubExtractor.extract(), ARTICLE_TIMEOUT_MS);
    if (!result || (!result.readmeText && !result.description)) return undefined;
    const metadataDescription = settings.web.metadataEnabled ? result.description : undefined;
    raw = { sourceType: 'github', platform: 'GitHub', url: window.location.href, canonicalUrl: result.canonicalUrl, title: result.title, description: metadataDescription, text: settings.web.fullTextEnabled ? result.readmeText : undefined, excerpt: settings.web.fullTextEnabled ? metadataDescription || result.readmeText?.slice(0, 500) : metadataDescription, faviconUrl: result.faviconUrl };
  } else {
    const result = await withTimeout(() => ArticleExtractor.extract(settings.web), ARTICLE_TIMEOUT_MS);
    const meaningfulText = result.fullText || result.excerpt || '';
    if (meaningfulText.length < 400) return undefined;
    raw = { sourceType: detection.sourceType, platform: detection.platform, url: window.location.href, canonicalUrl: result.metadata.canonicalUrl, title: result.metadata.title, author: result.metadata.author, description: result.metadata.description, publishedAt: result.metadata.publishedAt, text: settings.web.fullTextEnabled ? result.fullText : undefined, excerpt: settings.web.fullTextEnabled ? result.excerpt : result.metadata.description, faviconUrl: result.metadata.faviconUrl };
  }
  raw.contentHash = await hashContent([raw.canonicalUrl || raw.url, raw.title || '', raw.text || '', raw.transcript?.map((item) => item.text).join(' ') || ''].join('\n'));
  return raw;
}

async function captureOnce(): Promise<void> {
  const captureGeneration = generation;
  if (!enabled || !isEligiblePage()) return;
  try {
    const stored = await ext.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = stored[STORAGE_KEYS.SETTINGS] as MemShiftSettings | undefined;
    if (!settings?.enabled || captureGeneration !== generation) return;
    const raw = await extract(settings);
    if (raw && enabled && captureGeneration === generation) await ext.runtime.sendMessage({ type: 'PAGE_CAPTURED', payload: raw } satisfies ExtensionMessage);
  } catch {
    // Best-effort extraction must never affect the host page.
  }
}

function scheduleCapture(): void {
  if (!enabled) return;
  if (captureTimer !== undefined) window.clearTimeout(captureTimer);
  captureTimer = window.setTimeout(() => void captureOnce(), INITIAL_DELAY_MS);
}

function onRouteChange(): void { generation += 1; scheduleCapture(); }

function setEnabled(value: boolean): void {
  enabled = value;
  generation += 1;
  if (!enabled) {
    if (captureTimer !== undefined) window.clearTimeout(captureTimer);
    captureTimer = undefined;
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
