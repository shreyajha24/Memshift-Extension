import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface MemorySearchProps {
  onSearch: (query: string) => Promise<void>;
}

export const MemorySearch: React.FC<MemorySearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void onSearch(query);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, onSearch]);

  return (
    <label className="block rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 focus-within:border-sky-500/50">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What are you trying to recall?"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>
    </label>
  );
};
