import { PassthroughCipher, type MurteCacheCipher } from './MurteCacheCipher'
import type { MurteCacheStore } from './MurteCacheStore'

/// Cache configuration injected into the engine (Strategy + limits).
export class MurteCache {
  readonly store: MurteCacheStore
  readonly cipher: MurteCacheCipher
  readonly renderCacheLimit: number

  constructor(init: { store: MurteCacheStore; cipher?: MurteCacheCipher; renderCacheLimit?: number }) {
    this.store = init.store
    this.cipher = init.cipher ?? new PassthroughCipher()
    this.renderCacheLimit = init.renderCacheLimit ?? 32
  }
}
