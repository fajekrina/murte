import { toBytes, type BytesLike, type MurteData } from './MurteData'
import type { MurteError } from './MurteError'
import type { MurteNode } from './MurteNode'

/// Where a screen's JSON comes from.
export type ScreenSource =
  | { readonly kind: 'key'; readonly key: string }        // a `MurteScreenFactory` entry
  | { readonly kind: 'named'; readonly name: string }     // a remote, allow-listed source (host-resolved) — no raw URLs
  | { readonly kind: 'inline'; readonly data: MurteData } // previews / tests / hot-reload

export const ScreenSource = {
  key(key: string): ScreenSource { return { kind: 'key', key } },
  named(name: string): ScreenSource { return { kind: 'named', name } },
  inline(data: BytesLike): ScreenSource { return { kind: 'inline', data: toBytes(data) } },

  /// Stable identity string, so state never leaks between screens and a source
  /// change forces a fresh load.
  identity(source: ScreenSource): string {
    switch (source.kind) {
      case 'key': return `key:${source.key}`
      case 'named': return `named:${source.name}`
      case 'inline': return `inline:${source.data.length}:${fnv1a(source.data)}`
    }
  }
}

/// The load lifecycle for one screen. Fail-closed: never a blank screen or crash.
export type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly root: MurteNode }
  | { readonly kind: 'failed'; readonly error: MurteError }

export const LoadState = {
  loading: { kind: 'loading' } as LoadState,
  loaded(root: MurteNode): LoadState { return { kind: 'loaded', root } },
  failed(error: MurteError): LoadState { return { kind: 'failed', error } },
  equals(a: LoadState, b: LoadState): boolean {
    if (a.kind !== b.kind) return false
    if (a.kind === 'loaded' && b.kind === 'loaded') return a.root.equals(b.root)
    if (a.kind === 'failed' && b.kind === 'failed') return a.error.equals(b.error)
    return true
  }
}

function fnv1a(bytes: Uint8Array): string {
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}
