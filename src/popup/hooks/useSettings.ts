import { useState, useEffect, useCallback } from 'react';
import { MemShiftSettings, DEFAULT_SETTINGS } from '../../types/settings';
import { ExtensionMessage, MessageResponse } from '../../types/messages';

export function useSettings() {
  const [settings, setSettings] = useState<MemShiftSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const msg: ExtensionMessage = { type: 'GET_SETTINGS' };
        const res = (await chrome.runtime.sendMessage(msg)) as MessageResponse<MemShiftSettings>;
        if (res && res.success) {
          setSettings(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch settings from background:', err);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<MemShiftSettings>) => {
      // Optimistic local update
      setSettings((prev) => ({
        ...prev,
        ...partial,
        youtube: { ...prev.youtube, ...(partial.youtube || {}) },
        web: { ...prev.web, ...(partial.web || {}) },
        privacy: { ...prev.privacy, ...(partial.privacy || {}) },
      }));

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          const msg: ExtensionMessage = { type: 'SETTINGS_UPDATED', payload: partial };
          const res = (await chrome.runtime.sendMessage(msg)) as MessageResponse<MemShiftSettings>;
          if (res && res.success) {
            setSettings(res.data);
          }
        } catch (err) {
          console.warn('Failed to update settings in background:', err);
        }
      }
    },
    []
  );

  return { settings, loading, updateSettings, refreshSettings: fetchSettings };
}
