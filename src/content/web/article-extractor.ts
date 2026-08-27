import { WebSettings } from '../../types/settings';
import { WebMetadataExtractor, WebMetadata } from './metadata-extractor';
import { EXTRACTION_LIMITS } from '../../shared/constants';
import { truncateString } from '../../shared/utils';
import {
  hasMeaningfulContent,
  normalizeContentBlocks,
  normalizePlainText,
} from '../extraction/content-normalizer';
import {
  ExtractionMethod,
  ExtractionStatus,
  PageContentType,
  TextBlock,
} from '../extraction/types';

export interface ArticleExtractionResult {
  metadata: WebMetadata;
  fullText?: string;
  excerpt?: string;
  contentType: PageContentType;
  extractionMethod: ExtractionMethod;
  status: ExtractionStatus;
  extractionMetadata: Record<string, unknown>;
}

interface Candidate {
  element: Element;
  score: number;
  textLength: number;
}

interface RedditFallback {
  content?: string;
  metadata: Record<string, unknown>;
}

const BLOCK_SELECTOR = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'pre',
  'code',
  'blockquote',
  'td',
  'th',
  'dt',
  'dd',
].join(',');

const SEMANTIC_CONTAINER_SELECTOR = [
  'article',
  'main',
  '[role="main"]',
  '[itemtype*="Article" i]',
  '[itemtype*="Posting" i]',
  '[itemtype*="DiscussionForumPosting" i]',
  '[itemprop="articleBody"]',
  '[itemprop="mainContentOfPage"]',
  '[data-testid*="post" i]',
  '[aria-label*="post" i]',
  '[aria-label*="content" i]',
  'shreddit-post',
].join(',');

const MAX_FALLBACK_BLOCKS = 180;
const MAX_REDDIT_COMMENTS = 5;
const MIN_CANDIDATE_CHARS = 120;

