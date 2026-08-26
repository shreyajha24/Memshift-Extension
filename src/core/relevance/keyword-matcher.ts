export interface KeywordMatchResult {
  keyword: string;
  count: number;
  inTitle: boolean;
  inExcerpt: boolean;
  inContent: boolean;
}

export class KeywordMatcher {
  /**
   * Evaluates text against a list of priority keywords using deterministic boundary matching.
   */
  public static match(
    keywords: string[],
    title = '',
    excerpt = '',
    content = ''
  ): KeywordMatchResult[] {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    const results: KeywordMatchResult[] = [];
    const normalizedTitle = title.toLowerCase();
    const normalizedExcerpt = excerpt.toLowerCase();
    const normalizedContent = content.toLowerCase();

    for (const rawKeyword of keywords) {
      const keyword = rawKeyword.trim();
      if (!keyword) continue;

      const normalizedKw = keyword.toLowerCase();
      // Escape regex special chars
      const escaped = normalizedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

      const inTitle = normalizedTitle.includes(normalizedKw);
      const inExcerpt = normalizedExcerpt.includes(normalizedKw);
      const inContent = normalizedContent.includes(normalizedKw);

      // Count occurrences
      const titleMatches = (normalizedTitle.match(regex) || []).length;
      const excerptMatches = (normalizedExcerpt.match(regex) || []).length;
      const contentMatches = (normalizedContent.match(regex) || []).length;
      const totalCount = titleMatches * 3 + excerptMatches * 2 + contentMatches;

      if (inTitle || inExcerpt || inContent || totalCount > 0) {
        results.push({
          keyword,
          count: Math.max(totalCount, 1),
          inTitle,
          inExcerpt,
          inContent,
        });
      }
    }

    return results;
  }
}
