import { AuthStore, AuthSession } from '../storage/auth-store';
import { AuthStateInfo } from '../types/messages';

export class AuthManager {
  /**
   * Retrieves active auth state.
   */
  public static async getAuthState(): Promise<AuthStateInfo> {
    const session = await AuthStore.getSession();
    if (!session || !session.accessToken) {
      return { isAuthenticated: false };
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt && session.expiresAt < now) {
      // Attempt refresh or mark expired
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      userId: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
    };
  }

  /**
   * Stores a newly acquired session.
   */
  public static async setSession(session: AuthSession): Promise<void> {
    await AuthStore.setSession(session);
  }

  /**
   * Logs out the user and clears stored credentials.
   */
  public static async logout(): Promise<void> {
    await AuthStore.clearSession();
  }
}
