export interface WebMetadata {
  title: string;
  author?: string;
  description?: string;
  publishedAt?: string;
  canonicalUrl: string;
  siteName?: string;
  faviconUrl?: string;
}

export class WebMetadataExtractor {
  public static extract(): WebMetadata {
    const rawUrl = window.location.href;

    // 1. Title extraction
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const metaTitle = document.querySelector('meta[name="title"]');
    const title =
      ogTitle?.getAttribute('content')?.trim() ||
      twitterTitle?.getAttribute('content')?.trim() ||
      metaTitle?.getAttribute('content')?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title.trim();

    // 2. Author extraction
    let author: string | undefined = undefined;
    const metaAuthor = document.querySelector(
      'meta[name="author"], meta[property="article:author"], meta[name="twitter:creator"], a[rel="author"]'
    );
    if (metaAuthor) {
      author = (metaAuthor.getAttribute('content') || metaAuthor.textContent || '').trim();
    }

    // 3. Description extraction
    let description: string | undefined = undefined;
    const metaDesc = document.querySelector('meta[name="description"], meta[property="og:description"]');
    if (metaDesc && metaDesc.getAttribute('content')) {
      description = metaDesc.getAttribute('content')!.trim();
    }

    // 4. Published Date extraction
    let publishedAt: string | undefined = undefined;
    const metaDate = document.querySelector('meta[property="article:published_time"], meta[name="pubdate"], time[datetime]');
    if (metaDate) {
      publishedAt = (metaDate.getAttribute('content') || metaDate.getAttribute('datetime') || '').trim();
    }

    // 5. Canonical URL
    let canonicalUrl = rawUrl;
    const linkCanonical = document.querySelector('link[rel="canonical"]');
    if (linkCanonical && linkCanonical.getAttribute('href')) {
      try {
        canonicalUrl = new URL(linkCanonical.getAttribute('href')!, rawUrl).toString();
      } catch {
        canonicalUrl = rawUrl;
      }
    }

    // 6. Site Name
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    const siteName = ogSiteName?.getAttribute('content')?.trim() || window.location.hostname;

    // 7. Favicon URL
    const linkFavicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    const faviconHref = linkFavicon?.getAttribute('href');
    let faviconUrl: string;
    if (faviconHref) {
      try {
        faviconUrl = new URL(faviconHref, rawUrl).toString();
      } catch {
        faviconUrl = '/favicon.ico';
      }
    } else {
      faviconUrl = `${window.location.origin}/favicon.ico`;
    }

    return {
      title: title || document.title || 'Untitled Document',
      author: author || undefined,
      description: description || undefined,
      publishedAt: publishedAt || undefined,
      canonicalUrl,
      siteName,
      faviconUrl,
    };
  }
}
