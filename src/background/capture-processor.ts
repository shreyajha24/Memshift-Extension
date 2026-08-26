import { BackendClient } from './backend-client';
import { CaptureBuilder, RawExtractedData } from '../core/capture/capture-builder';
import { PrivacyPolicyEngine } from '../privacy/privacy-policy';
import { SettingsStore } from '../storage/settings-store';
import { CaptureStore } from '../storage/capture-store';
import { LocalRuleClassifier } from '../knowledge/classifier';
import { KnowledgeRepository } from '../storage/knowledge-repository';
import { RelationshipEngine } from '../knowledge/relationship-engine';

export class CaptureProcessor {
  public static async process(raw: RawExtractedData): Promise<{ saved: boolean; duplicate: boolean }> {
    const settings = await SettingsStore.getSettings();
    if (!PrivacyPolicyEngine.isMasterEnabled(settings)) {
      return { saved: false, duplicate: false };
    }

    const capture = CaptureBuilder.build(raw, settings);

    // Run local classification (non-blocking but await to ensure knowledge graph updates)
    try {
      const classification = LocalRuleClassifier.classify(
        capture.source.title || '',
        capture.content.excerpt,
        capture.content.text,
        capture.metadata.description,
        settings.priorityKeywords
      );

      // Attach concepts and inferred parent topics into intelligence for recall use
      // keep original fields untouched
      capture.intelligence.concepts = classification.concepts.map((c) => c.id);
      capture.intelligence.parentTopics = classification.parentTopics;

      // Save memory first
      const saved = await CaptureStore.saveIfNew(capture);
      if (!saved) return { saved: false, duplicate: true };

      // Index into knowledge repository
      await KnowledgeRepository.indexMemory(capture);

      // Discover relationships with lightweight engine
      await RelationshipEngine.discoverRelationships(capture);

      if (settings.privacy.backendSyncEnabled) {
        await BackendClient.sendCapture(capture);
      }

      return { saved: true, duplicate: false };
    } catch {
      // classification/indexing must not break capture flow
      try {
        const saved = await CaptureStore.saveIfNew(capture);
        if (saved && settings.privacy.backendSyncEnabled) await BackendClient.sendCapture(capture);
      } catch {
        // swallow
      }
      return { saved: true, duplicate: false };
    }
  }
}
