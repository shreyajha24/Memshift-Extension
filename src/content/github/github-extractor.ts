import { EXTRACTION_LIMITS } from '../../shared/constants';
import { truncateString } from '../../shared/utils';
import { ArticleExtractor } from '../web/article-extractor';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { normalizeContentBlocks } from '../extraction/content-normalizer';
import { TextBlock } from '../extraction/types';

export interface GitHubExtractionResult {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  pageKind: 'repository' | 'readme' | 'issue' | 'pull-request' | 'discussion' | 'code' | 'documentation';
  title: string;
  description?: string;
  readmeText?: string;
  codeSnippet?: string;
  canonicalUrl: string;
  faviconUrl: string;
  extractionMethod?: string;
  extractionMetadata?: Record<string, unknown>;
}

export class GitHubExtractor {
  public static extract(): GitHubExtractionResult | null {
    try {
      const url = new URL(window.location.href);
      if (url.hostname !== 'github.com' && !url.hostname.endsWith('.github.com')) return null;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length < 2) return null;

      const owner = segments[0];
      const repo = segments[1];
      const pageKind = detectGitHubPageKind(segments);
      const { branch, path } = getGitHubPathInfo(segments);
      const generic = ArticleExtractor.extract(DEFAULT_SETTINGS.web, 'github');
      const codeSnippet = pageKind === 'code' ? extractCodeSnippet() : undefined;
      const fallbackMarkdown = extractGitHubMarkdownFallback();
      const fullText = pageKind === 'code'
        ? codeSnippet || generic.fullText || fallbackMarkdown
        : generic.fullText || fallbackMarkdown || codeSnippet;
      const metadataTitle = generic.metadata.title && !/^github$/i.test(generic.metadata.title)
        ? generic.metadata.title.replace(/\s*[-·]\s*GitHub\s*$/i, '').trim()
        : '';
      const title = metadataTitle || `${owner}/${repo}${path ? ` - ${path}` : ''}`;
      const description = generic.metadata.description || extractRepoDescription();

      return {
        owner,
        repo,
        branch,
        path,
        pageKind,
        title,
        description: truncateString(description, EXTRACTION_LIMITS.MAX_DESCRIPTION_CHARS) || undefined,
        readmeText: fullText?.slice(0, EXTRACTION_LIMITS.MAX_ARTICLE_CHARS),
        codeSnippet,
        canonicalUrl: canonicalGitHubUrl(url, owner, repo, branch, path, pageKind),
        faviconUrl: 'https://github.githubassets.com/favicons/favicon.png',
        extractionMethod: generic.extractionMethod,
        extractionMetadata: {
          ...generic.extractionMetadata,
          githubPageKind: pageKind,
        },
      };
    } catch {
      return null;
    }
  }
}

function detectGitHubPageKind(segments: string[]): GitHubExtractionResult['pageKind'] {
  const area = segments[2];
  if (!area) return 'repository';
  if (area === 'blob' || area === 'tree') return 'code';
  if (area === 'issues') return 'issue';
  if (area === 'pull') return 'pull-request';
  if (area === 'discussions') return 'discussion';
  if (area === 'wiki' || area === 'pages') return 'documentation';
  return 'readme';
}

function getGitHubPathInfo(segments: string[]): { branch?: string; path?: string } {
  if (segments.length >= 4 && (segments[2] === 'blob' || segments[2] === 'tree')) {
    return {
      branch: segments[3],
      path: segments.slice(4).join('/'),
    };
  }
  return {};
}

function canonicalGitHubUrl(
  url: URL,
  owner: string,
  repo: string,
  branch: string | undefined,
  path: string | undefined,
  pageKind: GitHubExtractionResult['pageKind']
): string {
  if (pageKind === 'code' && path) return `https://github.com/${owner}/${repo}/blob/${branch || 'HEAD'}/${path}`;
  return `https://github.com${url.pathname}`;
}

function extractRepoDescription(): string | undefined {
  const about = document.querySelector('[itemprop="about"], [aria-label*="repository" i] p');
  return about?.textContent?.trim() || undefined;
}

function extractGitHubMarkdownFallback(): string | undefined {
  const blocks: TextBlock[] = [];
  document.querySelectorAll('article, [data-testid*="readme" i], [class*="markdown" i]').forEach((container) => {
    container.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,pre,code,blockquote').forEach((element) => {
      const text = element.textContent?.trim();
      if (!text) return;
      const tag = element.tagName.toLowerCase();
      blocks.push({
        text,
        kind: tag === 'pre' || tag === 'code' ? 'code' : tag === 'li' ? 'list' : tag === 'blockquote' ? 'quote' : /^h[1-6]$/.test(tag) ? 'heading' : 'paragraph',
      });
    });
  });
  return normalizeContentBlocks(blocks);
}

function extractCodeSnippet(): string | undefined {
  const blocks: TextBlock[] = [];
  const pathTitle = getVisibleText('[aria-label*="Breadcrumb" i], [data-testid*="breadcrumb" i]');
  if (pathTitle) blocks.push({ text: pathTitle, kind: 'heading' });

  const preBlocks = Array.from(document.querySelectorAll('pre, pre code'))
    .map((element) => element.textContent?.trim())
    .filter((text): text is string => Boolean(text && text.length > 20));

  if (preBlocks.length > 0) {
    for (const text of preBlocks) blocks.push({ text, kind: 'code' });
    return normalizeContentBlocks(blocks, 10_000);
  }

  const lineBlocks = Array.from(document.querySelectorAll('[data-line-number], td[id^="LC"], [role="row"]'))
    .map((element) => element.textContent?.replace(/^\s*\d+\s*/, '').trim())
    .filter((text): text is string => Boolean(text && text.length > 1));

  if (lineBlocks.length > 0) {
    blocks.push({ text: lineBlocks.slice(0, 500).join('\n'), kind: 'code' });
  }
  return normalizeContentBlocks(blocks, 10_000);
}

function getVisibleText(selector: string): string | undefined {
  const element = document.querySelector(selector);
  return element?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
}
