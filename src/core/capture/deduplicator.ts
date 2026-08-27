import { normalizeUrl } from '../../shared/utils';
import { KnowledgeCapture } from '../../types/capture';

export class CaptureDeduplicator {
  /**
   * Determines if a new capture is a duplicate of an existing capture based on canonical URL or ID.
   */
  public static isDuplicate(
    newCapture: KnowledgeCapture,
    existingCaptures: KnowledgeCapture[]
  ): { isDuplicate: boolean; duplicateId?: string } {
    const newCanonical = normalizeUrl(newCapture.source.canonicalUrl || newCapture.source.url);

    for (const existing of existingCaptures) {
      if (existing.id && newCapture.id && existing.id === newCapture.id) {
        return { isDuplicate: true, duplicateId: existing.id };
      }

      const existingCanonical = normalizeUrl(existing.source.canonicalUrl || existing.source.url);
      if (newCanonical && existingCanonical && newCanonical === existingCanonical) {
        return { isDuplicate: true, duplicateId: existing.id };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Finds an existing capture matching the canonical URL or ID.
   */
  public static findExisting(
    canonicalUrlOrId: string,
    existingCaptures: KnowledgeCapture[]
  ): KnowledgeCapture | undefined {
    const targetCanonical = normalizeUrl(canonicalUrlOrId);
    return existingCaptures.find((c) => {
      if (c.id === canonicalUrlOrId) return true;
      const cCanonical = normalizeUrl(c.source.canonicalUrl || c.source.url);
      return Boolean(cCanonical && targetCanonical && cCanonical === targetCanonical);
    });
  }

  /**
   * Finds the index of an existing capture matching the canonical URL or ID.
   */
  public static findExistingIndex(
    canonicalUrlOrId: string,
    existingCaptures: KnowledgeCapture[]
  ): number {
    const targetCanonical = normalizeUrl(canonicalUrlOrId);
    return existingCaptures.findIndex((c) => {
      if (c.id === canonicalUrlOrId) return true;
      const cCanonical = normalizeUrl(c.source.canonicalUrl || c.source.url);
      return Boolean(cCanonical && targetCanonical && cCanonical === targetCanonical);
    });
  }
}
