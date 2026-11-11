// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  Ed25519Verifier, Manifest, MemoryCacheStore, MurteCache, MurteComponentFactory, MurteEngine, MurteError,
  MurteScreenFactory, PassthroughCipher, PayloadSecurity, ScreenSource, cacheKey, utf8, type MurteCacheStore
} from '../../src/MurteCore'
import { FetchCounter, envelopeJSON, signingKey, type SigningKey } from '../helpers'

const homePayload = (type: string) => utf8(`{"schemaVersion":"1.0","screen":{"key":"home","root":{"type":"${type}"}}}`)

async function setup() {
  const key = await signingKey()
  const verifier = await Ed25519Verifier.create(key.publicKey)
  const envelope = async (type: string, signer: SigningKey = key) => envelopeJSON(homePayload(type), await signer.sign(homePayload(type)))
  const makeEngine = (store: MurteCacheStore, factory: MurteScreenFactory) => new MurteEngine({
    componentFactory: MurteComponentFactory.withBuiltins,
    screenFactory: factory,
    security: PayloadSecurity.signed(verifier),
    cache: new MurteCache({ store, cipher: new PassthroughCipher() })
  })
  const counting = (store: MurteCacheStore, fetches: FetchCounter) => {
    const factory = new MurteScreenFactory()
    factory.register('home', async () => { fetches.bump(); return envelope('text') })
    return makeEngine(store, factory)
  }
  return { envelope, makeEngine, counting }
}

describe('Cached load', () => {
  it('miss fetches and stores, then a disk hit avoids a refetch', async () => {
    const { counting } = await setup()
    const store = new MemoryCacheStore(); const fetches = new FetchCounter()
    const engine = counting(store, fetches)
    await engine.load(ScreenSource.key('home'))          // miss → fetch + store
    engine.coordinator?.purgeRenderCache()               // drop in-memory tier
    const state = await engine.load(ScreenSource.key('home'))
    expect(state.kind === 'loaded' && state.root.type).toBe('text')
    expect(fetches.count).toBe(1)                        // 2nd load hit disk, no refetch
  })

  it('render cache avoids disk and fetch', async () => {
    const { counting } = await setup()
    const fetches = new FetchCounter()
    const engine = counting(new MemoryCacheStore(), fetches)
    await engine.load(ScreenSource.key('home'))          // fetch #1, fills render cache
    await engine.load(ScreenSource.key('home'))          // render hit
    expect(fetches.count).toBe(1)
  })

  it('a tampered disk entry is rejected and evicted', async () => {
    const { counting } = await setup()
    const store = new MemoryCacheStore(); const fetches = new FetchCounter()
    const engine = counting(store, fetches)
    await engine.load(ScreenSource.key('home')); engine.coordinator?.purgeRenderCache()
    await store.store(utf8('corrupted'), await cacheKey('home', 'unversioned'))
    await engine.load(ScreenSource.key('home'))          // re-verify fails → evict → refetch
    expect(fetches.count).toBe(2)
  })

  it('offline serves last-good across a version bump', async () => {
    const { envelope, makeEngine } = await setup()
    const store = new MemoryCacheStore(); const fetches = new FetchCounter()
    const factory = new MurteScreenFactory()
    factory.register('home', async () => {
      fetches.bump()
      if (fetches.count === 1) return envelope('text')
      throw MurteError.network(null)                     // fail after the first success
    })
    const engine = makeEngine(store, factory)
    await engine.load(ScreenSource.key('home'))          // fetch #1 → cached + marked good under "unversioned"
    engine.coordinator?.purgeRenderCache()
    engine.coordinator?.apply(new Manifest(1, { home: 'v2' }))   // bump version → next disk key misses
    const state = await engine.load(ScreenSource.key('home'))
    expect(state.kind === 'loaded' && state.root.type).toBe('text')
    expect(fetches.count).toBe(2)                        // fetch #2 was attempted (threw) → offline served
  })

  it('a forged FRESH payload is not masked as stale', async () => {
    const { envelope, makeEngine } = await setup()
    const attacker = await signingKey()
    const fetches = new FetchCounter()
    const factory = new MurteScreenFactory()
    factory.register('home', async () => {
      fetches.bump()
      if (fetches.count === 1) return envelope('text')   // good → last-good on disk
      return envelope('text', attacker)                  // forged (wrong key)
    })
    const engine = makeEngine(new MemoryCacheStore(), factory)
    await engine.load(ScreenSource.key('home'))
    engine.coordinator?.purgeRenderCache()
    engine.coordinator?.apply(new Manifest(1, { home: 'v2' }))   // next key misses disk → refetch
    expect((await engine.load(ScreenSource.key('home'))).kind).toBe('failed')
  })

  it('the render tier serves even when the disk entry is corrupt', async () => {
    const { counting } = await setup()
    const store = new MemoryCacheStore(); const fetches = new FetchCounter()
    const engine = counting(store, fetches)
    await engine.load(ScreenSource.key('home'))          // fills render + disk
    await store.store(utf8('corrupt'), await cacheKey('home', 'unversioned'))   // corrupt disk, keep render
    await engine.load(ScreenSource.key('home'))          // render hit, disk never consulted
    expect(fetches.count).toBe(1)
  })

  it('offline with a tampered last-good fails closed', async () => {
    const { envelope, makeEngine } = await setup()
    const store = new MemoryCacheStore(); const fetches = new FetchCounter()
    const factory = new MurteScreenFactory()
    factory.register('home', async () => {
      fetches.bump()
      if (fetches.count === 1) return envelope('text')
      throw MurteError.network(null)
    })
    const engine = makeEngine(store, factory)
    await engine.load(ScreenSource.key('home'))
    engine.coordinator?.purgeRenderCache()
    engine.coordinator?.apply(new Manifest(1, { home: 'v2' }))
    await store.store(utf8('corrupt'), await cacheKey('home', 'unversioned'))   // corrupt last-good
    expect((await engine.load(ScreenSource.key('home'))).kind).toBe('failed')
  })

  it('prefetch warms the cache so load does not refetch', async () => {
    const { counting } = await setup()
    const fetches = new FetchCounter()
    const engine = counting(new MemoryCacheStore(), fetches)
    await engine.prefetch(['home'])                      // warms render + disk (fetch #1)
    engine.coordinator?.purgeRenderCache()
    expect((await engine.load(ScreenSource.key('home'))).kind).toBe('loaded')
    expect(fetches.count).toBe(1)                        // served from disk, no refetch
  })
})
