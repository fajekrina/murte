import { MurteError } from './MurteError'

/// A decoded JSON value — the closed value space that crosses the Murte JSON
/// boundary.
///
/// Keeping the value space closed (no `undefined`, functions, class instances)
/// is what makes bounds-checking and sanitization tractable.
export type MurteValue =
  | string
  | number
  | boolean
  | null
  | MurteValue[]
  | { [key: string]: MurteValue }

/// A component's props bag.
export type MurteProps = Record<string, MurteValue>

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// MARK: - Typed access

export const MurteValue = {
  stringValue(v: MurteValue | undefined): string | undefined {
    return typeof v === 'string' ? v : undefined
  },
  doubleValue(v: MurteValue | undefined): number | undefined {
    return typeof v === 'number' ? v : undefined
  },
  intValue(v: MurteValue | undefined): number | undefined {
    return typeof v === 'number' ? Math.trunc(v) : undefined
  },
  boolValue(v: MurteValue | undefined): boolean | undefined {
    return typeof v === 'boolean' ? v : undefined
  },
  arrayValue(v: MurteValue | undefined): MurteValue[] | undefined {
    return Array.isArray(v) ? v : undefined
  },
  objectValue(v: MurteValue | undefined): Record<string, MurteValue> | undefined {
    return isPlainObject(v) ? (v as Record<string, MurteValue>) : undefined
  },

  /// How the value renders when interpolated into a `{{token}}`. Scalars only;
  /// arrays/objects/null interpolate to an empty string.
  displayString(v: MurteValue | undefined): string {
    if (typeof v === 'string') return v
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    if (typeof v === 'number') {
      if (Math.round(v) === v && Math.abs(v) < 1e15) return String(Math.trunc(v))
      return String(v)
    }
    return ''
  },

  /// Structural decode of an already-parsed JSON value. Rejects anything outside
  /// the closed value space (e.g. `undefined`, non-finite numbers, functions).
  decode(raw: unknown, path = 'value'): MurteValue {
    if (raw === null) return null
    switch (typeof raw) {
      case 'string':
      case 'boolean':
        return raw
      case 'number':
        if (!Number.isFinite(raw)) throw MurteError.decode(`${path}: non-finite number`)
        return raw
      case 'object':
        if (Array.isArray(raw)) return raw.map((item, i) => MurteValue.decode(item, `${path}[${i}]`))
        if (isPlainObject(raw)) return MurteValue.decodeObject(raw, path)
    }
    throw MurteError.decode(`${path}: unsupported JSON value for MurteValue`)
  },

  decodeObject(raw: unknown, path = 'value'): Record<string, MurteValue> {
    if (!isPlainObject(raw)) throw MurteError.decode(`${path}: expected an object`)
    const out: Record<string, MurteValue> = {}
    for (const [key, value] of Object.entries(raw)) out[key] = MurteValue.decode(value, `${path}.${key}`)
    return out
  },

  /// Deep structural equality.
  equals(a: MurteValue | undefined, b: MurteValue | undefined): boolean {
    if (a === b) return true
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, i) => MurteValue.equals(item, b[i]))
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const ka = Object.keys(a)
      const kb = Object.keys(b)
      return ka.length === kb.length && ka.every((k) => k in b && MurteValue.equals(a[k] as MurteValue, b[k] as MurteValue))
    }
    return false
  }
}
