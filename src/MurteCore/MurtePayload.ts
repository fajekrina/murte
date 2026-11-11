import { MurteError } from './MurteError'
import { MurteNode } from './MurteNode'
import { base64Decode, base64Encode, utf8String, type BytesLike, type MurteData } from './MurteData'

/// Parse JSON bytes (or text) into a plain value, mapping any failure to
/// `MurteError.decode`.
export function parseJSON(bytes: BytesLike): unknown {
  let text: string
  try {
    text = utf8String(bytes)
  } catch {
    throw MurteError.decode('data is not valid UTF-8')
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    throw MurteError.decode(`invalid JSON: ${(e as Error).message}`)
  }
}

const asObject = (raw: unknown, path: string): Record<string, unknown> => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw MurteError.decode(`${path}: expected an object`)
  return raw as Record<string, unknown>
}
const requireString = (o: Record<string, unknown>, key: string, path: string): string => {
  if (typeof o[key] !== 'string') throw MurteError.decode(`${path}.${key}: required string is missing`)
  return o[key] as string
}

/// A named screen and its root node. `key` must resolve in the screen factory —
/// a semantic check, not a decode concern.
export class MurteScreenSpec {
  constructor(readonly key: string, readonly root: MurteNode) {}

  static decode(raw: unknown, path = 'screen'): MurteScreenSpec {
    const o = asObject(raw, path)
    if (o.root === undefined) throw MurteError.decode(`${path}.root: required node is missing`)
    return new MurteScreenSpec(requireString(o, 'key', path), MurteNode.decode(o.root, `${path}.root`))
  }

  toJSON() { return { key: this.key, root: this.root.toJSON() } }
}

/// The plaintext screen tree — the payload inside the envelope, or posted
/// directly during development.
export class MurtePayload {
  constructor(readonly schemaVersion: string, readonly screen: MurteScreenSpec) {}

  static decode(raw: unknown): MurtePayload {
    const o = asObject(raw, 'payload')
    if (o.screen === undefined) throw MurteError.decode('payload.screen: required object is missing')
    return new MurtePayload(requireString(o, 'schemaVersion', 'payload'), MurteScreenSpec.decode(o.screen))
  }

  static fromJSON(bytes: BytesLike): MurtePayload {
    return MurtePayload.decode(parseJSON(bytes))
  }

  toJSON() { return { schemaVersion: this.schemaVersion, screen: this.screen.toJSON() } }

  equals(other: MurtePayload | undefined): boolean {
    return !!other && other.schemaVersion === this.schemaVersion && other.screen.key === this.screen.key && other.screen.root.equals(this.screen.root)
  }
}

/// The production transport wrapper. The client verifies the signature (and
/// optionally decrypts) BEFORE trusting the payload. This type only models the
/// envelope shape; verification/decryption is the crypto layer's job.
///
/// `payload` and `signature` travel as base64 strings and decode to bytes.
export class MurteEnvelope {
  readonly enc?: string

  constructor(
    readonly schemaVersion: string,
    readonly alg: string,
    readonly payload: MurteData,
    readonly signature: MurteData,
    enc?: string
  ) {
    if (enc !== undefined) this.enc = enc
  }

  static decode(raw: unknown): MurteEnvelope {
    const o = asObject(raw, 'envelope')
    const schemaVersion = requireString(o, 'schemaVersion', 'envelope')
    const alg = requireString(o, 'alg', 'envelope')
    const payload = base64Decode(requireString(o, 'payload', 'envelope'))
    const signature = base64Decode(requireString(o, 'signature', 'envelope'))
    if (!payload) throw MurteError.decode('envelope.payload: not base64')
    if (!signature) throw MurteError.decode('envelope.signature: not base64')
    if (o.enc != null && typeof o.enc !== 'string') throw MurteError.decode('envelope.enc: expected a string')
    return new MurteEnvelope(schemaVersion, alg, payload, signature, (o.enc as string | null) ?? undefined)
  }

  static fromJSON(bytes: BytesLike): MurteEnvelope {
    return MurteEnvelope.decode(parseJSON(bytes))
  }

  toJSON(): Record<string, string> {
    const out: Record<string, string> = {
      schemaVersion: this.schemaVersion,
      alg: this.alg,
      payload: base64Encode(this.payload),
      signature: base64Encode(this.signature)
    }
    if (this.enc !== undefined) out.enc = this.enc
    return out
  }
}
