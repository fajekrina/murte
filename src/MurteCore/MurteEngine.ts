import { MurteActionDispatcher } from './MurteActionDispatcher'
import { MurteCacheCoordinator } from './MurteCacheCoordinator'
import { MurteError } from './MurteError'
import { MurtePayload, MurteEnvelope, parseJSON } from './MurtePayload'
import { MurteRenderer } from './MurteRenderer'
import { MurteSchemaValidator } from './MurteSchemaValidator'
import { PayloadSecurity } from './MurteSignatureVerifier'
import { LoadState, type ScreenSource } from './ScreenSource'
import { Manifest } from './Manifest'
import { cacheKey } from './CacheKey'
import { toBytes, type BytesLike, type MurteData } from './MurteData'
import type { MurteCache } from './MurteCache'
import type { MurteComponentFactory } from './MurteComponentFactory'
import type { MurteNode } from './MurteNode'
import type { MurteScreenFactory } from './MurteScreenFactory'

export interface MurteEngineInit {
  componentFactory: MurteComponentFactory
  screenFactory: MurteScreenFactory
  actionDispatcher?: MurteActionDispatcher
  validator?: MurteSchemaValidator
  security?: PayloadSecurity
  cache?: MurteCache
  namedResolver?: (name: string) => Promise<BytesLike>
  manifestLoader?: () => Promise<BytesLike>
}

/// Holds the component and screen factories, the schema validator, and the action
/// dispatcher. `load` fetches a source, verifies its signature, decodes the JSON,
/// and validates it, returning the screen's root node or a failure state — it
/// never throws to the caller.
export class MurteEngine {
  readonly componentFactory: MurteComponentFactory
  readonly screenFactory: MurteScreenFactory
  readonly actionDispatcher: MurteActionDispatcher
  readonly validator: MurteSchemaValidator
  readonly security: PayloadSecurity
  readonly cache?: MurteCache
  /// The cache's session state; present exactly when a cache is configured.
  readonly coordinator?: MurteCacheCoordinator
  private readonly namedResolver?: (name: string) => Promise<BytesLike>
  private readonly manifestLoader?: () => Promise<BytesLike>

  constructor(init: MurteEngineInit) {
    this.componentFactory = init.componentFactory
    this.screenFactory = init.screenFactory
    this.actionDispatcher = init.actionDispatcher ?? new MurteActionDispatcher()
    this.validator = init.validator ?? new MurteSchemaValidator()
    this.security = init.security ?? PayloadSecurity.insecureDevelopment
    if (init.cache) {
      this.cache = init.cache
      this.coordinator = new MurteCacheCoordinator(init.cache.renderCacheLimit)
    }
    this.namedResolver = init.namedResolver
    this.manifestLoader = init.manifestLoader
  }

  /// The renderer over the registered components.
  get renderer(): MurteRenderer {
    return new MurteRenderer(this.componentFactory)
  }

  /// Resolve a source to its screen root, failing closed on any error.
  /// Key sources go through the cache tiers (render → disk → fetch, with an
  /// offline last-good fallback); other sources fetch and materialize directly.
  async load(source: ScreenSource): Promise<LoadState> {
    try {
      if (source.kind === 'key' && this.cache && this.coordinator) {
        return LoadState.loaded(await this.loadCached(source.key, this.cache, this.coordinator))
      }
      return LoadState.loaded(await this.materialize(await this.sourceData(source)))
    } catch (error) {
      if (error instanceof MurteError) return LoadState.failed(error)
      return LoadState.failed(MurteError.decode(error instanceof Error ? error.message : String(error)))
    }
  }

  /// Fetch the signed manifest, verify it, and apply it (rejecting downgrades).
  async refreshManifest(): Promise<void> {
    if (!this.coordinator || !this.manifestLoader) return
    const raw = toBytes(await this.manifestLoader())
    const payloadData = await this.unwrap(raw)                 // verify signature
    const manifest = Manifest.fromJSON(payloadData)
    this.coordinator.apply(manifest)                           // no-downgrade enforced in apply
  }

  /// Warm the cache for the given screen keys.
  async prefetch(screenKeys: string[]): Promise<void> {
    for (const key of screenKeys) await this.load({ kind: 'key', key })
  }

