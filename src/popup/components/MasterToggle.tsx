import React from 'react';
import { Power } from 'lucide-react';

interface MasterToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const MasterToggle: React.FC<MasterToggleProps> = ({ enabled, onToggle }) => {
  return (
    <div className={`p-3 rounded-xl border transition-all duration-200 ${
      enabled
        ? 'bg-slate-900/80 border-slate-700/60 shadow-sm'
        : 'bg-rose-950/20 border-rose-900/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-lg ${
            enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            <Power className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <span>MEMSHIFT {enabled ? 'ON' : 'OFF'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {enabled ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {enabled
                ? 'MemShift is learning from the pages you visit.'
                : 'MemShift is paused. Nothing is being captured.'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
          aria-label="Toggle master state"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
