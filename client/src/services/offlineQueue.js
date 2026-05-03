import { openDB } from 'idb';

const DB_NAME = 'scrap-mgr-offline';
const STORE_NAME = 'outbox';
const DB_VERSION = 1;

let listeners = [];

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

function notify() {
  pending().then((n) => listeners.forEach((cb) => cb(n)));
}

/**
 * Add a request to the offline outbox.
 * @param {{ method: string, url: string, data: any, idempotencyKey: string, label: string }} req
 */
export async function enqueue(req) {
  const db = await getDB();
  await db.add(STORE_NAME, {
    ...req,
    createdAt: Date.now(),
    retryCount: 0,
    lastError: null,
    status: 'pending', // pending | failed
  });
  notify();
}

/** Count of items in outbox. */
export async function pending() {
  const db = await getDB();
  return db.count(STORE_NAME);
}

/** Get all outbox items. */
export async function getAll() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/** Delete a single item by id. */
export async function remove(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  notify();
}

/** Clear entire outbox. */
export async function clearAll() {
  const db = await getDB();
  await db.clear(STORE_NAME);
  notify();
}

/**
 * Replay pending requests in order.
 * Uses raw fetch (not axios) so we don't re-enter the offline interceptor.
 */
let flushing = false;
export async function flush() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const db = await getDB();
    const items = await db.getAll(STORE_NAME);
    for (const item of items) {
      if (item.status === 'failed') continue; // skip permanently failed

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (item.idempotencyKey) {
          headers['Idempotency-Key'] = item.idempotencyKey;
        }

        const res = await fetch(item.url, {
          method: item.method,
          headers,
          credentials: 'include',
          body: item.data ? JSON.stringify(item.data) : undefined,
        });

        if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
          // Success or non-retryable client error — remove from queue
          await db.delete(STORE_NAME, item.id);

          // Invalidate cached GET for this resource so next list-load is fresh
          if ('caches' in window) {
            try {
              const cache = await caches.open('api-cache');
              const basePath = item.url.split('?')[0]; // e.g. /api/payments
              const keys = await cache.keys();
              for (const key of keys) {
                if (new URL(key.url).pathname.startsWith(basePath)) {
                  await cache.delete(key);
                }
              }
            } catch { /* non-critical */ }
          }
        } else {
          // Server / rate-limit / timeout error — stop flushing, retry later
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const obj = await tx.store.get(item.id);
          if (obj) {
            obj.retryCount += 1;
            obj.lastError = `HTTP ${res.status}`;
            await tx.store.put(obj);
          }
          await tx.done;
          break;
        }
      } catch (err) {
        // Network error — stop flushing
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const obj = await tx.store.get(item.id);
        if (obj) {
          obj.retryCount += 1;
          obj.lastError = err.message || 'Network error';
          if (obj.retryCount >= 10) obj.status = 'failed';
          await tx.store.put(obj);
        }
        await tx.done;
        break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
}

/**
 * Subscribe to queue size changes.
 * @param {(count: number) => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribe(cb) {
  listeners.push(cb);
  // Emit current count immediately
  pending().then(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
