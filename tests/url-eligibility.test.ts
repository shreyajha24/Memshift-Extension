import { describe, expect, it } from 'vitest';
import { getUnsupportedPageReason, isCapturableUrl } from '../src/privacy/url-eligibility';

describe('URL eligibility', () => {
  it.each([
    'https://www.google.com',
    'https://developer.mozilla.org/',
    'https://github.com/',
    'https://stackoverflow.com/',
    'https://www.youtube.com/',
  ])('allows normal HTTPS pages: %s', (url) => {
    expect(isCapturableUrl(url)).toBe(true);
    expect(getUnsupportedPageReason(url)).toBeUndefined();
  });

  it.each([
    'chrome://extensions/',
    'chrome-extension://example/page.html',
    'edge://settings/',
    'about:blank',
    'file:///C:/example.html',
    'devtools://devtools/',
    'view-source:https://example.com',
    'https://chromewebstore.google.com/detail/example',
  ])('rejects protected or unsupported pages: %s', (url) => {
    expect(isCapturableUrl(url)).toBe(false);
    expect(getUnsupportedPageReason(url)).toBeTruthy();
  });
});
