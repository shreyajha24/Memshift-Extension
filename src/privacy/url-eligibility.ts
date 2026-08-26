const PROTECTED_SCHEMES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'view-source:',
  'file://',
] as const;

const CHROME_WEB_STORE_HOSTS = new Set(['chromewebstore.google.com', 'chrome.google.com']);

/**
 * Returns a user-facing reason when Chrome does not permit, or MemShift does
 * not support, capture of a URL. It never affects page navigation.
 */
export function getUnsupportedPageReason(url: string | undefined | null): string | undefined {
  if (!url || typeof url !== 'string') {
    return 'No capturable page is open.';
  }

  const normalizedUrl = url.trim().toLowerCase();
  if (PROTECTED_SCHEMES.some((scheme) => normalizedUrl.startsWith(scheme))) {
    return "MemShift can't capture Chrome's internal or protected pages. Try a normal website instead.";
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return 'MemShift can capture only normal HTTP or HTTPS webpages.';
    }

    if (
      CHROME_WEB_STORE_HOSTS.has(parsedUrl.hostname) &&
      (parsedUrl.hostname === 'chromewebstore.google.com' || parsedUrl.pathname.startsWith('/webstore'))
    ) {
      return "MemShift can't capture Chrome Web Store pages. Try a normal website instead.";
    }
  } catch {
    return 'This page URL is not valid for capture.';
  }

  return undefined;
}

/**
 * Determines whether the currently active page may be captured after an
 * explicit user action. It does not grant access or modify navigation.
 */
export function isCapturableUrl(url: string | undefined | null): boolean {
  return getUnsupportedPageReason(url) === undefined;
}
