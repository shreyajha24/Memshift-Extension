import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsStore } from '../src/storage/settings-store';
import { CaptureStore } from '../src/storage/capture-store';
import { KnowledgeCapture } from '../src/types/capture';

describe('Storage Layer', () => {
  beforeEach(async () => {
    await SettingsStore.resetSettings();
    await CaptureStore.clearLocalCaptures();
    await CaptureStore.clearSyncQueue();
  });

  it('updates and retrieves settings properly', async () => {
    const initial = await SettingsStore.getSettings();
    expect(initial.enabled).toBe(true);

    const updated = await SettingsStore.updateSettings({
      enabled: false,
      priorityKeywords: ['Kafka', 'Go'],
    });

    expect(updated.enabled).toBe(false);
    expect(updated.priorityKeywords).toEqual(['Kafka', 'Go']);

    const fetched = await SettingsStore.getSettings();
    expect(fetched.enabled).toBe(false);
    expect(fetched.priorityKeywords).toEqual(['Kafka', 'Go']);
  });

  it('enqueues and dequeues offline sync items', async () => {
    const mockCapture: KnowledgeCapture = {
      id: 'queue-test-1',
      source: { type: 'article', platform: 'Web', url: 'https://example.com' },
      content: { text: 'Test text' },
      metadata: { capturedAt: new Date().toISOString() },
      engagement: {},
      intelligence: { priorityScore: 50, matchedKeywords: [], topicCandidates: [], subtopics: [] },
      privacy: { transcriptCaptured: false, fullTextCaptured: true, metadataCaptured: true, locallyProcessed: true, backendSynced: true },
    };

    await CaptureStore.enqueueForSync(mockCapture, 'Network timeout');
    const queue = await CaptureStore.getSyncQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].capture.id).toBe('queue-test-1');
    expect(queue[0].attempts).toBe(1);

    await CaptureStore.dequeueFromSync('queue-test-1');
    const queueAfter = await CaptureStore.getSyncQueue();
    expect(queueAfter.length).toBe(0);
  });
});
