import { BackendClient } from './backend-client';
import { CaptureBuilder, RawExtractedData } from '../core/capture/capture-builder';
import { PrivacyPolicyEngine } from '../privacy/privacy-policy';
import { SettingsStore } from '../storage/settings-store';
import { CaptureStore } from '../storage/capture-store';

export class CaptureProcessor {
  public static async process(raw: RawExtractedData): Promise<{ saved: boolean; duplicate: boolean }> {
    const settings = await SettingsStore.getSettings();
    if (!PrivacyPolicyEngine.isMasterEnabled(settings)) {
      return { saved: false, duplicate: false };
    }

    const capture = CaptureBuilder.build(raw, settings);
    const saved = await CaptureStore.saveIfNew(capture);
    if (!saved) return { saved: false, duplicate: true };

    if (settings.privacy.backendSyncEnabled) {
      await BackendClient.sendCapture(capture);
    }

    return { saved: true, duplicate: false };
  }
}
