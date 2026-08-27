import { KnowledgeCapture } from '../types/capture';
import { MemorySaveResult, RecallQuery, RecallResult } from '../types/recall';
import { CaptureStore } from './capture-store';

type SearchField = 'title' | 'excerpt' | 'content' | 'topic' | 'subtopic' | 'priorityKeyword' | 'source';

const FIELD_WEIGHTS: Record<SearchField, number> = {
  title: 36,
  excerpt: 24,
  content: 16,
  topic: 28,
  subtopic: 24,
  priorityKeyword: 34,
  source: 8,
};

export class MemoryRepository {
  public static async save(memory: KnowledgeCapture): Promise<MemorySaveResult> {
    const result = await CaptureStore.recordVisit(memory);
    return {
      memory: result.memory,
      saved: true,
      duplicate: !result.isNew,
      isNew: result.isNew,
      visitCount: result.visitCount,
    };
  }

  public static async getById(id: string): Promise<KnowledgeCapture | undefined> {
    const memories = await CaptureStore.getLocalCaptures();
    return memories.find((memory) => memory.id === id);
  }

  public static async getRecent(limit = 10): Promise<KnowledgeCapture[]> {
    const memories = await CaptureStore.getLocalCaptures();
    return [...memories]
      .sort((a, b) => {
        const timeB = new Date(b.metadata.lastSeenAt || b.metadata.capturedAt).getTime();
        const timeA = new Date(a.metadata.lastSeenAt || a.metadata.capturedAt).getTime();
        return timeB - timeA;
      })
      .slice(0, limit);
  }

  public static async search(query: RecallQuery | string): Promise<RecallResult[]> {
    const recallQuery = typeof query === 'string' ? { query } : query;
    const terms = tokenize(recallQuery.query);
    if (terms.length === 0) return [];

    const memories = await CaptureStore.getLocalCaptures();
    return memories
      .map((memory) => scoreMemory(memory, terms))
      .filter((result) => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, recallQuery.limit ?? 10);
  }

  public static async count(): Promise<number> {
    const memories = await CaptureStore.getLocalCaptures();
    return memories.length;
  }

  public static async delete(id: string): Promise<boolean> {
    return CaptureStore.deleteLocalCapture(id);
  }
}

function scoreMemory(memory: KnowledgeCapture, terms: string[]): RecallResult {
  const matchedTerms = new Set<string>();
  const matchedFields = new Set<string>();
  let score = 0;

  score += scoreField(memory.source.title, 'title', terms, matchedTerms, matchedFields);
  score += scoreField(memory.content.excerpt, 'excerpt', terms, matchedTerms, matchedFields);
  score += scoreField(memory.content.text, 'content', terms, matchedTerms, matchedFields);
  score += scoreField(memory.content.transcript?.map((chunk) => chunk.text).join(' '), 'content', terms, matchedTerms, matchedFields);
  score += scoreField(memory.intelligence.topicCandidates.join(' '), 'topic', terms, matchedTerms, matchedFields);
  score += scoreField(memory.intelligence.subtopics.join(' '), 'subtopic', terms, matchedTerms, matchedFields);
  score += scoreField(memory.intelligence.matchedKeywords.join(' '), 'priorityKeyword', terms, matchedTerms, matchedFields);
  score += scoreField(`${memory.source.platform} ${memory.source.type}`, 'source', terms, matchedTerms, matchedFields);

  if (matchedTerms.size > 0) {
    score += Math.min(10, memory.intelligence.priorityScore / 10);
    score += recencyBoost(memory.metadata.lastSeenAt || memory.metadata.capturedAt);
    score += frequencyBoost(memory.metadata.visitCount || 1);
  }

  return {
    memory,
    relevanceScore: Math.round(score),
    matchedTerms: [...matchedTerms],
    matchedFields: [...matchedFields],
  };
}

function scoreField(
  value: string | undefined,
  field: SearchField,
  terms: string[],
  matchedTerms: Set<string>,
  matchedFields: Set<string>
): number {
  if (!value) return 0;
  const text = normalize(value);
  const words = text.split(' ').filter(Boolean);
  let score = 0;

  for (const term of terms) {
    const exact = text.includes(term);
    const fuzzy = !exact && words.some((word) => word.startsWith(term) || term.startsWith(word));
    if (!exact && !fuzzy) continue;

    matchedTerms.add(term);
    matchedFields.add(field);
    score += FIELD_WEIGHTS[field] * (exact ? 1 : 0.45);
  }

  return score;
}

function tokenize(query: string): string[] {
  const normalized = normalize(query);
  const terms = normalized.split(' ').filter((term) => term.length > 1);
  return [...new Set([normalized, ...terms].filter((term) => term.length > 1))];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function recencyBoost(capturedAt: string): number {
  const captured = new Date(capturedAt).getTime();
  if (Number.isNaN(captured)) return 0;
  const ageDays = Math.max(0, (Date.now() - captured) / 86_400_000);
  if (ageDays <= 1) return 6;
  if (ageDays <= 7) return 4;
  if (ageDays <= 30) return 2;
  return 0;
}

function frequencyBoost(visitCount: number): number {
  if (visitCount >= 10) return 8;
  if (visitCount >= 5) return 5;
  if (visitCount >= 3) return 3;
  if (visitCount >= 2) return 2;
  return 0;
}
