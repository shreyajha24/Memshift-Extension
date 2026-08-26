import { normalizeUrl } from '../../shared/utils';
import { KnowledgeCapture } from '../../types/capture';

export class CaptureDeduplicator {
  /**
   * Determines if a new capture is a duplicate of an existing capture.
   * For YouTube videos, captures with different timestamps (> 30s apart) are distinct moments.
   */
  public static isDuplicate(
    newCapture: KnowledgeCapture,
    existingCaptures: KnowledgeCapture[]
  ): { isDuplicate: boolean; duplicateId?: string } {
    const newCanonical = normalizeUrl(newCapture.source.canonicalUrl || newCapture.source.url);

    for (const existing of existingCaptures) {
      const existingCanonical = normalizeUrl(existing.source.canonicalUrl || existing.source.url);

      if (newCanonical === existingCanonical) {
        const newHash = newCapture.metadata.contentHash;
        const existingHash = existing.metadata.contentHash;
        if (newHash && existingHash && newHash === existingHash) {
          return { isDuplicate: true, duplicateId: existing.id };
        }

        if (newCapture.source.type === 'youtube') {
          const newTime = newCapture.engagement.currentTimestampSeconds ?? 0;
          const existingTime = existing.engagement.currentTimestampSeconds ?? 0;

          // If within 30 seconds of an existing capture on the same video, consider duplicate
          if (Math.abs(newTime - existingTime) < 30) {
            return { isDuplicate: true, duplicateId: existing.id };
          }
        } else if (!newHash || !existingHash) {
          // Older captures lack a content hash, so retain canonical URL fallback.
          return { isDuplicate: true, duplicateId: existing.id };
        }
      }
    }

    return { isDuplicate: false };
  }
}
