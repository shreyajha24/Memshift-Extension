const SENSITIVE_KEYS = new Set([
  'text',
  'transcript',
  'accessToken',
  'refreshToken',
  'authorization',
  'auth',
  'password',
  'secret',
  'token',
  'iv',
  'ciphertext',
  'key',
  'passphrase',
  'authorization',
  'email'
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 5) return { '[sanitized]': 'max-depth' };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string') {
      out[k] = sanitizeString(v);
    } else if (isObject(v)) {
      out[k] = sanitizeObject(v as Record<string, unknown>, depth + 1);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) => (isObject(item) ? sanitizeObject(item as Record<string, unknown>, depth + 1) : sanitizeString(String(item))));
    } else {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeString(s: string): string {
  // redact common tokens in URLs
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s);
      // remove query params
      u.search = '';
      return u.toString();
    }
  } catch {
    // ignore
  }
  // redact long strings that look like tokens
  if (/[A-Za-z0-9-_]{40,}/.test(s)) return '[REDACTED]';
  return s;
}

function sanitize(...args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string') return sanitizeString(arg);
    if (isObject(arg)) return sanitizeObject(arg as Record<string, unknown>);
    if (Array.isArray(arg)) return arg.map((a) => (isObject(a) ? sanitizeObject(a as Record<string, unknown>) : a));
    return arg;
  });
}

const isProd = (() => {
  try {
    if (typeof process !== 'undefined') {
      const p = process as unknown as { env?: { NODE_ENV?: string } };
      if (p.env && p.env.NODE_ENV === 'production') return true;
    }
    if (typeof import.meta !== 'undefined') {
      const meta = import.meta as unknown as { env?: { PROD?: boolean } };
      return Boolean(meta.env && meta.env.PROD);
    }
  } catch {
    // ignore
  }
  return false;
})();

export const logger = {
  debug: (...args: unknown[]) => {
    if (isProd) return; // no debug logs in production
    const safe = sanitize(...args);
    console.debug('[MemShift][DEBUG]', ...safe);
  },
  info: (...args: unknown[]) => {
    const safe = sanitize(...args);
    console.info('[MemShift]', ...safe);
  },
  warn: (...args: unknown[]) => {
    const safe = sanitize(...args);
    console.warn('[MemShift][WARN]', ...safe);
  },
  error: (...args: unknown[]) => {
    const safe = sanitize(...args);
    console.error('[MemShift][ERROR]', ...safe);
  },
  // expose sanitize for tests
  _sanitize: sanitize,
};
