import { describe, it, expect, beforeEach } from 'vitest';
import { MessageRouter } from '../src/background/message-router';
import { ExtensionMessage } from '../src/types/messages';
import { SettingsStore } from '../src/storage/settings-store';
import { MemShiftSettings } from '../src/types/settings';

describe('MessageRouter', () => {
  beforeEach(async () => {
    await SettingsStore.resetSettings();
  });

  it('handles GET_SETTINGS message', async () => {
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };
    const res = await MessageRouter.handleMessage(msg, {} as any);
    expect(res.success).toBe(true);
    if (res.success) {
      const data = res.data as MemShiftSettings;
      expect(data.enabled).toBe(true);
    }
  });

  it('handles UPDATE_SETTINGS message', async () => {
    const msg: ExtensionMessage = {
      type: 'UPDATE_SETTINGS',
      payload: { enabled: false },
    };
    const res = await MessageRouter.handleMessage(msg, {} as any);
    expect(res.success).toBe(true);
    if (res.success) {
      const data = res.data as MemShiftSettings;
      expect(data.enabled).toBe(false);
    }
  });

  it('handles GET_SYNC_STATUS message', async () => {
    const msg: ExtensionMessage = { type: 'GET_SYNC_STATUS' };
    const res = await MessageRouter.handleMessage(msg, {} as any);
    expect(res.success).toBe(true);
  });
});
