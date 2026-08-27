import { KnowledgeCapture } from '../types/capture';
import { AuthStore } from '../storage/auth-store';
import { CaptureStore } from '../storage/capture-store';

export interface BackendResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
}

export class BackendClient {
  private static readonly REQUEST_TIMEOUT_MS = 10_000;
  private static getApiUrl(): string {
    const envUrl = import.meta.env.VITE_MEMSHIFT_API_URL;
    return envUrl || 'https://memshift-api.supabase.co/functions/v1';
  }

  public static async sendCapture(capture: KnowledgeCapture): Promise<BackendResponse<{ captureId: string }>> {
    const session = await AuthStore.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);
      const response = await fetch(`${this.getApiUrl()}/process-capture`, {
        method: 'POST',
        headers,
        body: JSON.stringify(capture),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMsg = errorBody.error || `Server responded with ${response.status}`;
        await CaptureStore.enqueueForSync(capture, errorMsg);
        return { success: false, error: errorMsg, isOffline: true };
      }

      const data = await response.json();
      await CaptureStore.dequeueFromSync(capture.id);
      await CaptureStore.updateLocalCapture(capture.id, {
        syncStatus: 'synced',
        privacy: { ...capture.privacy, backendSynced: true },
      });
      return { success: true, data: { captureId: data.captureId || capture.id } };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error && error.message
        ? error.message
        : 'Network error - capture saved locally';
      await CaptureStore.updateLocalCapture(capture.id, {
        syncStatus: 'error',
        privacy: { ...capture.privacy, backendSynced: false },
      });
      await CaptureStore.enqueueForSync(capture, errorMsg);
      return {
        success: true,
        isOffline: true,
        data: { captureId: capture.id },
        error: errorMsg,
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  public static async syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
    const queue = await CaptureStore.getSyncQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const result = await this.sendCapture(item.capture);
        if (result.success && !result.isOffline) {
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }
}