export class ArticleExtractor {
  private static readonly BASE_NOISE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'template',
    'svg',
    'canvas',
    'nav',
    'header',
    'footer',
    'aside',
    'form',
    'button',
    'select',
    'textarea',
    'input',
    '[hidden]',
    '[aria-hidden="true"]',
    '[role="banner"]',
    '[role="navigation"]',
    '[role="complementary"]',
    '[role="contentinfo"]',
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[class*="cookie" i]',
    '[id*="cookie" i]',
    '[class*="consent" i]',
    '[id*="consent" i]',
    '[class*="advert" i]',
    '[id*="advert" i]',
    '[class*="ad-" i]',
    '[class*="ads" i]',
    '[class*="promo" i]',
    '[class*="modal" i]',
    '[class*="popup" i]',
    '[class*="newsletter" i]',
    '[class*="subscribe" i]',
    '[class*="share" i]',
    '[class*="social" i]',
    '[class*="sidebar" i]',
    '[class*="recommend" i]',
    '[class*="related" i]',
  ];

  private static readonly COMMENT_NOISE_SELECTORS = [
    '[id*="comments" i]',
    '[class*="comments" i]',
    '[aria-label*="comments" i]',
  ];

  public static extract(settings: WebSettings, contentType?: PageContentType): ArticleExtractionResult {
    const rawMetadata = WebMetadataExtractor.extract();
    const metadata: WebMetadata = settings.metadataEnabled
      ? rawMetadata
      : {
          title: rawMetadata.title,
          canonicalUrl: rawMetadata.canonicalUrl,
          faviconUrl: rawMetadata.faviconUrl,
        };
    const detectedType = this.refineContentType(contentType);
    const baseMetadata = {
      contentType: detectedType,
      sourceUrl: window.location.href,
      metadata: rawMetadata.metadata || {},
    };

    try {
      const selectedText = this.extractSelection();
      if (selectedText) {
        return this.result(metadata, selectedText, rawMetadata.description, detectedType, 'selection', 'success', baseMetadata);
      }

      const structuredContent = this.extractStructuredContent();
      if (hasMeaningfulContent(structuredContent)) {
        return this.result(metadata, structuredContent, rawMetadata.description, detectedType, 'structured', 'success', baseMetadata);
      }

      const semanticContent = this.extractSemanticContent(detectedType);
      if (hasMeaningfulContent(semanticContent)) {
        return this.result(metadata, semanticContent, rawMetadata.description, detectedType, 'semantic', 'success', baseMetadata);
      }

      const readableContent = this.extractReadableContent(detectedType);
      if (hasMeaningfulContent(readableContent)) {
        return this.result(metadata, readableContent, rawMetadata.description, detectedType, 'readability', 'success', baseMetadata);
      }

      const specialCaseContent = this.extractKnownSpecialCaseContent(detectedType);
      if (hasMeaningfulContent(specialCaseContent.content)) {
        return this.result(metadata, specialCaseContent.content, rawMetadata.description, detectedType, 'site-fallback', 'fallback', {
          ...baseMetadata,
          ...specialCaseContent.metadata,
        });
      }

      const visibleContent = this.extractVisibleTextWithIframes(detectedType);
      if (hasMeaningfulContent(visibleContent)) {
        return this.result(metadata, visibleContent, rawMetadata.description, detectedType, 'visible-text', 'fallback', baseMetadata);
      }

      return this.result(metadata, undefined, rawMetadata.description, detectedType, 'metadata-only', 'partial', baseMetadata);
    } catch (error) {
      return this.result(metadata, undefined, rawMetadata.description, detectedType, 'failed', 'failed', {
        ...baseMetadata,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      });
    }
  }

  private static result(
    metadata: WebMetadata,
    content: string | undefined,
    description: string | undefined,
    contentType: PageContentType,
    extractionMethod: ExtractionMethod,
    status: ExtractionStatus,
    extractionMetadata: Record<string, unknown>
  ): ArticleExtractionResult {
    const excerpt = truncateString(description || firstTextBlock(content), EXTRACTION_LIMITS.MAX_EXCERPT_CHARS);
    return {
      metadata,
      fullText: content || undefined,
      excerpt: excerpt || undefined,
      contentType,
      extractionMethod,
      status,
      extractionMetadata,
    };
  }

  private static detectContentType(): PageContentType {
    const url = new URL(window.location.href);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    const hasAppShell = Boolean(document.querySelector('[id="root"], [id="app"], [data-reactroot], [data-nextjs-router]'));
    const paragraphCount = document.querySelectorAll('article p, main p, [role="main"] p').length;
    const isKnownSearchHost = /(^|\.)((google|bing|duckduckgo|yahoo|baidu|yandex)\.)/.test(host);

    if (path.endsWith('.pdf') || document.contentType === 'application/pdf') return 'pdf';
    if (host.includes('reddit.com')) return 'reddit';
    if (host === 'github.com' || host.endsWith('.github.com')) return 'github';
    if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube';
    if (/\/(?:search|results?)(?:\/|$)/i.test(path) || (isKnownSearchHost && url.searchParams.has('q'))) return 'search-results';
    if (
      host.startsWith('docs.') ||
      host.startsWith('developer.') ||
      host.includes('readthedocs.io') ||
      host.includes('gitbook.io') ||
      path.startsWith('/docs') ||
      path.startsWith('/documentation') ||
      path.startsWith('/api/')
    ) {
      return 'documentation';
    }
    if (document.querySelector('article') || paragraphCount >= 4) return 'article';
    if (hasAppShell) return 'spa';
    return 'generic';
  }

  private static refineContentType(contentType?: PageContentType): PageContentType {
    const domType = this.detectContentType();
    if (!contentType) return domType;
    if (contentType === 'article' || contentType === 'generic') {
      if (domType === 'spa' || domType === 'documentation' || domType === 'search-results' || domType === 'pdf') return domType;
    }
    return contentType;
  }

  private static extractSelection(): string | undefined {
    const selection = window.getSelection()?.toString();
    if (!selection || selection.trim().length < 40) return undefined;
    return normalizePlainText(selection);
  }

  private static extractStructuredContent(): string | undefined {
    const blocks: TextBlock[] = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      const text = script.textContent?.trim();
      if (!text) return;
      try {
        collectStructuredArticleBody(JSON.parse(text) as unknown, blocks);
      } catch {
        // Ignore invalid JSON-LD.
      }
    });
    return normalizeContentBlocks(blocks);
  }

  private static extractSemanticContent(contentType: PageContentType): string | undefined {
    const containers = Array.from(document.querySelectorAll(SEMANTIC_CONTAINER_SELECTOR))
      .filter((element) => this.isVisible(element))
      .sort((a, b) => this.scoreElement(b, contentType) - this.scoreElement(a, contentType))
      .slice(0, contentType === 'reddit' || contentType === 'search-results' ? 3 : 1);

    const blocks = containers.flatMap((container) => this.blocksFromElement(container, contentType));
    return normalizeContentBlocks(blocks);
  }

  private static extractReadableContent(contentType: PageContentType): string | undefined {
    const candidate = this.findBestCandidate(contentType);
    if (!candidate) return undefined;
    return normalizeContentBlocks(this.blocksFromElement(candidate.element, contentType));
  }

  private static extractKnownSpecialCaseContent(contentType: PageContentType): { content?: string; metadata?: Record<string, unknown> } {
    if (contentType === 'reddit') return this.extractRedditFallback();
    return {};
  }

  private static extractVisibleTextWithIframes(contentType: PageContentType): string | undefined {
    const blocks = this.blocksFromElement(document.body, contentType).slice(0, MAX_FALLBACK_BLOCKS);

    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        const doc = (frame as HTMLIFrameElement).contentDocument;
        if (doc?.body) blocks.push(...this.blocksFromElement(doc.body, contentType).slice(0, 40));
      } catch {
        // Cross-origin iframes are intentionally inaccessible.
      }
    });

    return normalizeContentBlocks(blocks);
  }

  private static findBestCandidate(contentType: PageContentType): Candidate | undefined {
    const elements = Array.from(document.body.querySelectorAll('article, main, [role="main"], section, div, td'));
    let best: Candidate | undefined;

    for (const element of elements) {
      if (!this.isVisible(element) || this.isNoiseElement(element)) continue;
      const text = element.textContent?.trim() || '';
      if (text.length < MIN_CANDIDATE_CHARS) continue;
      const score = this.scoreElement(element, contentType);
      if (score <= 0) continue;
      const candidate = { element, score, textLength: text.length };
      if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.textLength > best.textLength)) {
        best = candidate;
      }
    }

    return best;
  }

  private static scoreElement(element: Element, contentType: PageContentType): number {
    const text = element.textContent?.trim() || '';
    if (!text) return 0;

    const paragraphs = element.querySelectorAll('p').length;
    const headings = element.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    const lists = element.querySelectorAll('li').length;
    const code = element.querySelectorAll('pre,code').length;
    const buttons = element.querySelectorAll('button,[role="button"],input,select,textarea').length;
    const forms = element.querySelectorAll('form').length;
    const linkDensity = this.linkDensity(element);
    const tag = element.tagName.toLowerCase();
    const textDensity = this.textDensity(element);
    let score = Math.min(text.length / 80, 120) + paragraphs * 8 + headings * 6 + Math.min(lists, 20) * 2 + Math.min(code, 20) * 3;

    if (tag === 'article') score += 40;
    if (tag === 'main') score += 25;
    if (element.getAttribute('role') === 'main') score += 20;
    if (textDensity > 8) score += 12;
    if (contentType === 'documentation' && code > 0) score += 20;
    if (contentType === 'github' && code > 0) score += 25;
    if (contentType === 'reddit' && /\bcomment\b/i.test(`${element.id || ''} ${element.getAttribute('aria-label') || ''}`)) score -= 35;
    if (contentType === 'search-results') score += Math.min(lists, 12) * 3;
    if (/[.!?]\s/.test(text)) score += 10;
    if (this.hasContentHint(element)) score += 15;
    if (this.isNoiseElement(element)) score -= 80;
    score -= forms * 30;
    score -= Math.min(buttons, 20) * 2;
    score -= linkDensity * (contentType === 'search-results' ? 45 : 100);

    return score;
  }

  private static blocksFromElement(element: Element, contentType: PageContentType = 'generic'): TextBlock[] {
    const clone = element.cloneNode(true) as HTMLElement;
    this.removeNoise(clone, contentType);

    const blocks: TextBlock[] = [];
    const blockElements = Array.from(clone.querySelectorAll(BLOCK_SELECTOR));
    const targets = blockElements.length > 0 ? blockElements : [clone];

    for (const block of targets) {
      if (this.hasBlockAncestor(block, targets)) continue;
      const text = block.textContent?.trim();
      if (!text) continue;
      if (!this.isMeaningfulBlockElement(block, text, contentType)) continue;
      blocks.push({ text, kind: this.kindForElement(block) });
    }

    return blocks;
  }

  private static hasBlockAncestor(block: Element, targets: Element[]): boolean {
    const tag = block.tagName.toLowerCase();
    if (tag === 'code' && block.parentElement?.tagName.toLowerCase() === 'pre') return true;
    return targets.some((other) => other !== block && other.contains(block) && isBlockTag(other.tagName.toLowerCase()));
  }

  private static kindForElement(element: Element): TextBlock['kind'] {
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'li') return 'list';
    if (tag === 'pre' || tag === 'code') return 'code';
    if (tag === 'blockquote') return 'quote';
    return 'paragraph';
  }

  private static removeNoise(root: HTMLElement, contentType: PageContentType): void {
    const selectors = contentType === 'github'
      ? this.BASE_NOISE_SELECTORS
      : [...this.BASE_NOISE_SELECTORS, ...this.COMMENT_NOISE_SELECTORS];

    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((element) => element.remove());
    });
    root.querySelectorAll('*').forEach((element) => {
      if (!this.isVisible(element) || this.isNoiseElement(element)) element.remove();
    });
  }

  private static isNoiseElement(element: Element): boolean {
    const value = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''}`.toLowerCase();
    return /\b(nav|menu|breadcrumb|footer|header|sidebar|advert|cookie|consent|modal|popup|promo|newsletter|subscribe|recommend|related|share|social|comment-list)\b/.test(value);
  }

  private static isVisible(element: Element): boolean {
    const htmlElement = element as HTMLElement;
    if (htmlElement.hidden) return false;
    const style = window.getComputedStyle(htmlElement);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = htmlElement.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || Boolean(htmlElement.textContent?.trim());
  }

  private static linkDensity(element: Element): number {
    const textLength = element.textContent?.trim().length || 0;
    if (!textLength) return 1;
    const linkTextLength = Array.from(element.querySelectorAll('a')).reduce((total, link) => total + (link.textContent?.trim().length || 0), 0);
    return linkTextLength / textLength;
  }

  private static textDensity(element: Element): number {
    const textLength = element.textContent?.replace(/\s+/g, ' ').trim().length || 0;
    const childCount = Math.max(1, element.querySelectorAll('*').length);
    return textLength / childCount;
  }

  private static hasContentHint(element: Element): boolean {
    const value = `${element.id || ''} ${element.className || ''} ${element.getAttribute('role') || ''} ${element.getAttribute('itemprop') || ''}`.toLowerCase();
    return /\b(article|content|post|entry|story|readme|markdown|document|question|answer|body|main)\b/.test(value);
  }

  private static isMeaningfulBlockElement(element: Element, text: string, contentType: PageContentType): boolean {
    const tag = element.tagName.toLowerCase();
    const compact = text.replace(/\s+/g, ' ').trim();
    if (!compact) return false;

    if (this.isNoiseElement(element)) return false;
    if (tag === 'code' && element.parentElement?.tagName.toLowerCase() !== 'pre' && compact.length < 80) return false;
    if (tag === 'li' && compact.length < 30 && this.linkDensity(element) > 0.7 && contentType !== 'search-results') return false;
    if (/^(home|search|notifications|settings|profile|sign in|sign up|log in|menu|more|close|open)$/i.test(compact)) return false;
    if (/^(advertisement|sponsored|promoted|related articles?|recommended|share this)$/i.test(compact)) return false;
    if (compact.length < 12 && !/^h[1-6]$/.test(tag) && tag !== 'code') return false;
    if (contentType !== 'search-results' && compact.length < 45 && this.linkDensity(element) > 0.55) return false;
    return true;
  }

  private static extractRedditFallback(): RedditFallback {
    const metadata: Record<string, unknown> = {};
    const post = document.querySelector('shreddit-post, article, [slot="post-container"], main');
    const blocks: TextBlock[] = [];

    const title =
      document.querySelector('shreddit-post')?.getAttribute('post-title') ||
      document.querySelector('[slot="title"], h1')?.textContent?.trim();
    if (title) blocks.push({ text: title, kind: 'heading' });

    const subreddit =
      document.querySelector('shreddit-post')?.getAttribute('subreddit-prefixed-name') ||
      document.querySelector('a[href^="/r/"], a[href*="reddit.com/r/"]')?.textContent?.trim();
    const author =
      document.querySelector('shreddit-post')?.getAttribute('author') ||
      document.querySelector('[author]')?.getAttribute('author') ||
      document.querySelector('a[href^="/user/"], a[href^="/u/"]')?.textContent?.trim();

    if (subreddit) metadata.subreddit = subreddit;
    if (author) metadata.author = author;

    if (post) {
      post.querySelectorAll('[slot*="body" i], [slot*="text" i], p, li, blockquote, pre, code').forEach((element) => {
        const text = element.textContent?.trim();
        if (!text) return;
        const tag = element.tagName.toLowerCase();
        blocks.push({
          text,
          kind: tag === 'pre' || tag === 'code' ? 'code' : tag === 'li' ? 'list' : tag === 'blockquote' ? 'quote' : 'paragraph',
        });
      });
    }

    const comments: TextBlock[] = [];
    document.querySelectorAll('shreddit-comment, [thingid^="t1_"], [data-testid*="comment" i]').forEach((element) => {
      if (comments.length >= MAX_REDDIT_COMMENTS || !this.isVisible(element)) return;
      const text = element.textContent?.trim();
      if (!text || text.length < 60) return;
      comments.push({ text, kind: 'quote' });
    });

    if (comments.length > 0) {
      blocks.push({ text: 'Selected comments', kind: 'heading' });
      blocks.push(...comments);
      metadata.commentBlocksIncluded = comments.length;
    }

    return {
      content: normalizeContentBlocks(blocks),
      metadata,
    };
  }
}

function collectStructuredArticleBody(value: unknown, blocks: TextBlock[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectStructuredArticleBody(item, blocks));
    return;
  }
  if (typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  if (Array.isArray(record['@graph'])) collectStructuredArticleBody(record['@graph'], blocks);
  collectStructuredArticleBody(record.mainEntity, blocks);
  collectStructuredArticleBody(record.acceptedAnswer, blocks);
  collectStructuredArticleBody(record.suggestedAnswer, blocks);
  collectStructuredArticleBody(record.hasPart, blocks);

  const body = record.articleBody || record.text || record.abstract;
  if (typeof body === 'string') blocks.push({ text: body, kind: 'paragraph' });
  if (typeof record.description === 'string' && blocks.length === 0) blocks.push({ text: record.description, kind: 'paragraph' });
  if (typeof record.headline === 'string') blocks.unshift({ text: record.headline, kind: 'heading' });
  if (typeof record.name === 'string' && blocks.length === 0) blocks.unshift({ text: record.name, kind: 'heading' });
}

function firstTextBlock(content: string | undefined): string | undefined {
  return content?.split(/\n{2,}/).find((part) => part.trim().length > 0)?.trim();
}

function isBlockTag(tag: string): boolean {
  return tag === 'pre' || tag === 'blockquote' || /^h[1-6]$/.test(tag) || tag === 'p' || tag === 'li';
}
