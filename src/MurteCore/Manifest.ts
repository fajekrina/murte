import { MurteError } from './MurteError'
import { parseJSON } from './MurtePayload'
import type { BytesLike } from './MurteData'

/// The version index: which version of each screen is current. Fetched as a
/// signed payload; `sequence` is monotonic so an older manifest is rejected.
export class Manifest {
  constructor(readonly sequence: number, readonly screens: Record<string, string>) {}

  static decode(raw: unknown): Manifest {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw MurteError.decode('manifest: expected an object')
    const o = raw as Record<string, unknown>
    if (typeof o.sequence !== 'number' || !Number.isInteger(o.sequence)) throw MurteError.decode('manifest.sequence: expected an integer')
    if (typeof o.screens !== 'object' || o.screens === null || Array.isArray(o.screens)) throw MurteError.decode('manifest.screens: expected an object')
    const screens: Record<string, string> = {}
    for (const [key, value] of Object.entries(o.screens)) {
      if (typeof value !== 'string') throw MurteError.decode(`manifest.screens.${key}: expected a string`)
      screens[key] = value
    }
    return new Manifest(o.sequence, screens)
  }

  static fromJSON(bytes: BytesLike): Manifest {
    return Manifest.decode(parseJSON(bytes))
  }

  toJSON() { return { sequence: this.sequence, screens: this.screens } }
}
