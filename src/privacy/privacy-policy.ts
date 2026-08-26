import { MemShiftSettings } from '../types/settings';
import { KnowledgeCapture } from '../types/capture';
import { getUnsupportedPageReason, isCapturableUrl } from './url-eligibility';

export { getUnsupportedPageReason, isCapturableUrl } from './url-eligibility';

export class PrivacyPolicyEngine {
  /**
   * Checks if an action is permitted under the master toggle.
   */
  public static isMasterEnabled(settings: MemShiftSettings): boolean {
    return Boolean(settings && settings.enabled);
  }

  /**
   * Validates if a target URL is supported for capture.
   * Disallows internal browser schemes, extension contexts, and empty URLs.
   */
  public static isSupportedUrl(url: string | undefined | null): { supported: boolean; reason?: string } {
    const reason = getUnsupportedPageReason(url);
    return reason ? { supported: false, reason } : { supported: isCapturableUrl(url) };
  }

  /**
   * Applies privacy enforcement to a capture object based on active settings.
   */
  public static enforcePrivacyBoundaries(
    capture: KnowledgeCapture,
    settings: MemShiftSettings
  ): KnowledgeCapture {
    const enforced: KnowledgeCapture = {
      ...capture,
      privacy: {
        transcriptCaptured: false,
        fullTextCaptured: false,
        metadataCaptured: false,
        locallyProcessed: true,
        backendSynced: Boolean(capture.privacy.backendSynced),
      },
    };

    // YouTube privacy rules
    if (capture.source.type === 'youtube') {
      if (!settings.youtube.transcriptEnabled) {
        enforced.content.transcript = undefined;
        enforced.privacy.transcriptCaptured = false;
      } else {
        enforced.privacy.transcriptCaptured = Boolean(capture.content.transcript && capture.content.transcript.length > 0);
      }

      if (!settings.youtube.metadataEnabled) {
        enforced.source.channel = undefined;
        enforced.metadata.description = undefined;
        enforced.privacy.metadataCaptured = false;
      } else {
        enforced.privacy.metadataCaptured = true;
      }
    } else {
      // Web article privacy rules
      if (!settings.web.fullTextEnabled) {
        enforced.content.text = undefined;
        enforced.privacy.fullTextCaptured = false;
      } else {
        enforced.privacy.fullTextCaptured = Boolean(capture.content.text && capture.content.text.length > 0);
      }

      if (!settings.web.metadataEnabled) {
        enforced.source.author = undefined;
        enforced.metadata.description = undefined;
        enforced.metadata.publishedAt = undefined;
        enforced.privacy.metadataCaptured = false;
      } else {
        enforced.privacy.metadataCaptured = true;
      }
    }

    return enforced;
  }
}
