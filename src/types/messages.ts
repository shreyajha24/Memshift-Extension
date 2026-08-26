import { MemShiftSettings } from './settings';
import { RawExtractedData } from '../core/capture/capture-builder';

export type ExtensionMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_UPDATED'; payload: Partial<MemShiftSettings> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<MemShiftSettings> }
  | { type: 'PAGE_CAPTURED'; payload: RawExtractedData }
  | { type: 'GET_SYNC_STATUS' }
  | { type: 'SYNC_QUEUE_NOW' }
  | { type: 'GET_AUTH_STATE' }
  | { type: 'AUTH_LOGOUT' };

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface ActiveTabInfo {
  tabId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  isSupported: boolean;
  unsupportedReason?: string;
}

export interface SyncStatusInfo {
  online: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
  isSyncing: boolean;
  error?: string;
}

export interface AuthStateInfo {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
}
