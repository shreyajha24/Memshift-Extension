import React from 'react';
import { CheckCircle2, Clock3, Cloud, CloudOff, Database, Loader2 } from 'lucide-react';
import { KnowledgeCapture } from '../../types/capture';
import { formatMemoryDate, getMemoryTitle, getSourceLabel } from './memory-utils';

interface MemoryStatusProps {
  count: number;
  latest?: KnowledgeCapture;
}

export const MemoryStatus: React.FC<MemoryStatusProps> = ({ count, latest }) => {
  if (!latest) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="text-sm font-semibold text-white">Your internet memory is empty.</div>
        <p className="mt-1 text-xs text-slate-400">No memories yet. Explore something worth remembering.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white">{count}</div>
          <div className="text-xs text-slate-400">{count === 1 ? 'memory stored' : 'memories stored'}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
          <Database className="h-3.5 w-3.5" />
          <span>Local storage active</span>
        </div>
      </div>

      <div className="rounded-md border border-slate-800 bg-[#0B0F19]/70 p-2.5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Last remembered</div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold text-white">{getMemoryTitle(latest)}</div>
        <div className="mt-1 text-xs text-slate-400">{getSourceLabel(latest)} · {formatMemoryDate(latest.metadata.capturedAt)}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3" />Saved locally</span>
          <span className="inline-flex items-center gap-1 text-emerald-300"><Clock3 className="h-3 w-3" />{latest.processingStatus === 'completed' ? 'Processed' : latest.processingStatus || 'Stored'}</span>
          <SyncPill memory={latest} />
        </div>
      </div>
    </section>
  );
};

const SyncPill: React.FC<{ memory: KnowledgeCapture }> = ({ memory }) => {
  if (memory.syncStatus === 'synced' && memory.privacy.backendSynced) {
    return <span className="inline-flex items-center gap-1 text-emerald-300"><Cloud className="h-3 w-3" />Synced</span>;
  }

  if (memory.syncStatus === 'error') {
    return <span className="inline-flex items-center gap-1 text-amber-300"><CloudOff className="h-3 w-3" />Sync pending</span>;
  }

  if (memory.syncStatus === 'disabled') {
    return <span className="inline-flex items-center gap-1 text-slate-400"><CloudOff className="h-3 w-3" />Local only</span>;
  }

  return <span className="inline-flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3" />Sync not confirmed</span>;
};
