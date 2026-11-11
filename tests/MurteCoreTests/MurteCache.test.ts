// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  AESGCMCipher, Ed25519Verifier, IndexedDBCacheStore, Manifest, MemoryCacheStore, MurteCache, MurteCacheCoordinator,
  MurteComponentFactory, MurteEngine, MurteError, MurteNode, MurteScreenFactory, PassthroughCipher, PayloadSecurity,
  bytesEqual, cacheKey, sortedJSONStringify, utf8
} from '../../src/MurteCore'
import { FetchCounter, envelopeJSON, signingKey } from '../helpers'

describe('MurteCacheCoordinator', () => {
  it('render cache LRU evicts', () => {
    const c = new MurteCacheCoordinator(2)
    c.storeRender(new MurteNode({ type: 'a' }), '1')
    c.storeRender(new MurteNode({ type: 'b' }), '2')
    c.renderCached('1')                                  // touch 1 → 2 is now LRU
    c.storeRender(new MurteNode({ type: 'c' }), '3')     // evicts 2
    expect(c.renderCached('1')?.type).toBe('a')
    expect(c.renderCached('2')).toBeUndefined()
    expect(c.renderCached('3')?.type).toBe('c')
  })

  it('manifest rejects a downgrade', () => {
    const c = new MurteCacheCoordinator(8)
    expect(c.apply(new Manifest(5, { home: 'v5' }))).toBe(true)
    expect(c.version('home')).toBe('v5')
    expect(c.apply(new Manifest(4, { home: 'v4' }))).toBe(false)   // older → rejected
    expect(c.version('home')).toBe('v5')
    expect(c.apply(new Manifest(6, { home: 'v6' }))).toBe(true)
    expect(c.version('home')).toBe('v6')
  })

  it('tracks the last-good version', () => {
    const c = new MurteCacheCoordinator(8)
    c.markGood('home', 'v5')
    expect(c.lastGoodVersion('home')).toBe('v5')
  })
})

describe('refreshManifest', () => {
  const manifestEnvelope = async (sign: (d: Uint8Array) => Promise<Uint8Array>, seq: number, screens: Record<string, string>) => {
    const payload = utf8(sortedJSONStringify(new Manifest(seq, screens)))
    return envelopeJSON(payload, await sign(payload))
  }
  const engine = async (loader: () => Promise<Uint8Array>) => {
    const key = await signingKey()
    return {
      key,
      engine: new MurteEngine({
        componentFactory: MurteComponentFactory.withBuiltins,
        screenFactory: new MurteScreenFactory(),
        security: PayloadSecurity.signed(await Ed25519Verifier.create(key.publicKey)),
        cache: new MurteCache({ store: new MemoryCacheStore(), cipher: new PassthroughCipher() }),
        manifestLoader: loader
      })
    }
  }

  it('applies a signed manifest', async () => {
    let sign: (d: Uint8Array) => Promise<Uint8Array> = async () => new Uint8Array()
    const { key, engine: e } = await engine(() => manifestEnvelope(sign, 7, { home: 'v7' }))
    sign = key.sign
    await e.refreshManifest()
    expect(e.coordinator?.version('home')).toBe('v7')
  })

  it('rejects a forged manifest', async () => {
    const attacker = await signingKey()
    const { engine: e } = await engine(() => manifestEnvelope(attacker.sign, 9, { home: 'v9' }))
    await expect(e.refreshManifest()).rejects.toBeInstanceOf(MurteError)
    expect(e.coordinator?.version('home')).toBeUndefined()   // forged manifest was not applied
  })

  it('rejects a downgrade', async () => {
    const calls = new FetchCounter()
    let sign: (d: Uint8Array) => Promise<Uint8Array> = async () => new Uint8Array()
    const { key, engine: e } = await engine(async () => {
      calls.bump()
      const seq = calls.count === 1 ? 7 : 5                  // seq 7 first, then an older seq 5
      return manifestEnvelope(sign, seq, { home: seq === 7 ? 'v7' : 'v5' })
    })
    sign = key.sign
    await e.refreshManifest()
    expect(e.coordinator?.version('home')).toBe('v7')
    await e.refreshManifest()                                // older sequence, validly signed: must not throw, must not apply
    expect(e.coordinator?.version('home')).toBe('v7')
  })
})

describe('Manifest', () => {
  it('decodes', () => {
    const m = Manifest.fromJSON('{ "sequence": 7, "screens": { "dashboard": "v7", "login": "v3" } }')
    expect(m.sequence).toBe(7)
    expect(m.screens.dashboard).toBe('v7')
  })
})

describe('cacheKey', () => {
  it('is deterministic and versioned', async () => {
    expect(await cacheKey('dashboard', 'v7')).toBe(await cacheKey('dashboard', 'v7'))
    expect(await cacheKey('dashboard', 'v7')).not.toBe(await cacheKey('dashboard', 'v8'))
    expect(await cacheKey('dashboard', 'v7')).toHaveLength(64)   // sha256 hex
  })
})

describe('AESGCMCipher', () => {
  it('round-trips and hides the plaintext', async () => {
    const cipher = new AESGCMCipher(await AESGCMCipher.generateKey())
    const data = utf8('secret payload')
    const sealed = await cipher.seal(data)
    expect(bytesEqual(sealed, data)).toBe(false)
    expect(bytesEqual(await cipher.open(sealed), data)).toBe(true)
  })

  it('a wrong key fails to open', async () => {
    const sealed = await new AESGCMCipher(await AESGCMCipher.generateKey()).seal(utf8('x'))
    await expect(new AESGCMCipher(await AESGCMCipher.generateKey()).open(sealed)).rejects.toThrow()
  })
})

describe('MurteCacheCipher', () => {
  it('passthrough round-trips identity', () => {
    const cipher = new PassthroughCipher()
    const data = utf8('hello')
    expect(cipher.seal(data)).toBe(data)
    expect(cipher.open(cipher.seal(data))).toBe(data)
  })
})

describe('MemoryCacheStore', () => {
  it('stores, reads, and removes', async () => {
    const store = new MemoryCacheStore()
    await store.store(utf8('x'), 'k')
    expect(bytesEqual((await store.data('k'))!, utf8('x'))).toBe(true)
    await store.remove('k')
    expect(await store.data('k')).toBeUndefined()
  })
})

describe('IndexedDBCacheStore', () => {
  it('persists and removes', async () => {
    const store = new IndexedDBCacheStore(`murte-cache-${crypto.randomUUID()}`)
    await store.store(utf8('disk'), 'k')
    expect(bytesEqual((await store.data('k'))!, utf8('disk'))).toBe(true)
    await store.remove('k')
    expect(await store.data('k')).toBeUndefined()
  })

  it('rejects path-traversal keys', async () => {
    const store = new IndexedDBCacheStore(`murte-cache-${crypto.randomUUID()}`)
    await store.store(utf8('x'), '../escape')
    expect(await store.data('../escape')).toBeUndefined()
    expect(await store.data('a/b')).toBeUndefined()
  })
})

describe('MurteCache wiring', () => {
  it('the engine builds a coordinator when a cache is present', () => {
    const engine = new MurteEngine({
      componentFactory: MurteComponentFactory.withBuiltins,
      screenFactory: new MurteScreenFactory(),
      cache: new MurteCache({ store: new MemoryCacheStore(), cipher: new PassthroughCipher() })
    })
    expect(engine.coordinator).toBeDefined()
  })

  it('no cache means no coordinator', () => {
    expect(new MurteEngine({ componentFactory: MurteComponentFactory.withBuiltins, screenFactory: new MurteScreenFactory() }).coordinator).toBeUndefined()
  })
})
