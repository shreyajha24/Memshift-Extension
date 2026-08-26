import { KnowledgeCapture } from '../../types/capture';

export function getMemoryTitle(memory: KnowledgeCapture): string {
  return memory.source.title || 'Untitled memory';
}

export function getSourceLabel(memory: KnowledgeCapture): string {
  return memory.source.channel || memory.source.platform || memory.source.type;
}

export function getMemoryExcerpt(memory: KnowledgeCapture): string {
  return memory.content.excerpt || memory.metadata.description || memory.content.text?.slice(0, 220) || '';
}

export function formatMemoryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
