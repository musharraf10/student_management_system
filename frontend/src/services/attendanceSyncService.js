/**
 * Automatic Background Attendance Synchronization Service
 * Coordinates network detection, idempotent batch synchronization,
 * exponential backoff retry, and immediate deletion of acknowledged local records.
 */

import attendanceDB from './attendanceDB';
import attendanceService from './attendanceService';

class AttendanceSyncService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.pendingCount = 0;
    this.lastSyncedAt = null;
    this.syncError = null;
    this.retryTimer = null;
    this.backoffDelay = 2000; // Start at 2s, max 30s
    this.listeners = new Set();
    this.currentUserId = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic connection and sync check
      setInterval(() => {
        if (this.currentUserId && !this.isSyncing) {
          this.checkConnectionAndSync(this.currentUserId);
        }
      }, 30000);
    }
  }

  setCurrentUser(userId) {
    this.currentUserId = userId;
    if (userId) {
      this.refreshPendingCount(userId);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }

  getState() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      syncError: this.syncError,
    };
  }

  async refreshPendingCount(userId) {
    const uId = userId || this.currentUserId;
    if (!uId) return;
    try {
      const pending = await attendanceDB.getAllPendingRecords(uId);
      this.pendingCount = pending.length;
      this.notify();
    } catch (err) {
      console.warn('Failed to refresh pending count:', err);
    }
  }

  async handleNetworkChange(browserOnline) {
    if (!browserOnline) {
      this.isOnline = false;
      this.notify();
      return;
    }

    // When browser reports online, verify actual backend connectivity with active health ping
    const actuallyReachable = await this.probeBackend();
    this.isOnline = actuallyReachable;
    this.notify();

    if (actuallyReachable && this.currentUserId) {
      this.syncPending(this.currentUserId);
    }
  }

  async probeBackend() {
    try {
      await attendanceService.checkHealth();
      return true;
    } catch {
      return false;
    }
  }

  async checkConnectionAndSync(userId) {
    const reachable = await this.probeBackend();
    const stateChanged = this.isOnline !== reachable;
    this.isOnline = reachable;

    if (stateChanged) {
      this.notify();
    }

    if (reachable) {
      await this.syncPending(userId);
    }
  }

  /**
   * Main synchronization coordinator
   * Chunks pending records into batches of 150 for 300-500+ student scale
   * Immediately DELETES acknowledged local records from IndexedDB upon server confirmation
   */
  async syncPending(userId) {
    const uId = userId || this.currentUserId;
    if (!uId || this.isSyncing) return;

    // Check if network is really reachable
    const reachable = await this.probeBackend();
    this.isOnline = reachable;
    if (!reachable) {
      this.notify();
      return;
    }

    try {
      this.isSyncing = true;
      this.syncError = null;
      this.notify();

      const pendingRecords = await attendanceDB.getAllPendingRecords(uId);
      this.pendingCount = pendingRecords.length;

      if (pendingRecords.length === 0) {
        this.isSyncing = false;
        this.backoffDelay = 2000;
        this.notify();
        return;
      }

      // Chunk records into batches of 150
      const BATCH_SIZE = 150;
      const chunks = [];
      for (let i = 0; i < pendingRecords.length; i += BATCH_SIZE) {
        chunks.push(pendingRecords.slice(i, i + BATCH_SIZE));
      }

      for (const chunk of chunks) {
        const opIds = chunk.map((r) => r.opId);
        await attendanceDB.markRecordsSyncing(opIds);

        const payload = {
          batchId: `batch_${uId}_${Date.now()}`,
          records: chunk.map((r) => ({
            opId: r.opId,
            universityId: r.universityId,
            sectionId: r.sectionId,
            date: r.date,
            dayType: r.dayType,
            holidayReason: r.holidayReason,
            studentId: r.studentId,
            status: r.status,
            remarks: r.remarks,
            clientUpdatedAt: r.clientUpdatedAt,
          })),
        };

        const res = await attendanceService.syncAttendanceBatch(payload);

        // USER CONSTRAINT: "once data sync with DB local data need to delete"
        // Immediately delete successfully acknowledged records from IndexedDB
        if (Array.isArray(res.acknowledgedOpIds) && res.acknowledgedOpIds.length > 0) {
          await attendanceDB.deleteSyncedRecords(res.acknowledgedOpIds);
        }

        // Handle any failed records
        if (Array.isArray(res.failedRecords) && res.failedRecords.length > 0) {
          await attendanceDB.markRecordsFailed(res.failedRecords);
          this.syncError = `${res.failedRecords.length} record(s) failed server validation`;
        }
      }

      // Refresh remaining pending count
      const remaining = await attendanceDB.getAllPendingRecords(uId);
      this.pendingCount = remaining.length;
      this.lastSyncedAt = new Date().toISOString();

      if (remaining.length === 0) {
        this.backoffDelay = 2000;
        this.syncError = null;
      } else {
        // Schedule retry with exponential backoff
        this.scheduleRetry(uId);
      }
    } catch (err) {
      console.error('Attendance synchronization failed:', err);
      this.syncError = err.response?.data?.message || err.message || 'Synchronization failed';
      this.scheduleRetry(uId);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  scheduleRetry(userId) {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      this.syncPending(userId);
    }, this.backoffDelay);

    // Exponential backoff up to 30s
    this.backoffDelay = Math.min(this.backoffDelay * 2, 30000);
  }

  /**
   * Manual sync trigger from UI button
   */
  async triggerManualSync(userId) {
    this.backoffDelay = 2000;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    return this.syncPending(userId || this.currentUserId);
  }
}

export const attendanceSyncService = new AttendanceSyncService();
export default attendanceSyncService;