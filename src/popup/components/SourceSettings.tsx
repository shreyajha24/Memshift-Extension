import React from 'react';
import { Video, GitBranch, FileText, BookOpen, Globe } from 'lucide-react';
import { ActiveTabInfo } from '../../types/messages';
import { SourceDetectionResult } from '../../content/source-detector';

interface SourceSettingsProps {
  tabInfo: ActiveTabInfo | null;
  detection: SourceDetectionResult | null;
}

export const SourceSettings: React.FC<SourceSettingsProps> = ({ tabInfo, detection }) => {
  const getSourceIcon = () => {
    if (!detection) return <Globe className="w-4 h-4 text-slate-400" />;
    switch (detection.sourceType) {
      case 'youtube':
        return <Video className="w-4 h-4 text-red-400" />;
      case 'github':
        return <GitBranch className="w-4 h-4 text-purple-400" />;
      case 'documentation':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'article':
      default:
        return <FileText className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Active Page Context
        </span>
        {detection && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            {detection.platform}
          </span>
        )}
      </div>

      <div className="flex items-start space-x-2.5">
        <div className="p-1.5 rounded-lg bg-slate-800/80 mt-0.5 shrink-0">
          {getSourceIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-200 truncate">
            {tabInfo?.title || 'Loading active tab...'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {tabInfo?.url || 'No active tab'}
          </div>
        </div>
      </div>
    </div>
  );
};
