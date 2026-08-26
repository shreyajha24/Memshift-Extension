import { DEFAULT_SETTINGS, MemShiftSettings } from '../types/settings';
import { STORAGE_KEYS } from '../shared/constants';
import { sanitizeSettings } from '../shared/schemas';

export class SettingsStore {
  private static inMemoryFallback: MemShiftSettings = { ...DEFAULT_SETTINGS };

  /**
   * Retrieves current settings from chrome.storage.local with defaults fallback.
   */
  public static async getSettings(): Promise<MemShiftSettings> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        if (result && result[STORAGE_KEYS.SETTINGS]) {
          return {
            ...DEFAULT_SETTINGS,
            ...result[STORAGE_KEYS.SETTINGS],
            captureMode: 'automatic',
          };
        }
      } catch (err) {
        console.warn('Failed to load settings from chrome.storage.local:', err);
      }
    }
    return { ...this.inMemoryFallback };
  }

  /**
   * Updates partial settings and persists to chrome.storage.local.
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

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
      } catch (err) {
        console.warn('Failed to save settings to chrome.storage.local:', err);
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
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: reset });
      } catch (err) {
        console.warn('Failed to reset settings in chrome.storage.local:', err);
      }
    }
    this.inMemoryFallback = reset;
    return reset;
  }
}
