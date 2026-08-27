import { EXTRACTION_LIMITS } from '../../shared/constants';
import { TextBlock } from './types';

const LINE_BREAK_RE = /\n{3,}/g;
const SPACE_RE = /[ \t\f\v]+/g;
const NAV_TOKEN_RE = /^(home|menu|search|login|sign in|sign up|subscribe|share|follow|next|previous|privacy|terms|cookies?|advertise|careers|pricing|docs|blog|about|contact)$/i;
const BOILERPLATE_RE = /^(accept all|reject all|manage cookies|cookie settings|privacy choices|all rights reserved|skip to content|open menu|close menu|share this|copy link|read more|show more|show less)$/i;
const UI_PHRASE_RE = /\b(cookie|cookies|privacy policy|terms of service|newsletter|subscribe|sign up|sign in|log in|advertisement|sponsored|promoted|share on|follow us)\b/i;
const MIN_MEANINGFUL_WORDS = 4;

function normalizeInlineText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(SPACE_RE, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function normalizeCodeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(LINE_BREAK_RE, '\n\n')
    .trim();
}

function compactTextKey(value: string): string {
  return normalizeInlineText(value).toLowerCase().replace(/\W+/g, ' ').trim();
}

function wordCount(value: string): number {
  return (value.match(/[A-Za-z0-9_]+/g) || []).length;
}

function hasSentenceSignal(value: string): boolean {
  return /[.!?;:]$/.test(value) || /[,.;:!?]\s/.test(value) || wordCount(value) >= 10;
}

function isLowValueBlock(text: string): boolean {
  const normalized = normalizeInlineText(text);
  if (!normalized) return true;
  if (normalized.length < 3) return true;
  if (normalized.length <= 24 && NAV_TOKEN_RE.test(normalized)) return true;
  if (BOILERPLATE_RE.test(normalized)) return true;
  if (normalized.length <= 90 && UI_PHRASE_RE.test(normalized) && !hasSentenceSignal(normalized)) return true;
  if (normalized.length <= 80 && wordCount(normalized) < MIN_MEANINGFUL_WORDS && !/[.!?]/.test(normalized)) return true;
  return false;
}

function dedupeLines(text: string): string {
  const lines = text.split('\n');
  const output: string[] = [];
  let previousKey = '';

  for (const line of lines) {
    const normalized = normalizeInlineText(line);
    if (!normalized) {
      if (output[output.length - 1] !== '') output.push('');
      continue;
    }

    const key = compactTextKey(normalized);
    if (key && key !== previousKey) output.push(normalized);
    previousKey = key;
  }

  return output.join('\n').replace(LINE_BREAK_RE, '\n\n').trim();
}

export function normalizeTextBlock(block: TextBlock | string): TextBlock | null {
  const rawText = typeof block === 'string' ? block : block.text;
  const kind = typeof block === 'string' ? 'paragraph' : block.kind || 'paragraph';
  let text = kind === 'code' ? normalizeCodeText(rawText) : dedupeLines(rawText);

  if (kind === 'code') {
    if (!text || text.length < 2) return null;
    return { text, kind };
  }

  if (kind === 'heading') {
    if (!text || text.length < 3) return null;
    if (NAV_TOKEN_RE.test(text) || BOILERPLATE_RE.test(text)) return null;
    return { text, kind };
  }

  if (isLowValueBlock(text)) return null;

  if (kind === 'list') {
    text = text.replace(/^[-*]\s+/, '').trim();
    if (isLowValueBlock(text)) return null;
  }

  return { text, kind };
}

export function normalizeContentBlocks(blocks: Array<TextBlock | string>, maxChars: number = EXTRACTION_LIMITS.MAX_ARTICLE_CHARS): string {
  const output: string[] = [];
  const seen = new Set<string>();
  let previousKey = '';
  let remaining = maxChars;

  for (const block of blocks) {
    const normalized = normalizeTextBlock(block);
    if (!normalized) continue;

    const key = compactTextKey(normalized.text);
    if (!key || key === previousKey || seen.has(key)) continue;
    seen.add(key);
    previousKey = key;

    let text = normalized.text;
    if (normalized.kind === 'list') text = `- ${text}`;
    if (normalized.kind === 'quote') text = `> ${text}`;
    if (normalized.kind === 'code') text = `\`\`\`\n${text}\n\`\`\``;

    if (text.length > remaining) {
      text = text.slice(0, remaining).trim();
    }
    if (!text) break;

    output.push(text);
    remaining -= text.length + 2;
    if (remaining <= 0) break;
  }

  return output.join('\n\n').replace(LINE_BREAK_RE, '\n\n').trim();
}

export function normalizePlainText(text: string, maxChars: number = EXTRACTION_LIMITS.MAX_ARTICLE_CHARS): string {
  return normalizeContentBlocks(
    text
      .split(/\n{2,}/)
      .map((part) => ({ text: part, kind: 'paragraph' as const })),
    maxChars
  );
}

export function hasMeaningfulContent(content: string | undefined, description?: string): boolean {
  const text = normalizeInlineText(content || '');
  if (text.length >= 160) return true;
  if (text.length >= 60 && /\s/.test(text)) return true;
  return Boolean(description && description.trim().length >= 80);
}
