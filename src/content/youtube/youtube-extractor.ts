import { YouTubeSettings } from '../../types/settings';
import { YouTubeMetadataExtractor } from './metadata-extractor';
import { YouTubeTranscriptExtractor } from './transcript-extractor';
import { TranscriptChunk } from '../../types/capture';

export interface YouTubeExtractionResult {
  videoId: string;
  title: string;
  channel?: string;
  canonicalUrl: string;
  currentTimestampSeconds?: number;
  durationSeconds?: number;
  description?: string;
  transcript?: TranscriptChunk[];
  faviconUrl: string;
}

export class YouTubeExtractor {
  public static extract(settings: YouTubeSettings): YouTubeExtractionResult | null {
    const metadata = YouTubeMetadataExtractor.extract();
    if (!metadata) {
      return null;
    }

    let transcript: TranscriptChunk[] | undefined = undefined;
    if (settings.transcriptEnabled) {
      const localTranscript = YouTubeTranscriptExtractor.extractFromDOM();
      if (localTranscript && localTranscript.length > 0) {
        transcript = localTranscript;
      }
    }

    return {
      videoId: metadata.videoId,
      title: settings.metadataEnabled ? metadata.title : 'YouTube Video',
      channel: settings.metadataEnabled ? metadata.channel : undefined,
      canonicalUrl: metadata.canonicalUrl,
      currentTimestampSeconds: metadata.currentTimestampSeconds,
      durationSeconds: metadata.durationSeconds,
      description: settings.metadataEnabled ? metadata.description : undefined,
      transcript,
      faviconUrl: metadata.faviconUrl || 'https://www.youtube.com/favicon.ico',
    };
  }
}
