import { ExtensionMessage, MessageResponse, SyncStatusInfo } from '../types/messages';
import { SettingsStore } from '../storage/settings-store';
import { CaptureStore } from '../storage/capture-store';
import { CaptureProcessor } from './capture-processor';
import { BackendClient } from './backend-client';
import { AuthManager } from './auth-manager';
import { ExtMessageSender } from '../shared/browser-api';

export class MessageRouter {
  public static async handleMessage(
    message: ExtensionMessage,
    _sender: ExtMessageSender
  ): Promise<MessageResponse> {
    try {
      switch (message.type) {
        case 'GET_SETTINGS': {
          const settings = await SettingsStore.getSettings();
          return { success: true, data: settings };
        }

        case 'SETTINGS_UPDATED':
        case 'UPDATE_SETTINGS': {
          const updated = await SettingsStore.updateSettings(message.payload);
          return { success: true, data: updated };
        }

        case 'PAGE_CAPTURED': {
          const result = await CaptureProcessor.process(message.payload);
          return { success: true, data: result };
        }

        case 'GET_SYNC_STATUS': {
          const queue = await CaptureStore.getSyncQueue();
          const syncInfo: SyncStatusInfo = {
            online: navigator.onLine,
            pendingCount: queue.length,
            isSyncing: false,
          };
          return { success: true, data: syncInfo };
        }

        case 'SYNC_QUEUE_NOW': {
          const settings = await SettingsStore.getSettings();
          if (!settings.enabled) {
            return { success: true, data: { synced: 0, failed: 0 } };
          }
          const syncResults = await BackendClient.syncOfflineQueue();
          return { success: true, data: syncResults };
        }

        case 'GET_AUTH_STATE': {
          const authState = await AuthManager.getAuthState();
          return { success: true, data: authState };
        }

        case 'AUTH_LOGOUT': {
          await AuthManager.logout();
          return { success: true, data: { loggedOut: true } };
        }

        default: {
          return { success: false, error: 'Unknown message type' };
        }
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error && error.message ? error.message : 'Operation failed',
      };
    }
  }
}
