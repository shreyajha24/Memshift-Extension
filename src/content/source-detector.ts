import { SourceType, PlatformType } from '../types/source';
import { PageContentType } from './extraction/types';

export interface SourceDetectionResult {
  sourceType: SourceType;
  platform: PlatformType | string;
  isSpecificExtractorAvailable: boolean;
  pageType: PageContentType;
}

export class SourceDetector {
  /**
   * Detects the source type and platform for a given URL and document context.
   */
  public static detect(url: string, documentTitle?: string): SourceDetectionResult {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      if (pathname.endsWith('.pdf')) {
        return {
          sourceType: 'generic',
          platform: 'PDF',
          isSpecificExtractorAvailable: false,
          pageType: 'pdf',
        };
      }

      // 1. YouTube Detection
      if (
        hostname.includes('youtube.com') ||
        hostname === 'youtu.be' ||
        hostname.endsWith('.youtube.com')
      ) {
        return {
          sourceType: 'youtube',
          platform: 'YouTube',
          isSpecificExtractorAvailable: true,
          pageType: 'youtube',
        };
      }

      // 2. GitHub Detection
      if (hostname === 'github.com' || hostname.endsWith('.github.com')) {
        return {
          sourceType: 'github',
          platform: 'GitHub',
          isSpecificExtractorAvailable: true,
          pageType: 'github',
        };
      }

      // 3. Dynamic community and Q&A platforms
      if (hostname === 'reddit.com' || hostname.endsWith('.reddit.com')) {
        return {
          sourceType: 'generic',
          platform: 'Reddit',
          isSpecificExtractorAvailable: false,
          pageType: 'reddit',
        };
      }

      if (hostname === 'stackoverflow.com' || hostname.endsWith('.stackexchange.com')) {
        return {
          sourceType: 'generic',
          platform: 'Stack Overflow',
          isSpecificExtractorAvailable: false,
          pageType: 'generic',
        };
      }

      if (hostname.endsWith('wikipedia.org')) {
        return {
          sourceType: 'article',
          platform: 'Wikipedia',
          isSpecificExtractorAvailable: false,
          pageType: 'article',
        };
      }

      const isKnownSearchHost = /(^|\.)((google|bing|duckduckgo|yahoo|baidu|yandex)\.)/.test(hostname);
      if (/\/(?:search|results?)(?:\/|$)/i.test(pathname) || (isKnownSearchHost && urlObj.searchParams.has('q'))) {
        return {
          sourceType: 'generic',
          platform: 'Search Results',
          isSpecificExtractorAvailable: false,
          pageType: 'search-results',
        };
      }

      // 4. Known Tech/Blog Platforms
      if (hostname.includes('medium.com')) {
        return {
          sourceType: 'article',
          platform: 'Medium',
          isSpecificExtractorAvailable: true,
          pageType: 'article',
        };
      }

      if (hostname.includes('dev.to')) {
        return {
          sourceType: 'article',
          platform: 'Dev.to',
          isSpecificExtractorAvailable: true,
          pageType: 'article',
        };
      }

      if (hostname.includes('substack.com')) {
        return {
          sourceType: 'article',
          platform: 'Substack',
          isSpecificExtractorAvailable: true,
          pageType: 'article',
        };
      }

      if (hostname.includes('arxiv.org')) {
        return {
          sourceType: 'article',
          platform: 'ArXiv',
          isSpecificExtractorAvailable: true,
          pageType: 'article',
        };
      }

      // 5. Documentation Heuristics
      if (
        hostname.startsWith('docs.') ||
        hostname.startsWith('doc.') ||
        hostname.startsWith('developer.') ||
        hostname.includes('readthedocs.io') ||
        hostname.includes('gitbook.io') ||
        hostname.includes('developer.mozilla.org') ||
        pathname.startsWith('/docs') ||
        pathname.startsWith('/documentation') ||
        pathname.startsWith('/api') ||
        (documentTitle && /docs|documentation|api reference|guide/i.test(documentTitle))
      ) {
        return {
          sourceType: 'documentation',
          platform: 'Docs',
          isSpecificExtractorAvailable: true,
          pageType: 'documentation',
        };
      }

      // 6. Default Article vs Generic Web
      return {
        sourceType: 'article',
        platform: 'Web',
        isSpecificExtractorAvailable: true,
        pageType: 'article',
      };
    } catch {
      return {
        sourceType: 'generic',
        platform: 'Web',
        isSpecificExtractorAvailable: false,
        pageType: 'generic',
      };
    }
  }
}

export const UTILITY_PATH = /\/(?:search|signin|login|logout|account|settings|preferences|notifications)(?:\/|$)/i;

export function isSearchEngineUrl(url: URL | string): boolean {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();

    const isGoogleSearchHost =
      /(^|\.)google\.[a-z.]+/i.test(host) &&
      !/^(cloud|developers|firebase|workspace|mail|drive|docs|calendar)\./i.test(host);
    const isBingSearchHost = /(^|\.)bing\.com$/i.test(host);
    const isDuckDuckGoHost = /(^|\.)duckduckgo\.com$/i.test(host);
    const isYahooSearchHost = /(^|\.)search\.yahoo\.(com|[a-z.]+)$/i.test(host);
    const isBaiduSearchHost = /(^|\.)baidu\.com$/i.test(host);
    const isYandexSearchHost = /(^|\.)(yandex\.(com|ru|org)|ya\.ru)$/i.test(host);
    const isBraveSearchHost = host === 'search.brave.com';
    const isEcosiaHost = /(^|\.)ecosia\.org$/i.test(host);
    const isKagiHost = /(^|\.)kagi\.com$/i.test(host);
    const isStartpageHost = /(^|\.)startpage\.com$/i.test(host);

    if (
      isGoogleSearchHost ||
      isBingSearchHost ||
      isDuckDuckGoHost ||
      isYahooSearchHost ||
      isBaiduSearchHost ||
      isYandexSearchHost ||
      isBraveSearchHost ||
      isEcosiaHost ||
      isKagiHost ||
      isStartpageHost
    ) {
      return true;
    }

    if (/\/(?:search|results?)(?:\/|$)/i.test(path)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function isCapturableContentUrl(url: URL | string): boolean {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    if (UTILITY_PATH.test(urlObj.pathname)) return false;
    if (isSearchEngineUrl(urlObj)) return false;
    if (urlObj.hostname === 'youtu.be') return urlObj.pathname.length > 1;
    if (urlObj.hostname.includes('youtube.com')) return urlObj.pathname === '/watch' && urlObj.searchParams.has('v');
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
