import { SourceMetadata, SourceType, PlatformType } from '../../types/source';
import { normalizeUrl, truncateString } from '../../shared/utils';
import { EXTRACTION_LIMITS } from '../../shared/constants';

export class SourceMapper {
  public static mapToSource(
    rawUrl: string,
    canonicalUrl: string,
    sourceType: SourceType,
    platform: PlatformType | string,
    title?: string,
    author?: string,
    channel?: string,
    faviconUrl?: string,
    publishedAt?: string
  ): SourceMetadata {
    return {
      url: normalizeUrl(rawUrl),
      canonicalUrl: normalizeUrl(canonicalUrl || rawUrl),
      sourceType,
      platform,
      title: truncateString(title, EXTRACTION_LIMITS.MAX_TITLE_CHARS),
      author: truncateString(author, 255),
      channel: truncateString(channel, 255),
      faviconUrl: faviconUrl || '/favicon.ico',
      publishedAt: publishedAt || undefined,
    };
  }
}
