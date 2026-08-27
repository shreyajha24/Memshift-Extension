export interface WebMetadata {
  title: string;
  author?: string;
  description?: string;
  publishedAt?: string;
  canonicalUrl: string;
  siteName?: string;
  faviconUrl?: string;
  metadata?: Record<string, unknown>;
}

export class WebMetadataExtractor {
  public static extract(): WebMetadata {
    const rawUrl = window.location.href;
    const structured = this.extractStructuredMetadata();

    const ogTitle = getMetaContent('property', 'og:title');
    const twitterTitle = getMetaContent('name', 'twitter:title');
    const metaTitle = getMetaContent('name', 'title');
    const title =
      structured.title ||
      ogTitle ||
      twitterTitle ||
      metaTitle ||
      getAttribute('shreddit-post[post-title]', 'post-title') ||
      textContent('[slot="title"]') ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title.trim();

    const author =
      structured.author ||
      getMetaContent('name', 'author') ||
      getMetaContent('property', 'article:author') ||
      getMetaContent('name', 'twitter:creator') ||
      getAttribute('shreddit-post[author]', 'author') ||
      getAttribute('[author]', 'author') ||
      textContent('a[rel="author"]') ||
      undefined;

    const description =
      structured.description ||
      getMetaContent('name', 'description') ||
      getMetaContent('property', 'og:description') ||
      getMetaContent('name', 'twitter:description') ||
      undefined;

    const publishedAt =
      structured.publishedAt ||
      getMetaContent('property', 'article:published_time') ||
      getMetaContent('name', 'pubdate') ||
      getMetaContent('name', 'date') ||
      getAttribute('time[datetime]', 'datetime') ||
      undefined;

    let canonicalUrl = rawUrl;
    const linkCanonical = document.querySelector('link[rel="canonical"]');
    if (linkCanonical && linkCanonical.getAttribute('href')) {
      try {
        canonicalUrl = new URL(linkCanonical.getAttribute('href')!, rawUrl).toString();
      } catch {
        canonicalUrl = rawUrl;
      }
    }

    const siteName =
      structured.siteName ||
      getMetaContent('property', 'og:site_name') ||
      getMetaContent('name', 'application-name') ||
      getAttribute('shreddit-post[subreddit-prefixed-name]', 'subreddit-prefixed-name') ||
      window.location.hostname;

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
      metadata: {
        ...structured.raw,
        ogType: getMetaContent('property', 'og:type') || undefined,
        robots: getMetaContent('name', 'robots') || undefined,
      },
    };
  }

  private static extractStructuredMetadata(): {
    title?: string;
    author?: string;
    description?: string;
    publishedAt?: string;
    siteName?: string;
    raw: Record<string, unknown>;
  } {
    const result: {
      title?: string;
      author?: string;
      description?: string;
      publishedAt?: string;
      siteName?: string;
      raw: Record<string, unknown>;
    } = { raw: {} };

    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      if (result.title && result.description && result.author) return;
      const text = script.textContent?.trim();
      if (!text) return;

      try {
        const parsed = JSON.parse(text) as unknown;
        const node = findStructuredNode(parsed);
        if (!node) return;

        result.title ||= getStringValue(node.headline) || getStringValue(node.name);
        result.description ||= getStringValue(node.description);
        result.publishedAt ||= getStringValue(node.datePublished) || getStringValue(node.dateCreated);
        result.author ||= getStringValue(node.author);
        result.siteName ||= getStringValue(node.publisher);
        result.raw = {
          ...result.raw,
          jsonLdType: getStringValue(node['@type']),
        };
      } catch {
        // Ignore invalid JSON-LD; malformed structured data is common.
      }
    });

    return result;
  }
}

function getMetaContent(attribute: 'name' | 'property', value: string): string | undefined {
  const element = document.querySelector(`meta[${attribute}="${value}"]`);
  return element?.getAttribute('content')?.trim() || undefined;
}

function getAttribute(selector: string, attribute: string): string | undefined {
  return document.querySelector(selector)?.getAttribute(attribute)?.trim() || undefined;
}

function textContent(selector: string): string | undefined {
  return document.querySelector(selector)?.textContent?.trim() || undefined;
}

function getStringValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const itemValue = getStringValue(item);
      if (itemValue) return itemValue;
    }
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return getStringValue(record.name) || getStringValue(record.headline);
  }
  return undefined;
}

function findStructuredNode(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStructuredNode(item);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  const graph = record['@graph'];
  if (Array.isArray(graph)) {
    const graphNode = findStructuredNode(graph);
    if (graphNode) return graphNode;
  }

  const typeValue = getStringValue(record['@type'])?.toLowerCase() || '';
  if (
    /article|blogposting|newsarticle|techarticle|webpage|creativework|documentation|howto|qapage|discussionforumposting/.test(typeValue) ||
    record.headline ||
    record.articleBody
  ) {
    return record;
  }

  return undefined;
}
