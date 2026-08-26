import { TranscriptChunk } from '../../types/capture';

export class YouTubeTranscriptExtractor {
  /**
   * Attempts best-effort local extraction of transcript segments from the active DOM.
   * If not open or unavailable in the DOM, returns null.
   */
  public static extractFromDOM(): TranscriptChunk[] | null {
    try {
      const segmentElements = document.querySelectorAll('ytd-transcript-segment-renderer');
      if (segmentElements && segmentElements.length > 0) {
        const chunks: TranscriptChunk[] = [];

        segmentElements.forEach((el) => {
          const timestampEl = el.querySelector('.segment-timestamp');
          const textEl = el.querySelector('.segment-text');

          if (textEl && textEl.textContent) {
            const rawTime = timestampEl?.textContent?.trim() || '0:00';
            const seconds = this.parseTimeStringToSeconds(rawTime);
            chunks.push({
              text: textEl.textContent.trim(),
              start: seconds,
              duration: 5,
            });
          }
        });

        if (chunks.length > 0) {
          return chunks;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private static parseTimeStringToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map((p) => parseInt(p, 10));
    if (parts.some((n) => isNaN(n))) return 0;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  }
}
