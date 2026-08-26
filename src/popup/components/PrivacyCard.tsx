import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { PrivacySettings } from '../../types/settings';

interface PrivacyCardProps {
  settings: PrivacySettings;
  onChange: (settings: Partial<PrivacySettings>) => void;
}

export const PrivacyCard: React.FC<PrivacyCardProps> = ({ settings, onChange }) => (
  <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-[11px]">
    <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
      <ShieldCheck className="h-4 w-4" />
      <span>MemShift Privacy</span>
    </div>
    <div className="space-y-1 text-slate-400">
      <div className="flex items-start gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /><span>Automatic capture runs only while MemShift is ON; it does not track browser history.</span></div>
      <div className="flex items-start gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /><span>Content is processed and stored locally before any optional sync.</span></div>
      <div className="flex items-start gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /><span>Forms, passwords, cookies, and website storage are never read.</span></div>
    </div>
    <label className="flex items-center justify-between border-t border-slate-800 pt-2 text-slate-300"><span>Backend Sync</span><input type="checkbox" checked={settings.backendSyncEnabled} onChange={(event) => onChange({ backendSyncEnabled: event.target.checked })} /></label>
    <label className="flex items-center justify-between text-slate-300"><span>Anonymize URL Parameters</span><input type="checkbox" checked={settings.anonymizeUrlParams} onChange={(event) => onChange({ anonymizeUrlParams: event.target.checked })} /></label>
  </div>
);
