import { KnowledgeCapture } from '../types/capture';
import { MemShiftSettings } from '../types/settings';
import { EXTRACTION_LIMITS } from './constants';
import { truncateString, normalizeUrl } from './utils';

export function validateCapturePayload(capture: KnowledgeCapture): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!capture) {
    return { valid: false, errors: ['Capture payload cannot be empty'] };
  }

  if (!capture.id) {
    errors.push('Missing capture ID');
  }

  if (!capture.source || !capture.source.url) {
    errors.push('Missing source URL');
  }

  if (capture.source && !['youtube', 'article', 'documentation', 'github', 'generic'].includes(capture.source.type)) {
    errors.push(`Invalid source type: ${capture.source.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeCapturePayload(capture: KnowledgeCapture): KnowledgeCapture {
  return {
    ...capture,
    source: {
      ...capture.source,
      url: normalizeUrl(capture.source.url),
      canonicalUrl: normalizeUrl(capture.source.canonicalUrl || capture.source.url),
      title: truncateString(capture.source.title, EXTRACTION_LIMITS.MAX_TITLE_CHARS),
      author: truncateString(capture.source.author, 255),
      channel: truncateString(capture.source.channel, 255),
    },
    content: {
      text: truncateString(capture.content.text, EXTRACTION_LIMITS.MAX_ARTICLE_CHARS),
      excerpt: truncateString(capture.content.excerpt, EXTRACTION_LIMITS.MAX_EXCERPT_CHARS),
      transcript: capture.content.transcript?.slice(0, 1000), // Max 1000 chunks
    },
    metadata: {
      ...capture.metadata,
      description: truncateString(capture.metadata.description, EXTRACTION_LIMITS.MAX_DESCRIPTION_CHARS),
    },
    intelligence: {
      ...capture.intelligence,
      priorityScore: Math.min(100, Math.max(0, capture.intelligence.priorityScore || 0)),
      matchedKeywords: capture.intelligence.matchedKeywords.slice(0, 50),
      topicCandidates: capture.intelligence.topicCandidates.slice(0, 20),
      subtopics: capture.intelligence.subtopics.slice(0, 20),
    },
  };
}

export function sanitizeSettings(settings: Partial<MemShiftSettings>): Partial<MemShiftSettings> {
  const clean: Partial<MemShiftSettings> = {};

  if (typeof settings.enabled === 'boolean') {
    clean.enabled = settings.enabled;
  }

  if (settings.captureMode === 'automatic') clean.captureMode = settings.captureMode;

  if (Array.isArray(settings.priorityKeywords)) {
    clean.priorityKeywords = settings.priorityKeywords
      .filter((k) => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.trim().slice(0, 100))
      .slice(0, 100);
  }

  if (settings.youtube) {
    clean.youtube = {
      transcriptEnabled: Boolean(settings.youtube.transcriptEnabled),
      metadataEnabled: Boolean(settings.youtube.metadataEnabled),
    };
  }

  if (settings.web) {
    clean.web = {
      fullTextEnabled: Boolean(settings.web.fullTextEnabled),
      metadataEnabled: Boolean(settings.web.metadataEnabled),
    };
  }

  if (settings.privacy) {
    clean.privacy = {
      backendSyncEnabled: Boolean(settings.privacy.backendSyncEnabled),
      anonymizeUrlParams: Boolean(settings.privacy.anonymizeUrlParams),
    };
  }

  return clean;
}
