import { KnowledgeCapture } from './capture';

export interface RecallQuery {
  query: string;
  limit?: number;
}

export interface RecallResult {
  memory: KnowledgeCapture;
  relevanceScore: number;
  matchedTerms: string[];
  matchedFields: string[];
}

export interface MemoryEmbedding {
  memoryId: string;
  model: string;
  dimensions: number;
  vector: number[];
  createdAt: string;
}

export interface SemanticSearchService {
  search(query: RecallQuery): Promise<RecallResult[]>;
  upsertEmbedding(embedding: MemoryEmbedding): Promise<void>;
}

export interface MemorySaveResult {
  memory: KnowledgeCapture;
  saved: boolean;
  duplicate: boolean;
  isNew?: boolean;
  visitCount?: number;
}
