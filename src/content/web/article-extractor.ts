import { WebSettings } from '../../types/settings';
import { WebMetadataExtractor, WebMetadata } from './metadata-extractor';
import { EXTRACTION_LIMITS } from '../../shared/constants';
import { truncateString } from '../../shared/utils';

export interface ArticleExtractionResult {
  metadata: WebMetadata;
  fullText?: string;
  excerpt?: string;
}

export class ArticleExtractor {
  private static readonly NOISE_SELECTORS = [
    'nav',
    'footer',
    'header',
    'aside',
    'script',
    'style',
    'noscript',
    'iframe',
    '.ad',
    '.ads',
    '.advertisement',
    '.cookie-banner',
    '.cookie-notice',
    '.popup',
    '.modal',
    '.social-share',
    '.share-buttons',
    '.comments',
    '#comments',
    '.sidebar',
    '.related-posts',
    '.newsletter-signup',
    'form',
  ];

  public static extract(settings: WebSettings): ArticleExtractionResult {
    const rawMetadata = WebMetadataExtractor.extract();
    const metadata: WebMetadata = settings.metadataEnabled
      ? rawMetadata
      : {
          title: rawMetadata.title,
          canonicalUrl: rawMetadata.canonicalUrl,
          faviconUrl: rawMetadata.faviconUrl,
        };

    // Clone root content container to avoid mutating live DOM
    const articleContainer = document.querySelector(
      'article, main, [role="main"], .post-content, .article-body, #content'
    );
    if (!articleContainer) return { metadata };

    const cloned = articleContainer.cloneNode(true) as HTMLElement;

    // Remove noise elements from clone
    this.NOISE_SELECTORS.forEach((selector) => {
      cloned.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // Extract text blocks
    const paragraphs = cloned.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, code, blockquote, li');
    const textPieces: string[] = [];

    paragraphs.forEach((p) => {
      const text = p.textContent?.trim();
      if (text && text.length > 20) {
        textPieces.push(text);
      }
    });

    const fullText = textPieces.join('\n\n').slice(0, EXTRACTION_LIMITS.MAX_ARTICLE_CHARS);

    // Generate excerpt
    let excerpt = rawMetadata.description;
    if (!excerpt && textPieces.length > 0) {
      excerpt = textPieces[0];
    }
    const sanitizedExcerpt = truncateString(excerpt, EXTRACTION_LIMITS.MAX_EXCERPT_CHARS);

    return {
      metadata,
      // This is also the bounded local eligibility signal when full-text storage
      // is disabled. The content script discards it before messaging in that case.
      fullText: fullText || undefined,
      excerpt: sanitizedExcerpt || undefined,
    };
  }
}
