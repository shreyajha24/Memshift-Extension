import React from 'react';
import { RecallResult } from '../../types/recall';
import { KnowledgeCapture } from '../../types/capture';
import { formatMemoryDate, getMemoryExcerpt, getMemoryTitle, getSourceLabel } from './memory-utils';

interface MemoryCardProps {
  memory: KnowledgeCapture;
  result?: RecallResult;
  onOpen: (memory: KnowledgeCapture) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, result, onOpen }) => {
  const topics = [...memory.intelligence.topicCandidates, ...memory.intelligence.subtopics].slice(0, 3);
  const excerpt = getMemoryExcerpt(memory);

  return (
    <button
      type="button"
      onClick={() => onOpen(memory)}
      className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-left transition-colors hover:border-sky-500/40 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="line-clamp-2 text-sm font-semibold text-white">{getMemoryTitle(memory)}</div>
          <div className="mt-1 text-[11px] text-slate-400">{getSourceLabel(memory)} · {formatMemoryDate(memory.metadata.capturedAt)}</div>
        </div>
        <div className="shrink-0 rounded-md border border-slate-700 px-1.5 py-1 text-[10px] font-semibold text-sky-300">
          Priority {memory.intelligence.priorityScore}
        </div>
      </div>

      {topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <span key={topic} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">{topic}</span>
          ))}
        </div>
      )}

      {excerpt && <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">"{excerpt}"</p>}

      {result && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Relevance {result.relevanceScore}</span>
          {result.matchedTerms.length > 0 && <span>Matched: {result.matchedTerms.slice(0, 4).join(', ')}</span>}
        </div>
      )}
    </button>
  );
};
