import { KeywordMatcher, KeywordMatchResult } from './keyword-matcher';

export interface RelevanceScoreResult {
  score: number; // 0 - 100
  matchedKeywords: string[];
  matchDetails: KeywordMatchResult[];
}

export class RelevanceScorer {
  /**
   * Computes a deterministic local priority score (0–100) based on user priority keywords and engagement.
   */
  public static calculate(
    priorityKeywords: string[],
    title = '',
    excerpt = '',
    content = '',
    engagementDurationSeconds?: number
  ): RelevanceScoreResult {
    const matches = KeywordMatcher.match(priorityKeywords, title, excerpt, content);
    const matchedKeywords = matches.map((m) => m.keyword);

    if (priorityKeywords.length === 0) {
      // Default baseline score for general captures without configured keywords
      const baseScore = Math.min(60, 40 + (content.length > 500 ? 15 : 5));
      return {
        score: baseScore,
        matchedKeywords: [],
        matchDetails: [],
      };
    }

    if (matches.length === 0) {
      // Baseline score when no user keywords match
      return {
        score: 30,
        matchedKeywords: [],
        matchDetails: [],
      };
    }

    let rawScore = 40; // Base score for at least 1 keyword match

    for (const match of matches) {
      if (match.inTitle) {
        rawScore += 25;
      }
      if (match.inExcerpt) {
        rawScore += 15;
      }
      rawScore += Math.min(15, match.count * 3);
    }

    // Engagement bonus (e.g. video watched > 2 mins or article read)
    if (engagementDurationSeconds && engagementDurationSeconds > 60) {
      const engagementBonus = Math.min(10, Math.floor(engagementDurationSeconds / 60) * 2);
      rawScore += engagementBonus;
    }

    // Content completeness bonus
    if (content.length > 1000) {
      rawScore += 5;
    }

    // Clamp strictly between 0 and 100
    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));

    return {
      score: finalScore,
      matchedKeywords,
      matchDetails: matches,
    };
  }
}
