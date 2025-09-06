import { Injectable } from '@angular/core';

// Lightweight IndexedDB helper focused on simple key-value and list storage
// DB: 'sangat_foot', version 3
// Object stores:
//  - 'waiters' with keyPath 'id'
//  - 'managers' with keyPath 'id'
//  - 'products' with keyPath 'productId'

@Injectable({ providedIn: 'root' })
export class IdbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('sangat_foot', 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('waiters')) {
          db.createObjectStore('waiters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('managers')) {
          db.createObjectStore('managers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'productId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  async clearStore(storeName: string): Promise<void> {
    const db = await this.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const r = store.clear();
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  async putAll<T extends Record<string, any>>(storeName: string, items: T[]): Promise<void> {
    const db = await this.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const it of items) store.put(it);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.openDB();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  // Clear and write all items within a single transaction to avoid partial writes
  async replaceAll<T extends Record<string, any>>(storeName: string, items: T[]): Promise<void> {
    const db = await this.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const it of items) store.put(it);
      };
      clearReq.onerror = () => reject(clearReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
