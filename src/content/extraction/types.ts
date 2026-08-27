import { SourceType } from '../../types/source';

export type PageContentType =
  | 'article'
  | 'documentation'
  | 'github'
  | 'reddit'
  | 'youtube'
  | 'pdf'
  | 'search-results'
  | 'spa'
  | 'generic';

export type ExtractionMethod =
  | 'selection'
  | 'structured'
  | 'semantic'
  | 'readability'
  | 'visible-text'
  | 'site-fallback'
  | 'metadata-only'
  | 'failed';

export type ExtractionStatus = 'success' | 'partial' | 'fallback' | 'failed';

export interface NormalizedExtractionResult {
  title: string;
  description?: string;
  author?: string;
  sourceUrl: string;
  canonicalUrl?: string;
  siteName?: string;
  faviconUrl?: string;
  content?: string;
  contentType: PageContentType;
  sourceType: SourceType;
  platform: string;
  publishedAt?: string;
  metadata: Record<string, unknown>;
  extractionMethod: ExtractionMethod;
  status: ExtractionStatus;
}

export interface TextBlock {
  text: string;
  kind?: 'heading' | 'paragraph' | 'list' | 'code' | 'quote';
}
