export type SourceType = 'youtube' | 'article' | 'documentation' | 'github' | 'generic';

export type PlatformType = 'YouTube' | 'GitHub' | 'Web' | 'Medium' | 'Dev.to' | 'Substack' | 'ArXiv' | 'Docs';

export interface SourceMetadata {
  id?: string;
  url: string;
  canonicalUrl: string;
  sourceType: SourceType;
  platform: PlatformType | string;
  title?: string;
  author?: string;
  channel?: string;
  faviconUrl?: string;
  publishedAt?: string;
}
