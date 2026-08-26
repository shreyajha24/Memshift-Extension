import { EXTRACTION_LIMITS } from '../../shared/constants';
import { truncateString } from '../../shared/utils';

export interface GitHubExtractionResult {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  title: string;
  description?: string;
  readmeText?: string;
  codeSnippet?: string;
  canonicalUrl: string;
  faviconUrl: string;
}

export class GitHubExtractor {
  public static extract(): GitHubExtractionResult | null {
    try {
      const url = new URL(window.location.href);
      if (!url.hostname.includes('github.com')) {
        return null;
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length < 2) {
        return null;
      }

      const owner = segments[0];
      const repo = segments[1];

      let branch: string | undefined = undefined;
      let path: string | undefined = undefined;

      if (segments.length >= 4 && (segments[2] === 'blob' || segments[2] === 'tree')) {
        branch = segments[3];
        path = segments.slice(4).join('/');
      }

      // Title
      const title = `${owner}/${repo}${path ? ` - ${path}` : ''}`;

      // Description (from repository about section)
      let description: string | undefined = undefined;
      const descEl = document.querySelector('.BorderGrid-cell p.f4, p[itemprop="about"]');
      if (descEl && descEl.textContent) {
        description = descEl.textContent.trim();
      }

      // Readme Content
      let readmeText: string | undefined = undefined;
      const readmeEl = document.querySelector('#readme article.markdown-body, article.markdown-body');
      if (readmeEl && readmeEl.textContent) {
        readmeText = readmeEl.textContent.trim().slice(0, EXTRACTION_LIMITS.MAX_ARTICLE_CHARS);
      }

      // Code snippet if on blob page
      let codeSnippet: string | undefined = undefined;
      const codeContainer = document.querySelector('.blob-wrapper table, .react-code-lines');
      if (codeContainer && codeContainer.textContent) {
        codeSnippet = codeContainer.textContent.trim().slice(0, 10000);
      }

      return {
        owner,
        repo,
        branch,
        path,
        title,
        description: truncateString(description, EXTRACTION_LIMITS.MAX_DESCRIPTION_CHARS) || undefined,
        readmeText,
        codeSnippet,
        canonicalUrl: `https://github.com/${owner}/${repo}${path ? `/blob/${branch}/${path}` : ''}`,
        faviconUrl: 'https://github.githubassets.com/favicons/favicon.png',
      };
    } catch {
      return null;
    }
  }
}
