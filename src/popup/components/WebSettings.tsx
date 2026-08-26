import React from 'react';
import { FileText, AlignLeft, Info } from 'lucide-react';
import { WebSettings as WebSettingsType } from '../../types/settings';

interface WebSettingsProps {
  settings: WebSettingsType;
  onChange: (updated: Partial<WebSettingsType>) => void;
}

export const WebSettings: React.FC<WebSettingsProps> = ({ settings, onChange }) => {
  return (
    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 space-y-2.5">
      <div className="flex items-center space-x-2 text-xs font-semibold text-sky-400">
        <FileText className="w-4 h-4" />
        <span>Web & Article Options</span>
      </div>

      <div className="space-y-2 pt-1">
        {/* Full Text Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer select-none">
          <div className="flex items-center space-x-2">
            <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Extract Full Text</span>
          </div>
          <input
            type="checkbox"
            checked={settings.fullTextEnabled}
            onChange={(e) => onChange({ fullTextEnabled: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500/20"
          />
        </label>

        {/* Metadata Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer select-none">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Extract Article Metadata</span>
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
