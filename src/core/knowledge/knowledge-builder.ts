import { KnowledgeCapture } from '../../types/capture';

export interface KnowledgeSystemPayload {
  capture: KnowledgeCapture;
  timelineMoment: {
    timestampSeconds?: number;
    capturedAt: string;
    label: string;
  };
  graphNodeCandidates: {
    topics: string[];
    concepts: string[];
    sourceCanonicalUrl: string;
  };
  originTracking: {
    canonicalUrl: string;
    platform: string;
    firstEncounterAt: string;
  };
}

export class KnowledgeBuilder {
  /**
   * Prepares capture data formatted for MemShift's 6 Knowledge Systems.
   */
  public static buildKnowledgePayload(capture: KnowledgeCapture): KnowledgeSystemPayload {
    return {
      capture,
      timelineMoment: {
        timestampSeconds: capture.engagement.currentTimestampSeconds,
        capturedAt: capture.metadata.capturedAt,
        label: capture.source.title || 'Untitled Memory',
      },
      graphNodeCandidates: {
        topics: capture.intelligence.topicCandidates,
        concepts: capture.intelligence.subtopics,
        sourceCanonicalUrl: capture.source.canonicalUrl || capture.source.url,
      },
      originTracking: {
        canonicalUrl: capture.source.canonicalUrl || capture.source.url,
        platform: capture.source.platform,
        firstEncounterAt: capture.metadata.capturedAt,
      },
    };
  }
}
