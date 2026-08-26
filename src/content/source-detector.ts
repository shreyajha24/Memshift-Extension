import { SourceType, PlatformType } from '../types/source';

export interface SourceDetectionResult {
  sourceType: SourceType;
  platform: PlatformType | string;
  isSpecificExtractorAvailable: boolean;
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
        };
      }

      // 2. GitHub Detection
      if (hostname === 'github.com' || hostname.endsWith('.github.com')) {
        return {
          sourceType: 'github',
          platform: 'GitHub',
          isSpecificExtractorAvailable: true,
        };
      }

      // 3. Known Tech/Blog Platforms
      if (hostname.includes('medium.com')) {
        return {
          sourceType: 'article',
          platform: 'Medium',
          isSpecificExtractorAvailable: true,
        };
      }

      if (hostname.includes('dev.to')) {
        return {
          sourceType: 'article',
          platform: 'Dev.to',
          isSpecificExtractorAvailable: true,
        };
      }

      if (hostname.includes('substack.com')) {
        return {
          sourceType: 'article',
          platform: 'Substack',
          isSpecificExtractorAvailable: true,
        };
      }

      if (hostname.includes('arxiv.org')) {
        return {
          sourceType: 'article',
          platform: 'ArXiv',
          isSpecificExtractorAvailable: true,
        };
      }

      // 4. Documentation Heuristics
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
        };
      }

      // 5. Default Article vs Generic Web
      return {
        sourceType: 'article',
        platform: 'Web',
        isSpecificExtractorAvailable: true,
      };
    } catch {
      return {
        sourceType: 'generic',
        platform: 'Web',
        isSpecificExtractorAvailable: false,
      };
    }
  }
}