  /// Serve a keyed screen through the cache tiers, verifying on every path so a
  /// poisoned disk entry is caught and evicted. Render hit → disk hit (re-verify)
  /// → fetch (store + record last-good) → offline fallback to the last-good version.
  private async loadCached(screenKey: string, cache: MurteCache, coordinator: MurteCacheCoordinator): Promise<MurteNode> {
    const version = coordinator.version(screenKey) ?? 'unversioned'
    const key = await cacheKey(screenKey, version)

    const rendered = coordinator.renderCached(key)                                   // render tier
    if (rendered) return rendered

    const sealed = await cache.store.data(key)                                       // disk tier
    if (sealed) {
      const node = await this.materializeSealed(sealed, cache).catch(() => undefined) // re-verify
      if (node) {
        coordinator.storeRender(node, key)
        coordinator.markGood(screenKey, version)
        return node
      }
      await cache.store.remove(key)                                                  // tampered → evict
    }

    // Fetch. A TRANSPORT failure falls back to last-good (re-verified, fail-closed);
    // a verification/validation failure of fresh bytes surfaces instead of being masked.
    let raw: MurteData
    try {
      raw = await this.screenFactory.data(screenKey)
    } catch (error) {
      const good = coordinator.lastGoodVersion(screenKey)
      if (good !== undefined) {
        const goodKey = await cacheKey(screenKey, good)
        const goodSealed = await cache.store.data(goodKey)
        if (goodSealed) {
          const node = await this.materializeSealed(goodSealed, cache).catch(() => undefined)
          if (node) {
            coordinator.storeRender(node, goodKey)
            return node
          }
        }
      }
      throw error
    }
    const node = await this.materialize(raw)                  // fresh bytes verified + validated
    const sealedFresh = await Promise.resolve()
      .then(() => cache.cipher.seal(raw))
      .catch(() => undefined)
    if (sealedFresh) {                                        // persist + advertise last-good only if sealed
      await cache.store.store(sealedFresh, key)
      coordinator.markGood(screenKey, version)
    }
    coordinator.storeRender(node, key)
    return node
  }

  /// Open (decrypt if a cipher is configured) then verify + validate cached bytes.
  private async materializeSealed(sealed: Uint8Array, cache: MurteCache): Promise<MurteNode> {
    return this.materialize(await cache.cipher.open(sealed))   // decrypt (if any) then verify + validate
  }

  private async sourceData(source: ScreenSource): Promise<MurteData> {
    switch (source.kind) {
      case 'inline':
        return source.data
      case 'key':
        return this.screenFactory.data(source.key)
      case 'named':
        if (!this.namedResolver) throw MurteError.unknownScreen(source.name)
        return toBytes(await this.namedResolver(source.name))
    }
  }

  /// Verify (per policy) → decode → validate → screen root. Reused by fetch and cache.
  private async materialize(rawBytes: Uint8Array): Promise<MurteNode> {
    const payloadData = await this.unwrap(rawBytes)
    const payload = MurtePayload.fromJSON(payloadData)
    this.validator.validate(payload)
    return payload.screen.root
  }

  /// Verify/unwrap the raw bytes into the plaintext payload bytes, per policy.
  /// Verification happens here (on every load, including from cache) — not at
  /// download — so a poisoned cache is caught too.
  private async unwrap(bytes: Uint8Array): Promise<Uint8Array> {
    const envelope = tryEnvelope(bytes)
    switch (this.security.kind) {
      case 'insecureDevelopment':
        // Accept a bare payload, or an envelope whose signature is not checked.
        return envelope ? envelope.payload : bytes
      case 'signed':
        if (!envelope) throw MurteError.signatureInvalid()    // required-but-unsigned → reject
        if (!(await this.security.verifier.verify(envelope.payload, envelope.signature))) {
          throw MurteError.signatureInvalid()
        }
        return envelope.payload
    }
  }
}

function tryEnvelope(bytes: Uint8Array): MurteEnvelope | undefined {
  try {
    return MurteEnvelope.decode(parseJSON(bytes))
  } catch {
    return undefined
  }
}
