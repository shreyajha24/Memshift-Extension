import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../../shared/constants';
import { MemoryRepository } from '../../storage/memory-repository';
import { KnowledgeCapture } from '../../types/capture';
import { RecallResult } from '../../types/recall';

export interface MemoryViewState {
  count: number;
  recent: KnowledgeCapture[];
  latest?: KnowledgeCapture;
  results: RecallResult[];
  query: string;
  searching: boolean;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
}

export function useMemories(): MemoryViewState {
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<KnowledgeCapture[]>([]);
  const [results, setResults] = useState<RecallResult[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    const [nextCount, nextRecent] = await Promise.all([
      MemoryRepository.count(),
      MemoryRepository.getRecent(10),
    ]);
    setCount(nextCount);
    setRecent(nextRecent);
  }, []);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    setQuery(trimmed);
    if (!trimmed) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      setResults(await MemoryRepository.search({ query: trimmed, limit: 10 }));
    } finally {
      setSearching(false);
    }
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    await MemoryRepository.delete(id);
    await refresh();
    setResults((current) => current.filter((result) => result.memory.id !== id));
  }, [refresh]);

  useEffect(() => {
    void refresh();

    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
      return undefined;
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.LOCAL_CAPTURES]) {
        void refresh();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [refresh]);

  return useMemo(() => ({
    count,
    recent,
    latest: recent[0],
    results,
    query,
    searching,
    refresh,
    search,
    deleteMemory,
  }), [count, recent, results, query, searching, refresh, search, deleteMemory]);
}
