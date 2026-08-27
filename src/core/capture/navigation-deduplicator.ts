import { normalizeUrl } from '../../shared/utils';

export class NavigationDeduplicator {
  private static readonly DEBOUNCE_WINDOW_MS = 1500;
  private static lastNavigationTimes = new Map<string, number>();

  /**
   * Checks if an incoming navigation event represents a rapid duplicate event of the same navigation.
   * If true, it means multiple browser/DOM events fired in rapid succession (< 1.5s) for the same page.
   */
  public static isRapidDuplicateEvent(canonicalUrl: string, nowMs = Date.now()): boolean {
    const normalized = normalizeUrl(canonicalUrl);
    if (!normalized) return false;

    const lastTime = this.lastNavigationTimes.get(normalized);
    if (lastTime !== undefined && (nowMs - lastTime) < this.DEBOUNCE_WINDOW_MS) {
      return true;
    }

    this.lastNavigationTimes.set(normalized, nowMs);

    // Periodic cleanup to avoid unbounded memory growth
    if (this.lastNavigationTimes.size > 200) {
      for (const [key, timestamp] of this.lastNavigationTimes.entries()) {
        if (nowMs - timestamp > 60_000) {
          this.lastNavigationTimes.delete(key);
        }
      }
    }

    return false;
  }

  /**
   * Resets the navigation debouncer (useful for tests and restarts).
   */
  public static reset(): void {
    this.lastNavigationTimes.clear();
  }
}
