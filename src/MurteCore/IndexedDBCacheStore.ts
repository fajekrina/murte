import type { MurteCacheStore } from './MurteCacheStore'

/// Persistent, origin-isolated cache backed by IndexedDB — the browser's
/// counterpart of an on-disk cache directory. Keys are already hashed by the
/// caller (`cacheKey`); each key is still validated to be a single safe path
/// component (no `/`, `.`, or `..`) so the same keys stay valid for any
/// file-backed store.
export class IndexedDBCacheStore implements MurteCacheStore {
  private db?: Promise<IDBDatabase>

  constructor(
    private readonly databaseName = IndexedDBCacheStore.defaultDatabase,
    private readonly factory: IDBFactory = globalThis.indexedDB
  ) {}

  static readonly defaultDatabase = 'Murte'
  private static readonly storeName = 'cache'

  async data(key: string): Promise<Uint8Array | undefined> {
    if (!isSafeKey(key)) return undefined
    try {
      const value = await this.request<unknown>('readonly', (s) => s.get(key))
      return value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : undefined
    } catch {
      return undefined
    }
  }

  async store(data: Uint8Array, key: string): Promise<void> {
    if (!isSafeKey(key)) return
    try { await this.request('readwrite', (s) => s.put(data, key)) } catch { /* best effort, like `try? write` */ }
  }

  async remove(key: string): Promise<void> {
    if (!isSafeKey(key)) return
    try { await this.request('readwrite', (s) => s.delete(key)) } catch { /* best effort */ }
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = this.factory.open(this.databaseName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(IndexedDBCacheStore.storeName)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return this.db
  }

  private async request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.open()
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(IndexedDBCacheStore.storeName, mode)
      const req = run(tx.objectStore(IndexedDBCacheStore.storeName))
      tx.oncomplete = () => resolve(req.result as T)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }
}

/// Reject empty keys, path separators, and the `.`/`..` segments.
function isSafeKey(key: string): boolean {
  return key.length > 0 && !key.includes('/') && key !== '..' && key !== '.'
}
