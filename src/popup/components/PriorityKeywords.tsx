import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';

interface PriorityKeywordsProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export const PriorityKeywords: React.FC<PriorityKeywordsProps> = ({ keywords, onChange }) => {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (keywordToRemove: string) => {
    onChange(keywords.filter((k) => k !== keywordToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Tag className="w-3.5 h-3.5 text-sky-400" />
          <span>Priority Keywords</span>
        </label>
        <span className="text-[10px] text-slate-400">{keywords.length} active</span>
      </div>

      {/* Input row */}
      <div className="flex space-x-1.5">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add topic (e.g. Spring Boot)..."
          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newKeyword.trim()}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Keywords Chips */}
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700/80 text-[11px]"
          >
            <span>{kw}</span>
            <button
              type="button"
              onClick={() => handleRemove(kw)}
              className="text-slate-400 hover:text-rose-400 transition-colors"
              aria-label={`Remove ${kw}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};
