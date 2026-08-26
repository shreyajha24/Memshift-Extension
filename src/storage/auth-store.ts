import { STORAGE_KEYS } from '../shared/constants';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email?: string;
    displayName?: string;
  };
}

export class AuthStore {
  private static inMemorySession: AuthSession | null = null;

  /**
   * Retrieves active authentication session from chrome.storage.local.
   */
  public static async getSession(): Promise<AuthSession | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const res = await chrome.storage.local.get(STORAGE_KEYS.AUTH_SESSION);
        if (res && res[STORAGE_KEYS.AUTH_SESSION]) {
          return res[STORAGE_KEYS.AUTH_SESSION];
        }
      } catch (err) {
        console.warn('Failed to load auth session:', err);
      }
    }
    return this.inMemorySession;
  }

  /**
   * Sets authentication session.
   */
  public static async setSession(session: AuthSession): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_SESSION]: session });
      } catch (err) {
        console.warn('Failed to save auth session:', err);
      }
    }
    this.inMemorySession = session;
  }

  /**
   * Clears authentication session.
   */
  public static async clearSession(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.remove(STORAGE_KEYS.AUTH_SESSION);
      } catch (err) {
        console.warn('Failed to clear auth session:', err);
      }
    }
    this.inMemorySession = null;
  }
}
