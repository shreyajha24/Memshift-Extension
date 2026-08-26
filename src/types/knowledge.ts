import { SourceType } from './source';

export type NodeType = 'topic' | 'concept' | 'source' | 'capture';

export type KnowledgeRelationship =
  | 'contains'
  | 'related_to'
  | 'derived_from'
  | 'supports'
  | 'contradicts'
  | 'similar_to';

export interface Topic {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  createdAt: string;
}

export interface Concept {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  createdAt: string;
}

export interface KnowledgeEdge {
  id: string;
  userId: string;
  fromType: NodeType;
  fromId: string;
  toType: NodeType;
  toId: string;
  relationship: KnowledgeRelationship;
  confidence: number;
  createdAt: string;
}

export interface HybridSearchResult {
  captureId: string;
  sourceId: string;
  title: string;
  url: string;
  sourceType: SourceType;
  platform: string;
  excerpt: string;
  capturedAt: string;
  engagementTimestampSeconds?: number;
  priorityScore: number;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
}

export interface RelatedMemory {
  captureId: string;
  title: string;
  url: string;
  sourceType: SourceType;
  excerpt: string;
  similarity: number;
  sharedConcepts?: string[];
  relationship?: KnowledgeRelationship;
}
