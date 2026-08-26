export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channel?: string;
  canonicalUrl: string;
  currentTimestampSeconds?: number;
  durationSeconds?: number;
  description?: string;
  faviconUrl?: string;
}

export class YouTubeMetadataExtractor {
  public static extract(): YouTubeMetadata | null {
    try {
      const url = new URL(window.location.href);
      let videoId = '';

      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1);
      } else if (url.pathname.startsWith('/watch')) {
        videoId = url.searchParams.get('v') || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/shorts/')[1] || '';
      }

      if (!videoId) {
        return null;
      }

      // Title extraction
      let title = '';
      const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title');
      if (titleEl && titleEl.textContent) {
        title = titleEl.textContent.trim();
      }
      if (!title) {
        const metaTitle = document.querySelector('meta[name="title"], meta[property="og:title"]');
        if (metaTitle) {
          title = metaTitle.getAttribute('content') || '';
        }
      }
      if (!title) {
        title = document.title.replace(/ - YouTube$/, '').trim();
      }

      // Channel extraction
      let channel = '';
      const channelEl = document.querySelector(
        'ytd-channel-name #text-container yt-formatted-string, #owner #channel-name a, #upload-info #channel-name'
      );
      if (channelEl && channelEl.textContent) {
        channel = channelEl.textContent.trim();
      }
      if (!channel) {
        const metaAuthor = document.querySelector('link[itemprop="name"], meta[itemprop="author"]');
        if (metaAuthor) {
          channel = metaAuthor.getAttribute('content') || '';
        }
      }

      // Video element playback time
      const videoEl = document.querySelector('video') as HTMLVideoElement | null;
      let currentTimestampSeconds: number | undefined = undefined;
      let durationSeconds: number | undefined = undefined;

      if (videoEl && !isNaN(videoEl.currentTime)) {
        currentTimestampSeconds = Math.floor(videoEl.currentTime);
        if (!isNaN(videoEl.duration) && videoEl.duration > 0) {
          durationSeconds = Math.floor(videoEl.duration);
        }
      }

      // Description extraction
      let description = '';
      const descEl = document.querySelector('#description-inline-expander yt-attributed-string, #description-text');
      if (descEl && descEl.textContent) {
        description = descEl.textContent.trim().slice(0, 2000);
      }
      if (!description) {
        const metaDesc = document.querySelector('meta[name="description"], meta[property="og:description"]');
        if (metaDesc) {
          description = metaDesc.getAttribute('content') || '';
        }
      }

      return {
        videoId,
        title: title || 'YouTube Video',
        channel: channel || undefined,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        currentTimestampSeconds,
        durationSeconds,
        description: description || undefined,
        faviconUrl: 'https://www.youtube.com/favicon.ico',
      };
    } catch (err) {
      console.warn('MemShift: Error extracting YouTube metadata:', err);
      return null;
    }
  }
}
