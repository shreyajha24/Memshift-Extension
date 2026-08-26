import React, { useState } from 'react';
import { History, Shield, Sliders } from 'lucide-react';
import { Header } from './components/Header';
import { MasterToggle } from './components/MasterToggle';
import { MemoryCard } from './components/MemoryCard';
import { MemoryDetail } from './components/MemoryDetail';
import { MemorySearch } from './components/MemorySearch';
import { MemoryStatus } from './components/MemoryStatus';
import { PriorityKeywords } from './components/PriorityKeywords';
import { PrivacyCard } from './components/PrivacyCard';
import { SyncStatus } from './components/SyncStatus';
import { WebSettings } from './components/WebSettings';
import { YouTubeSettings } from './components/YouTubeSettings';
import { useMemories } from './hooks/useMemories';
import { useSettings } from './hooks/useSettings';
import { KnowledgeCapture } from '../types/capture';

export const App: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const memories = useMemories();
  const [activeView, setActiveView] = useState<'memory' | 'settings' | 'privacy'>('memory');
  const [selectedMemory, setSelectedMemory] = useState<KnowledgeCapture | undefined>();

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center text-xs text-slate-400">Loading MemShift...</div>;
  }

  return (
    <div className="flex min-h-[540px] flex-col bg-[#0B0F19] text-slate-100">
      <Header />
      <main className="flex-1 space-y-3.5 overflow-y-auto p-3.5">
        <MasterToggle enabled={settings.enabled} onToggle={(enabled) => updateSettings({ enabled })} />

        <div className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs">
          {(['memory', 'settings', 'privacy'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                setSelectedMemory(undefined);
                setActiveView(view);
              }}
              className={`flex-1 rounded-md px-2 py-1.5 font-medium ${activeView === view ? 'border border-sky-500/30 bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
            >
              {view === 'memory' ? <History className="mr-1 inline h-3 w-3" /> : view === 'settings' ? <Sliders className="mr-1 inline h-3 w-3" /> : <Shield className="mr-1 inline h-3 w-3" />}
              {view === 'memory' ? 'Memory' : view === 'settings' ? 'Options' : 'Privacy'}
            </button>
          ))}
        </div>

        {activeView === 'memory' && (selectedMemory ? (
          <MemoryDetail memory={selectedMemory} onBack={() => setSelectedMemory(undefined)} onDelete={memories.deleteMemory} />
        ) : (
          <div className="space-y-3">
            <MemorySearch onSearch={memories.search} />
            <MemoryStatus count={memories.count} latest={memories.latest} />

            {memories.results.length > 0 && (
              <section className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">What came to mind</div>
                {memories.results.map((result) => (
                  <MemoryCard key={result.memory.id} memory={result.memory} result={result} onOpen={setSelectedMemory} />
                ))}
              </section>
            )}

            {memories.results.length === 0 && memories.searching && (
              <div className="text-xs text-slate-500">Searching local memories...</div>
            )}

            {memories.results.length === 0 && !memories.searching && memories.query && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
                <div className="font-semibold text-white">Nothing came to mind.</div>
                <div className="mt-1">Try: system design, redis, that JWT video.</div>
              </section>
            )}

            {memories.results.length === 0 && !memories.searching && !memories.query && memories.count > 0 && (
              <section className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">Recent memories</div>
                {memories.recent.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} onOpen={setSelectedMemory} />
                ))}
              </section>
            )}

            {memories.results.length === 0 && !memories.searching && !memories.query && memories.count === 0 && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
                Turn MemShift on and start exploring.
              </section>
            )}

            <PriorityKeywords keywords={settings.priorityKeywords} onChange={(priorityKeywords) => updateSettings({ priorityKeywords })} />
          </div>
        ))}

        {activeView === 'settings' && (
          <div className="space-y-3">
            <YouTubeSettings settings={settings.youtube} onChange={(youtube) => updateSettings({ youtube: { ...settings.youtube, ...youtube } })} />
            <WebSettings settings={settings.web} onChange={(web) => updateSettings({ web: { ...settings.web, ...web } })} />
          </div>
        )}

        {activeView === 'privacy' && (
          <PrivacyCard settings={settings.privacy} onChange={(privacy) => updateSettings({ privacy: { ...settings.privacy, ...privacy } })} />
        )}
      </main>
      <footer className="border-t border-slate-800 bg-[#0F172A] p-3"><SyncStatus /></footer>
    </div>
  );
};
