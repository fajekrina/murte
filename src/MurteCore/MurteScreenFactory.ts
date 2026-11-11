import { MurteError } from './MurteError'
import { toBytes, type BytesLike, type MurteData } from './MurteData'

export type ScreenProvider = () => Promise<BytesLike> | BytesLike

/// The screen registry: a screen key → its JSON (Factory pattern). N screens =
/// N registrations, never a class per screen. Sources may be inline data, a
/// provider function, or a bundled `<key>.json` file served next to the app.
export class MurteScreenFactory {
  private readonly providers = new Map<string, ScreenProvider>()
  private readonly bundle?: string
  private readonly subdirectory?: string

  /// - bundle: optional fallback base URL for keys with no explicit provider
  ///   (the app's bundled screens, e.g. `/screens/` or `import.meta.url`).
  /// - subdirectory: optional subfolder inside the bundle (e.g. "Screens").
  constructor(init: { bundle?: string | URL; subdirectory?: string } = {}) {
    if (init.bundle !== undefined) this.bundle = String(init.bundle)
    if (init.subdirectory !== undefined) this.subdirectory = init.subdirectory
  }

  /// Register a key with inline data, or with a provider function.
  register(key: string, source: BytesLike | ScreenProvider): this {
    if (typeof source === 'function') {
      this.providers.set(key, source)
    } else {
      const data = toBytes(source)
      this.providers.set(key, () => data)
    }
    return this
  }

  /// The JSON for a key, or `MurteError.unknownScreen` if none resolves.
  async data(key: string): Promise<MurteData> {
    const provider = this.providers.get(key)
    if (provider) return toBytes(await provider())
    if (this.bundle !== undefined) {
      const base = this.bundle.endsWith('/') ? this.bundle : `${this.bundle}/`
      const path = this.subdirectory ? `${this.subdirectory.replace(/^\/|\/$/g, '')}/${key}.json` : `${key}.json`
      let response: Response
      try {
        response = await fetch(new URL(path, new URL(base, globalThis.location?.href ?? 'http://localhost/')))
      } catch {
        throw MurteError.network(null)
      }
      if (response.status === 404) throw MurteError.unknownScreen(key)
      if (!response.ok) throw MurteError.network(response.status)
      return new Uint8Array(await response.arrayBuffer())
    }
    throw MurteError.unknownScreen(key)
  }

  get registeredKeys(): string[] {
    return [...this.providers.keys()].sort()
  }
}
