import { describe, it, expect } from 'vitest';
import { PrivacyPolicyEngine } from '../src/privacy/privacy-policy';
import { DEFAULT_SETTINGS, MemShiftSettings } from '../src/types/settings';
import { KnowledgeCapture } from '../src/types/capture';

describe('PrivacyPolicyEngine', () => {
  it('enforces master toggle state correctly', () => {
    const enabledSettings: MemShiftSettings = { ...DEFAULT_SETTINGS, enabled: true };
    expect(PrivacyPolicyEngine.isMasterEnabled(enabledSettings)).toBe(true);

    const disabledSettings: MemShiftSettings = { ...DEFAULT_SETTINGS, enabled: false };
    expect(PrivacyPolicyEngine.isMasterEnabled(disabledSettings)).toBe(false);
  });

  it('rejects unsupported browser system URLs', () => {
    expect(PrivacyPolicyEngine.isSupportedUrl('chrome://settings').supported).toBe(false);
    expect(PrivacyPolicyEngine.isSupportedUrl('chrome-extension://abcdef/popup.html').supported).toBe(false);
    expect(PrivacyPolicyEngine.isSupportedUrl('edge://extensions').supported).toBe(false);
    expect(PrivacyPolicyEngine.isSupportedUrl('about:blank').supported).toBe(false);
    expect(PrivacyPolicyEngine.isSupportedUrl('https://github.com').supported).toBe(true);
    expect(PrivacyPolicyEngine.isSupportedUrl('http://localhost:3000').supported).toBe(true);
  });

  it('redacts transcript when transcriptEnabled is false', () => {
    const settings: MemShiftSettings = {
      ...DEFAULT_SETTINGS,
      youtube: { transcriptEnabled: false, metadataEnabled: true },
    };

    const mockCapture: KnowledgeCapture = {
      id: 'cap-1',
      source: { type: 'youtube', platform: 'YouTube', url: 'https://youtube.com/watch?v=1' },
      content: { transcript: [{ text: 'Hello', start: 0, duration: 5 }] },
      metadata: { capturedAt: new Date().toISOString() },
      engagement: {},
      intelligence: { priorityScore: 50, matchedKeywords: [], topicCandidates: [], subtopics: [] },
      privacy: { transcriptCaptured: true, fullTextCaptured: false, metadataCaptured: true, locallyProcessed: true, backendSynced: true },
    };

    const result = PrivacyPolicyEngine.enforcePrivacyBoundaries(mockCapture, settings);
    expect(result.content.transcript).toBeUndefined();
    expect(result.privacy.transcriptCaptured).toBe(false);
  });

  it('redacts full text when fullTextEnabled is false', () => {
    const settings: MemShiftSettings = {
      ...DEFAULT_SETTINGS,
      web: { fullTextEnabled: false, metadataEnabled: true },
    };

    const mockCapture: KnowledgeCapture = {
      id: 'cap-2',
      source: { type: 'article', platform: 'Web', url: 'https://example.com' },
      content: { text: 'Entire secret article body text' },
      metadata: { capturedAt: new Date().toISOString() },
      engagement: {},
      intelligence: { priorityScore: 50, matchedKeywords: [], topicCandidates: [], subtopics: [] },
      privacy: { transcriptCaptured: false, fullTextCaptured: true, metadataCaptured: true, locallyProcessed: true, backendSynced: true },
    };

    const result = PrivacyPolicyEngine.enforcePrivacyBoundaries(mockCapture, settings);
    expect(result.content.text).toBeUndefined();
    expect(result.privacy.fullTextCaptured).toBe(false);
  });
});
