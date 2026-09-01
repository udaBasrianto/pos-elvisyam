import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSDB extends DBSchema {
  products: {
    key: string;
    value: any;
  };
  categories: {
    key: string;
    value: any;
  };
  brands: {
    key: string;
    value: any;
  };
  customers: {
    key: string;
    value: any;
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      type: string;
      payload: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<POSDB>('pos-offline-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('brands')) {
          db.createObjectStore('brands', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheData(storeName: 'products' | 'categories' | 'brands' | 'customers', dataList: any[]) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).clear();
  for (const item of dataList) {
    await tx.objectStore(storeName).put(item);
  }
  await tx.done;
}

export async function getCachedData(storeName: 'products' | 'categories' | 'brands' | 'customers') {
  const db = await initDB();
  return db.getAll(storeName);
}

export async function enqueueSync(type: string, payload: any) {
  const db = await initDB();
  await db.add('sync_queue', {
    type,
    payload,
    timestamp: Date.now(),
  });
}

export async function getSyncQueue() {
  const db = await initDB();
  return db.getAllFromIndex('sync_queue', 'by-timestamp');
}

export async function removeFromSyncQueue(id: number) {
  const db = await initDB();
  await db.delete('sync_queue', id);
}

export async function clearSyncQueue() {
  const db = await initDB();
  await db.clear('sync_queue');
}
