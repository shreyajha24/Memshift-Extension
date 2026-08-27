import { SourceType } from './source';

export interface TranscriptChunk {
  text: string;
  start: number;
  duration: number;
}

export type CaptureMethod = 'automatic';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SyncStatus = 'synced' | 'pending' | 'error' | 'disabled';

export interface CaptureContent {
  text?: string;
  excerpt?: string;
  transcript?: TranscriptChunk[];
}

export interface CaptureMetadata {
  capturedAt: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  visitCount?: number;
  visitHistory?: string[];
  contentHash?: string;
  publishedAt?: string;
  description?: string;
  domain?: string;
  siteName?: string;
  contentType?: string;
  extractionMethod?: string;
  extractionStatus?: string;
  extractionMetadata?: Record<string, unknown>;
}

export interface CaptureEngagement {
  currentTimestampSeconds?: number;
  engagementDurationSeconds?: number;
}

export interface CaptureIntelligence {
  priorityScore: number;
  matchedKeywords: string[];
  topicCandidates: string[];
  subtopics: string[];
  // concepts (ids) detected for this capture
  concepts?: string[];
  // inferred parent topic names
  parentTopics?: string[];
}

export interface CapturePrivacy {
  transcriptCaptured: boolean;
  fullTextCaptured: boolean;
  metadataCaptured: boolean;
  locallyProcessed: boolean;
  backendSynced: boolean;
}

export interface KnowledgeCapture {
  id: string;
  source: {
    type: SourceType;
    platform: string;
    url: string;
    canonicalUrl?: string;
    domain?: string;
    title?: string;
    author?: string;
    channel?: string;
    faviconUrl?: string;
  };
  content: CaptureContent;
  metadata: CaptureMetadata;
  engagement: CaptureEngagement;
  intelligence: CaptureIntelligence;
  privacy: CapturePrivacy;
  captureMethod?: CaptureMethod;
  processingStatus?: ProcessingStatus;
  syncStatus?: SyncStatus;
}
