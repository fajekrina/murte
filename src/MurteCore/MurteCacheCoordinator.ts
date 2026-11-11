import type { Manifest } from './Manifest'
import type { MurteNode } from './MurteNode'

/// Holds the cache's mutable session state (render cache, manifest, last-good
/// versions) so `MurteEngine` keeps no hidden state of its own.
export class MurteCacheCoordinator {
  private readonly renderCache = new Map<string, MurteNode>()
  private renderOrder: string[] = []            // LRU: most-recent last
  private manifestScreens: Record<string, string> = {}
  private manifestSequence = Number.MIN_SAFE_INTEGER
  private readonly lastGood = new Map<string, string>()

  constructor(private readonly renderLimit: number) {}

  // Render cache
  renderCached(key: string): MurteNode | undefined {
    const node = this.renderCache.get(key)
    if (!node) return undefined
    this.touch(key)
    return node
  }
  storeRender(node: MurteNode, key: string): void {
    this.renderCache.set(key, node)
    this.touch(key)
    while (this.renderOrder.length > this.renderLimit) {
      this.renderCache.delete(this.renderOrder.shift()!)
    }
  }
  purgeRenderCache(): void {
    this.renderCache.clear()
    this.renderOrder = []
  }
  private touch(key: string): void {
    this.renderOrder = this.renderOrder.filter((k) => k !== key)
    this.renderOrder.push(key)
  }

  // Manifest
  version(screenKey: string): string | undefined {
    return Object.prototype.hasOwnProperty.call(this.manifestScreens, screenKey) ? this.manifestScreens[screenKey] : undefined
  }
  apply(manifest: Manifest): boolean {
    if (manifest.sequence < this.manifestSequence) return false
    this.manifestScreens = { ...manifest.screens }
    this.manifestSequence = manifest.sequence
    return true
  }

  // Last-good (for offline fallback)
  lastGoodVersion(screenKey: string): string | undefined { return this.lastGood.get(screenKey) }
  markGood(screenKey: string, version: string): void { this.lastGood.set(screenKey, version) }
}
