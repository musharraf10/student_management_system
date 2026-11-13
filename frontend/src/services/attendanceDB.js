/**
 * Attendance Offline-First IndexedDB Storage Service
 * Provides durable local persistence for attendance records, student rosters, and sections.
 * Automatically deletes local records once synchronized with MongoDB.
 */

const DB_NAME = 'student_attendance_offline_db';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Local Attendance Records Store
      // Key: `${userId}_${sectionId}_${date}_${studentId}`
      if (!db.objectStoreNames.contains('local_records')) {
        const recordStore = db.createObjectStore('local_records', { keyPath: 'id' });
        recordStore.createIndex('by_user', 'userId', { unique: false });
        recordStore.createIndex('by_day', ['userId', 'sectionId', 'date'], { unique: false });
        recordStore.createIndex('by_sync', ['userId', 'syncStatus'], { unique: false });
        recordStore.createIndex('by_op', 'opId', { unique: true });
      }

      // 2. Cached Student Roster Store for offline sheet initialization
      // Key: `${userId}_${sectionId}`
      if (!db.objectStoreNames.contains('roster_cache')) {
        const rosterStore = db.createObjectStore('roster_cache', { keyPath: 'id' });
        rosterStore.createIndex('by_user', 'userId', { unique: false });
      }

      // 3. Cached Sections List Store
      // Key: `userId`
      if (!db.objectStoreNames.contains('sections_cache')) {
        db.createObjectStore('sections_cache', { keyPath: 'userId' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

export const attendanceDB = {
  /**
   * Generates a stable unique operation ID for idempotency and duplicate prevention
   */
  generateOpId(studentId) {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    return `op_${studentId || 'st'}_${timestamp}_${rand}`;
  },

  /**
   * Save or update a single student's attendance mark locally
   */
  async saveLocalRecord({
    userId,
    universityId,
    sectionId,
    date,
    dayType = 'working_day',
    holidayReason = '',
    studentId,
    studentName = '',
    rollNumber = '',
    status,
    remarks = '',
  }) {
    if (!userId || !sectionId || !date || !studentId) {
      throw new Error('Missing mandatory fields for local attendance record');
    }

    const db = await openDB();
    const id = `${userId}_${sectionId}_${date}_${studentId}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readwrite');
      const store = tx.objectStore('local_records');

      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        const opId = existing?.opId || this.generateOpId(studentId);

        const record = {
          id,
          opId,
          userId: String(userId),
          universityId: universityId ? String(universityId) : existing?.universityId || '',
          sectionId: String(sectionId),
          date: String(date),
          dayType,
          holidayReason: holidayReason || '',
          studentId: String(studentId),
          studentName: studentName || existing?.studentName || '',
          rollNumber: rollNumber || existing?.rollNumber || '',
          status,
          remarks: remarks || '',
          syncStatus: 'pending',
          clientUpdatedAt: new Date().toISOString(),
          syncError: null,
        };

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve(record);
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  },

  /**
   * Save multiple student attendance marks in a single atomic transaction
   */
  async saveLocalRecordsBulk(recordsList) {
    if (!Array.isArray(recordsList) || recordsList.length === 0) return [];

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readwrite');
      const store = tx.objectStore('local_records');

      const saved = [];
      const now = new Date().toISOString();

      recordsList.forEach((item) => {
        const {
          userId,
          universityId,
          sectionId,
          date,
          dayType = 'working_day',
          holidayReason = '',
          studentId,
          studentName = '',
          rollNumber = '',
          status,
          remarks = '',
        } = item;

        const id = `${userId}_${sectionId}_${date}_${studentId}`;
        const opId = item.opId || this.generateOpId(studentId);

        const record = {
          id,
          opId,
          userId: String(userId),
          universityId: universityId ? String(universityId) : '',
          sectionId: String(sectionId),
          date: String(date),
          dayType,
          holidayReason: holidayReason || '',
          studentId: String(studentId),
          studentName,
          rollNumber,
          status,
          remarks: remarks || '',
          syncStatus: 'pending',
          clientUpdatedAt: now,
          syncError: null,
        };

        store.put(record);
        saved.push(record);
      });

      tx.oncomplete = () => resolve(saved);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Retrieve all local pending/failed attendance records for a given section and date
   */
  async getLocalRecordsForDay(userId, sectionId, date) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readonly');
      const store = tx.objectStore('local_records');
      const index = store.index('by_day');

      const request = index.getAll([String(userId), String(sectionId), String(date)]);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Retrieve all pending records across all sections for the authenticated user
   */
  async getAllPendingRecords(userId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readonly');
      const store = tx.objectStore('local_records');
      const index = store.index('by_user');

      const request = index.getAll(String(userId));
      request.onsuccess = () => {
        const allUserRecords = request.result || [];
        // Return only unsynchronized records
        resolve(allUserRecords.filter((r) => r.syncStatus !== 'synced'));
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Mark records as 'syncing' during in-flight batch transmission
   */
  async markRecordsSyncing(opIds) {
    if (!Array.isArray(opIds) || opIds.length === 0) return;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readwrite');
      const store = tx.objectStore('local_records');
      const opIndex = store.index('by_op');

      let completed = 0;
      opIds.forEach((opId) => {
        const getReq = opIndex.get(opId);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const updated = { ...getReq.result, syncStatus: 'syncing' };
            store.put(updated);
          }
          completed++;
          if (completed === opIds.length) resolve();
        };
        getReq.onerror = () => {
          completed++;
          if (completed === opIds.length) resolve();
        };
      });

      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Mark records as 'failed' with error reason for retry
   */
  async markRecordsFailed(failedList) {
    if (!Array.isArray(failedList) || failedList.length === 0) return;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readwrite');
      const store = tx.objectStore('local_records');
      const opIndex = store.index('by_op');

      let completed = 0;
      failedList.forEach(({ opId, reason }) => {
        const getReq = opIndex.get(opId);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const updated = {
              ...getReq.result,
              syncStatus: 'failed',
              syncError: reason || 'Synchronization failed',
            };
            store.put(updated);
          }
          completed++;
          if (completed === failedList.length) resolve();
        };
        getReq.onerror = () => {
          completed++;
          if (completed === failedList.length) resolve();
        };
      });

      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * DELETE SYNCHRONIZED RECORDS:
   * Once data is successfully acknowledged by MongoDB, the local record is immediately deleted
   * to keep local storage clean, prevent duplicate lingering data, and honor user requirement.
   */
  async deleteSyncedRecords(acknowledgedOpIds) {
    if (!Array.isArray(acknowledgedOpIds) || acknowledgedOpIds.length === 0) return;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_records', 'readwrite');
      const store = tx.objectStore('local_records');
      const opIndex = store.index('by_op');

      let completed = 0;
      acknowledgedOpIds.forEach((opId) => {
        const getReq = opIndex.get(opId);
        getReq.onsuccess = () => {
          if (getReq.result) {
            store.delete(getReq.result.id);
          }
          completed++;
          if (completed === acknowledgedOpIds.length) resolve();
        };
        getReq.onerror = () => {
          completed++;
          if (completed === acknowledgedOpIds.length) resolve();
        };
      });

      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Cache student roster and section metadata for offline attendance marking
   */
  async cacheRoster(userId, sectionId, sectionData, students) {
    if (!userId || !sectionId) return;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('roster_cache', 'readwrite');
      const store = tx.objectStore('roster_cache');
      const id = `${userId}_${sectionId}`;

      const entry = {
        id,
        userId: String(userId),
        sectionId: String(sectionId),
        sectionData,
        students: students || [],
        cachedAt: new Date().toISOString(),
      };

      const putReq = store.put(entry);
      putReq.onsuccess = () => resolve(entry);
      putReq.onerror = () => reject(putReq.error);
    });
  },

  /**
   * Get cached student roster when offline
   */
  async getCachedRoster(userId, sectionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roster_cache', 'readonly');
      const store = tx.objectStore('roster_cache');
      const id = `${userId}_${sectionId}`;

      const getReq = store.get(id);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
  },

  /**
   * Cache section list for offline navigation
   */
  async cacheSections(userId, sections) {
    if (!userId) return;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sections_cache', 'readwrite');
      const store = tx.objectStore('sections_cache');

      const entry = {
        userId: String(userId),
        sections: sections || [],
        cachedAt: new Date().toISOString(),
      };

      const putReq = store.put(entry);
      putReq.onsuccess = () => resolve(entry);
      putReq.onerror = () => reject(putReq.error);
    });
  },

  /**
   * Get cached section list when offline
   */
  async getCachedSections(userId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sections_cache', 'readonly');
      const store = tx.objectStore('sections_cache');

      const getReq = store.get(String(userId));
      getReq.onsuccess = () => resolve(getReq.result?.sections || []);
      getReq.onerror = () => reject(getReq.error);
    });
  },

  /**
   * Clear all local records and caches for a user on logout
   */
  async clearUserData(userId) {
    if (!userId) return;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['local_records', 'roster_cache', 'sections_cache'], 'readwrite');

      const recordStore = tx.objectStore('local_records');
      const userIndex = recordStore.index('by_user');
      const req = userIndex.getAll(String(userId));

      req.onsuccess = () => {
        const records = req.result || [];
        records.forEach((r) => recordStore.delete(r.id));
      };

      const rosterStore = tx.objectStore('roster_cache');
      const rosterIndex = rosterStore.index('by_user');
      const rosterReq = rosterIndex.getAll(String(userId));
      rosterReq.onsuccess = () => {
        const rosters = rosterReq.result || [];
        rosters.forEach((ros) => rosterStore.delete(ros.id));
      };

      const sectionsStore = tx.objectStore('sections_cache');
      sectionsStore.delete(String(userId));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

export default attendanceDB;