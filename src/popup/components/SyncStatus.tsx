import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { ExtensionMessage, MessageResponse, SyncStatusInfo } from '../../types/messages';

export const SyncStatus: React.FC = () => {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>({
    online: true,
    pendingCount: 0,
    isSyncing: false,
  });
  const [syncing, setSyncing] = useState(false);

  const fetchSyncStatus = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const msg: ExtensionMessage = { type: 'GET_SYNC_STATUS' };
        const res = (await chrome.runtime.sendMessage(msg)) as MessageResponse<SyncStatusInfo>;
        if (res && res.success) {
          setSyncInfo(res.data);
        }
      } catch {
        // Background might be sleeping
      }
    }
  };

  useEffect(() => {
    fetchSyncStatus();

    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
      return undefined;
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.memshift_offline_queue_v1) {
        void fetchSyncStatus();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const msg: ExtensionMessage = { type: 'SYNC_QUEUE_NOW' };
        await chrome.runtime.sendMessage(msg);
        await fetchSyncStatus();
      } catch (err) {
        console.warn('Manual sync failed:', err);
      }
    }
    setSyncing(false);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px]">
      <div className="flex items-center space-x-2">
        {syncInfo.online ? (
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Cloud className="w-3.5 h-3.5" />
            <span className="font-medium">Cloud Connected</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-amber-400">
            <CloudOff className="w-3.5 h-3.5" />
            <span className="font-medium">Offline Mode</span>
          </div>
        )}

        {syncInfo.pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            {syncInfo.pendingCount} pending
          </span>
        )}
      </div>

      {syncInfo.pendingCount > 0 && (
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          <span>Sync Now</span>
        </button>
      )}
    </div>
  );
};
