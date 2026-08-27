import { BackendClient } from './backend-client';
import { CaptureBuilder, RawExtractedData } from '../core/capture/capture-builder';
import { PrivacyPolicyEngine } from '../privacy/privacy-policy';
import { SettingsStore } from '../storage/settings-store';
import { CaptureStore } from '../storage/capture-store';
import { LocalRuleClassifier } from '../knowledge/classifier';
import { KnowledgeRepository } from '../storage/knowledge-repository';
import { RelationshipEngine } from '../knowledge/relationship-engine';
import { NavigationDeduplicator } from '../core/capture/navigation-deduplicator';
import { normalizeUrl } from '../shared/utils';

export class CaptureProcessor {
  public static async process(
    raw: RawExtractedData,
    options?: { forceNewVisit?: boolean }
  ): Promise<{ saved: boolean; duplicate: boolean }> {
    const settings = await SettingsStore.getSettings();
    if (!PrivacyPolicyEngine.isMasterEnabled(settings)) {
      return { saved: false, duplicate: false };
    }

    const canonicalUrl = normalizeUrl(raw.canonicalUrl || raw.url, settings.privacy.anonymizeUrlParams);
    const isRapidDuplicate = options?.forceNewVisit ? false : NavigationDeduplicator.isRapidDuplicateEvent(canonicalUrl);

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
      capture.intelligence.concepts = classification.concepts.map((c) => c.id);
      capture.intelligence.parentTopics = classification.parentTopics;

      // Atomically record visit
      const result = await CaptureStore.recordVisit(capture, {
        incrementVisitCount: !isRapidDuplicate,
      });

      // Index into knowledge repository
      await KnowledgeRepository.indexMemory(result.memory);

      // Discover relationships with lightweight engine
      await RelationshipEngine.discoverRelationships(result.memory);

      if (settings.privacy.backendSyncEnabled) {
        await BackendClient.sendCapture(result.memory);
      }

      return { saved: true, duplicate: !result.isNew };
    } catch {
      // classification/indexing must not break capture flow
      try {
        const result = await CaptureStore.recordVisit(capture, {
          incrementVisitCount: !isRapidDuplicate,
        });
        if (settings.privacy.backendSyncEnabled) await BackendClient.sendCapture(result.memory);
        return { saved: true, duplicate: !result.isNew };
      } catch {
        return { saved: false, duplicate: false };
      }
    }
  }
}
