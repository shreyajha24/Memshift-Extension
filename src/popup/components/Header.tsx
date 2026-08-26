import React from 'react';
import { Brain, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-slate-800">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-400 p-0.5 shadow-sm shadow-sky-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#0B0F19] rounded-[7px] flex items-center justify-center">
            <Brain className="w-4 h-4 text-sky-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="text-sm font-bold text-white tracking-wide">MemShift</h1>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Personal Internet Memory</p>
        </div>
      </div>

      <div className="flex items-center space-x-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Privacy-First</span>
      </div>
    </header>
  );
};
