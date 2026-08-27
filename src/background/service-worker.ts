import { MessageRouter } from './message-router';
import { logger } from '../utils/logger';
import { ExtensionMessage, MessageResponse } from '../types/messages';
import { CaptureStore } from '../storage/capture-store';
import { SettingsStore } from '../storage/settings-store';
import { ext, ExtMessageSender } from '../shared/browser-api';

/**
 * MemShift Manifest V3 Background Service Worker
 *
 * Settings propagation to content scripts uses chrome.storage.onChanged
 * (also listened in the content script). No tabs permission is required.
 */

ext.runtime.onInstalled.addListener(async () => {
  logger.info('Extension installed');
  await SettingsStore.updateSettings({});
  await updateBadge();
});

ext.runtime.onStartup.addListener(async () => {
  await updateBadge();
});

ext.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: ExtMessageSender,
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
      await ext.action.setBadgeText({ text: String(queue.length) });
      await ext.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    } else {
      await ext.action.setBadgeText({ text: '' });
    }
  } catch {
    // Ignore badge errors in background
  }
}
