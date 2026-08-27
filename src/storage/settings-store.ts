import { DEFAULT_SETTINGS, MemShiftSettings } from '../types/settings';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../shared/constants';
import { sanitizeSettings } from '../shared/schemas';
import { ext, hasExtensionApi } from '../shared/browser-api';

export class SettingsStore {
  private static inMemoryFallback: MemShiftSettings = { ...DEFAULT_SETTINGS };

  /**
   * Retrieves current settings from extension storage.local with defaults fallback.
   */
  public static async getSettings(): Promise<MemShiftSettings> {
    if (hasExtensionApi() && ext.storage?.local) {
      try {
        const result = await ext.storage.local.get(STORAGE_KEYS.SETTINGS);
        if (result && result[STORAGE_KEYS.SETTINGS]) {
          return {
            ...DEFAULT_SETTINGS,
            ...result[STORAGE_KEYS.SETTINGS],
            captureMode: 'automatic',
          };
        }
      } catch (err) {
        logger.warn('Failed to load settings from extension storage.local', err);
      }
    }
    return { ...this.inMemoryFallback };
  }

  /**
   * Updates partial settings and persists to extension storage.local.
   */
  public static async updateSettings(partial: Partial<MemShiftSettings>): Promise<MemShiftSettings> {
    const current = await this.getSettings();
    const sanitized = sanitizeSettings(partial);
    const updated: MemShiftSettings = {
      ...current,
      ...sanitized,
      youtube: {
        ...current.youtube,
        ...(sanitized.youtube || {}),
      },
      web: {
        ...current.web,
        ...(sanitized.web || {}),
      },
      privacy: {
        ...current.privacy,
        ...(sanitized.privacy || {}),
      },
    };

    if (hasExtensionApi() && ext.storage?.local) {
      try {
        await ext.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
      } catch (err) {
        logger.warn('Failed to save settings to extension storage.local', err);
      }
    }
    this.inMemoryFallback = updated;
    return updated;
  }

  /**
   * Resets settings to default values.
   */
  public static async resetSettings(): Promise<MemShiftSettings> {
    const reset = { ...DEFAULT_SETTINGS };
    if (hasExtensionApi() && ext.storage?.local) {
      try {
        await ext.storage.local.set({ [STORAGE_KEYS.SETTINGS]: reset });
      } catch (err) {
        logger.warn('Failed to reset settings in extension storage.local', err);
      }
    }
    this.inMemoryFallback = reset;
    return reset;
  }
}
