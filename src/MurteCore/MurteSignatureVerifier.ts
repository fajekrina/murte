/// Verifies a detached signature over payload bytes (Strategy). The server signs
/// with its PRIVATE key; the app verifies with the EMBEDDED PUBLIC key, and
/// rejects on mismatch. Signing lives server-side and is intentionally NOT part
/// of the client framework.
export interface MurteSignatureVerifier {
  verify(payload: Uint8Array, signature: Uint8Array): Promise<boolean> | boolean
}

/// Ed25519 verifier (WebCrypto) — the schema's default `alg`. The public key is
/// imported (and so validated) once, in `create`.
export class Ed25519Verifier implements MurteSignatureVerifier {
  private constructor(private readonly key: CryptoKey, private readonly subtle: SubtleCrypto) {}

  /// - publicKey: the 32-byte Ed25519 public key (raw representation), embedded
  ///   in the app. Throws when the key is not a valid Ed25519 public key.
  static async create(publicKey: Uint8Array, subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<Ed25519Verifier> {
    if (publicKey.length !== 32) throw new TypeError('Ed25519 public key must be 32 bytes')
    const key = await subtle.importKey('raw', new Uint8Array(publicKey), { name: 'Ed25519' }, false, ['verify'])
    return new Ed25519Verifier(key, subtle)
  }

  async verify(payload: Uint8Array, signature: Uint8Array): Promise<boolean> {
    try {
      return await this.subtle.verify({ name: 'Ed25519' }, this.key, new Uint8Array(signature), new Uint8Array(payload))
    } catch {
      return false
    }
  }
}

/// The crypto toggle. Development accepts unsigned payloads; production requires a
/// verified signature.
export type PayloadSecurity =
  /// DEVELOPMENT ONLY — accept a bare payload, or an envelope whose signature is
  /// NOT checked. Never ship this to production.
  | { readonly kind: 'insecureDevelopment' }
  /// Production — require a signed envelope and verify it before trusting.
  | { readonly kind: 'signed'; readonly verifier: MurteSignatureVerifier }

export const PayloadSecurity = {
  insecureDevelopment: { kind: 'insecureDevelopment' } as PayloadSecurity,
  signed(verifier: MurteSignatureVerifier): PayloadSecurity { return { kind: 'signed', verifier } }
}
