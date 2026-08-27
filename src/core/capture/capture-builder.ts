import { KnowledgeCapture } from '../../types/capture';
import { MemShiftSettings } from '../../types/settings';
import { RelevanceScorer } from '../relevance/scorer';
import { TopicDetector } from '../knowledge/topic-detector';
import { generateMemoryId, normalizeUrl, extractDomain } from '../../shared/utils';
import { sanitizeCapturePayload } from '../../shared/schemas';
import { PrivacyPolicyEngine } from '../../privacy/privacy-policy';

export interface RawExtractedData {
  sourceType: 'youtube' | 'article' | 'documentation' | 'github' | 'generic';
  platform: string;
  url: string;
  canonicalUrl?: string;
  title?: string;
  author?: string;
  channel?: string;
  siteName?: string;
  faviconUrl?: string;
  publishedAt?: string;
  description?: string;
  text?: string;
  excerpt?: string;
  transcript?: { text: string; start: number; duration: number }[];
  currentTimestampSeconds?: number;
  engagementDurationSeconds?: number;
  contentHash?: string;
  contentType?: string;
  extractionMethod?: string;
  extractionStatus?: string;
  extractionMetadata?: Record<string, unknown>;
}

export class CaptureBuilder {
  public static build(raw: RawExtractedData, settings: MemShiftSettings): KnowledgeCapture {
    const rawUrl = raw.url;
    const canonicalUrl = normalizeUrl(raw.canonicalUrl || raw.url, settings.privacy.anonymizeUrlParams);
    const domain = extractDomain(canonicalUrl);
    const title = raw.title || 'Untitled Document';
    const excerpt = raw.excerpt || raw.description || '';
    const contentText = raw.text || (raw.transcript ? raw.transcript.map((t) => t.text).join(' ') : '');

    // Relevance scoring
    const relevance = RelevanceScorer.calculate(
      settings.priorityKeywords,
      title,
      excerpt,
      contentText,
      raw.engagementDurationSeconds || (raw.currentTimestampSeconds ? Math.floor(raw.currentTimestampSeconds) : 0)
    );

    // Topic discovery
    const topicDiscovery = TopicDetector.detect(relevance.matchedKeywords, title, contentText);

    const now = new Date().toISOString();
    const stableId = generateMemoryId(canonicalUrl);

    const rawCapture: KnowledgeCapture = {
      id: stableId,
      source: {
        type: raw.sourceType,
        platform: raw.platform,
        url: rawUrl,
        canonicalUrl,
        domain,
        title,
        author: raw.author,
        channel: raw.channel,
        faviconUrl: raw.faviconUrl,
      },
      content: {
        text: raw.text,
        excerpt,
        transcript: raw.transcript,
      },
      metadata: {
        capturedAt: now,
        firstSeenAt: now,
        lastSeenAt: now,
        visitCount: 1,
        visitHistory: [now],
        domain,
        contentHash: raw.contentHash,
        publishedAt: raw.publishedAt,
        description: raw.description,
        siteName: raw.siteName,
        contentType: raw.contentType,
        extractionMethod: raw.extractionMethod,
        extractionStatus: raw.extractionStatus,
        extractionMetadata: raw.extractionMetadata,
      },
      engagement: {
        currentTimestampSeconds: raw.currentTimestampSeconds,
        engagementDurationSeconds: raw.engagementDurationSeconds,
      },
      intelligence: {
        priorityScore: relevance.score,
        matchedKeywords: relevance.matchedKeywords,
        topicCandidates: topicDiscovery.topics,
        subtopics: topicDiscovery.subtopics,
      },
      privacy: {
        transcriptCaptured: Boolean(raw.transcript && raw.transcript.length > 0),
        fullTextCaptured: Boolean(raw.text && raw.text.length > 0),
        metadataCaptured: true,
        locallyProcessed: true,
        backendSynced: false,
      },
      captureMethod: settings.captureMode,
      processingStatus: 'completed',
      syncStatus: settings.privacy.backendSyncEnabled ? 'pending' : 'disabled',
    };

    // Apply privacy policies (e.g. redact transcript if disabled)
    const privacyEnforced = PrivacyPolicyEngine.enforcePrivacyBoundaries(rawCapture, settings);

    // Apply sanitization and bounds
    return sanitizeCapturePayload(privacyEnforced);
  }
}
