import React from 'react';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { KnowledgeCapture } from '../../types/capture';
import { formatFullDate, getMemoryExcerpt, getMemoryTitle, getSourceLabel } from './memory-utils';

interface MemoryDetailProps {
  memory: KnowledgeCapture;
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
}

export const MemoryDetail: React.FC<MemoryDetailProps> = ({ memory, onBack, onDelete }) => {
  const content = memory.content.text || memory.content.transcript?.map((chunk) => chunk.text).join(' ') || getMemoryExcerpt(memory);
  const topics = memory.intelligence.topicCandidates;
  const subtopics = memory.intelligence.subtopics;
  const keywords = memory.intelligence.matchedKeywords;

  const openOriginal = () => {
    const url = memory.source.canonicalUrl || memory.source.url;
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      void chrome.tabs.create({ url });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button type="button" onClick={() => void onDelete(memory.id).then(onBack)} className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 hover:text-rose-200">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <h2 className="text-base font-semibold leading-6 text-white">{getMemoryTitle(memory)}</h2>
        <div className="mt-2 text-xs text-slate-400">{getSourceLabel(memory)} · {formatFullDate(memory.metadata.capturedAt)}</div>
        <button type="button" onClick={openOriginal} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20">
          <ExternalLink className="h-3.5 w-3.5" /> Open original
        </button>
      </div>

      {content && <DetailBlock title="Content" value={content} />}
      {memory.source.url && <DetailBlock title="Original URL" value={memory.source.canonicalUrl || memory.source.url} />}
      {topics.length > 0 && <ChipBlock title="Knowledge mapping" values={topics} />}
      {subtopics.length > 0 && <ChipBlock title="Knowledge graph" values={subtopics} />}
      {keywords.length > 0 && <ChipBlock title="Matched priority keywords" values={keywords} />}

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Priority score" value={String(memory.intelligence.priorityScore)} />
        <Metric label="Capture method" value={memory.captureMethod || 'automatic'} />
        <Metric label="Timeline" value={formatFullDate(memory.metadata.capturedAt)} />
        <Metric label="Processing" value={memory.processingStatus || 'stored'} />
        <Metric label="Sync status" value={syncStatusLabel(memory)} />
        <Metric label="Local storage" value={memory.privacy.locallyProcessed ? 'Saved locally' : 'Unknown'} />
        {memory.engagement.currentTimestampSeconds !== undefined && <Metric label="Engagement timestamp" value={`${Math.round(memory.engagement.currentTimestampSeconds)}s`} />}
        {memory.engagement.engagementDurationSeconds !== undefined && <Metric label="Duration" value={`${Math.round(memory.engagement.engagementDurationSeconds)}s`} />}
      </dl>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-300">
        <div className="font-semibold text-white">Privacy status</div>
        <div className="mt-2 space-y-1 text-slate-400">
          <div>Transcript captured: {memory.privacy.transcriptCaptured ? 'yes' : 'no'}</div>
          <div>Full text captured: {memory.privacy.fullTextCaptured ? 'yes' : 'no'}</div>
          <div>Metadata captured: {memory.privacy.metadataCaptured ? 'yes' : 'no'}</div>
          <div>Backend synced: {memory.privacy.backendSynced ? 'yes' : 'no'}</div>
        </div>
      </div>
    </section>
  );
};

const DetailBlock: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
    <div className="text-xs font-semibold text-white">{title}</div>
    <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{value}</p>
  </div>
);

const ChipBlock: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
    <div className="text-xs font-semibold text-white">{title}</div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {values.map((value) => <span key={value} className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">{value}</span>)}
    </div>
  </div>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
    <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 text-slate-200">{value}</dd>
  </div>
);

function syncStatusLabel(memory: KnowledgeCapture): string {
  if (memory.syncStatus === 'synced' && memory.privacy.backendSynced) return 'Synced';
  if (memory.syncStatus === 'disabled') return 'Local only';
  if (memory.syncStatus === 'error') return 'Sync pending';
  if (memory.syncStatus === 'pending') return 'Pending';
  return memory.syncStatus || 'Local only';
}
