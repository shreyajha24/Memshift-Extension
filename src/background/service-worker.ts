import { MessageRouter } from './message-router';
import { ExtensionMessage, MessageResponse } from '../types/messages';
import { CaptureStore } from '../storage/capture-store';
import { STORAGE_KEYS } from '../shared/constants';
import { SettingsStore } from '../storage/settings-store';

/**
 * MemShift Manifest V3 Background Service Worker
 */

// Initialize background lifecycle
chrome.runtime.onInstalled.addListener(async () => {
  console.log('MemShift extension installed successfully.');
  // Persist defaults so all content scripts share an explicit master state.
  await SettingsStore.updateSettings({});
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
});

// Storage is authoritative, and this notification wakes already-open pages
// without polling, alarms, tab monitoring, or script injection.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
    void broadcastSettingsChange(changes[STORAGE_KEYS.SETTINGS].newValue);
  }
});

// Listen for messages from Popup UI
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    (async () => {
      try {
        const response = await MessageRouter.handleMessage(message, sender);
        sendResponse(response);
        await updateBadge();
      } catch (error: unknown) {
        sendResponse({ success: false, error: getErrorMessage(error, 'Service worker internal error') });
      }
    })();

    // Mandatory return true to keep asynchronous message response channel open in MV3
    return true;
  }
);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function updateBadge(): Promise<void> {
  try {
    const queue = await CaptureStore.getSyncQueue();
    if (queue.length > 0) {
      await chrome.action.setBadgeText({ text: String(queue.length) });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber badge for pending sync
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch {
    // Ignore badge errors in background
  }
}

async function broadcastSettingsChange(settings: unknown): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    await Promise.all(tabs.filter((tab) => tab.id !== undefined).map(async (tab) => {
      try {
        await chrome.tabs.sendMessage(tab.id!, { type: 'SETTINGS_UPDATED', payload: settings });
      } catch {
        // Content scripts can disappear during navigation; no retry is needed.
      }
    }));
  } catch {
    // This advisory notification must never affect browser navigation.
  }
}
