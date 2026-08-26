import { CONCEPTS, TOPICS } from './taxonomy';
import { ClassificationResult } from './types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Local rule-based classifier (MVP)
export class LocalRuleClassifier {
  // Scoring weights (per spec)
  private static TITLE = 40;
  private static EXCERPT = 15;
  private static BODY = 10;
  private static METADATA = 5;
  private static USER_PRIORITY = 20;
  private static ALIAS = 15;

  public static classify(
    title: string,
    excerpt: string | undefined,
    body: string | undefined,
    metadata: string | undefined,
    userPriorityKeywords: string[] = [],
    threshold = 40
  ): ClassificationResult {
    const textTitle = normalize(title || '');
    const textExcerpt = normalize(excerpt || '');
    const textBody = normalize(body || '');
    const textMetadata = normalize(metadata || '');

    const prioritySet = new Set(userPriorityKeywords.map((k) => normalize(k)));

    const conceptScores: Map<string, number> = new Map();

    for (const concept of CONCEPTS) {
      let score = 0;
      for (const alias of concept.aliases) {
        const a = normalize(alias);
        if (a.length === 0) continue;
        if (textTitle.includes(a)) score += this.TITLE + this.ALIAS;
        if (textExcerpt.includes(a)) score += this.EXCERPT + this.ALIAS;
        if (textBody.includes(a)) score += this.BODY;
        if (textMetadata.includes(a)) score += this.METADATA;
      }
      // user priority influence
      for (const p of prioritySet) {
        if (concept.aliases.some((al) => normalize(al) === p) || normalize(concept.name) === p) {
          score += this.USER_PRIORITY;
        }
      }
      if (score > 0) conceptScores.set(concept.id, Math.min(100, Math.round(score)));
    }

    const concepts = Array.from(conceptScores.entries())
      .map(([id, score]) => {
        const def = CONCEPTS.find((c) => c.id === id)!;
        return { id, name: def ? def.name : id, score };
      })
      .filter((c) => c.score >= threshold)
      .sort((a, b) => b.score - a.score);

    // Aggregate topics from concepts and taxonomy mapping
    const topicMap: Map<string, number> = new Map();
    for (const c of concepts) {
      const def = CONCEPTS.find((x) => x.id === c.id)!;
      for (const parent of def.parentIds) {
        const current = topicMap.get(parent) || 0;
        topicMap.set(parent, Math.min(100, current + c.score));
      }
    }

    const topics = Array.from(topicMap.entries())
      .map(([id, score]) => {
        const t = TOPICS.find((x) => x.id === id);
        return { id, name: t ? t.name : id, score };
      })
      .sort((a, b) => b.score - a.score);

    // Parent topic inference: climb parentId chain
    const parentTopics = new Set<string>();
    for (const t of topics) {
      let pid = t.id;
      while (true) {
        const node = TOPICS.find((x) => x.id === pid);
        if (!node) break;
        parentTopics.add(node.name);
        if (!node.parentId) break;
        pid = node.parentId;
      }
    }

    return { concepts, topics, parentTopics: Array.from(parentTopics) };
  }
}
