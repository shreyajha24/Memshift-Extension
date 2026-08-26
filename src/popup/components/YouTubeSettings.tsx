import React from 'react';
import { Video, Captions, Info } from 'lucide-react';
import { YouTubeSettings as YouTubeSettingsType } from '../../types/settings';

interface YouTubeSettingsProps {
  settings: YouTubeSettingsType;
  onChange: (updated: Partial<YouTubeSettingsType>) => void;
}

export const YouTubeSettings: React.FC<YouTubeSettingsProps> = ({ settings, onChange }) => {
  return (
    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 space-y-2.5">
      <div className="flex items-center space-x-2 text-xs font-semibold text-red-400">
        <Video className="w-4 h-4" />
        <span>YouTube Capture Options</span>
      </div>

      <div className="space-y-2 pt-1">
        {/* Transcript Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer select-none">
          <div className="flex items-center space-x-2">
            <Captions className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Extract Transcript</span>
          </div>
          <input
            type="checkbox"
            checked={settings.transcriptEnabled}
            onChange={(e) => onChange({ transcriptEnabled: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500/20"
          />
        </label>

        {/* Metadata Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer select-none">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Extract Video Metadata</span>
          </div>
          <input
            type="checkbox"
            checked={settings.metadataEnabled}
            onChange={(e) => onChange({ metadataEnabled: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500/20"
          />
        </label>
      </div>
    </div>
  );
};
