import { MurteError } from './MurteError'
import { concatBytes } from './MurteData'
import type { MurteCacheCipher } from './MurteCacheCipher'

const NONCE_LENGTH = 12

/// Opt-in AES-GCM encryption for cached bytes. The adopter owns the key (create
/// it non-extractable and keep it in IndexedDB, or derive it per session) and
/// passes it in. Output is the combined form `nonce ‖ ciphertext ‖ tag`.
export class AESGCMCipher implements MurteCacheCipher {
  constructor(private readonly key: CryptoKey, private readonly subtle: SubtleCrypto = globalThis.crypto.subtle) {}

  /// A fresh 256-bit AES-GCM key (non-extractable).
  static generateKey(subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<CryptoKey> {
    return subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) as Promise<CryptoKey>
  }

  async seal(plaintext: Uint8Array): Promise<Uint8Array> {
    try {
      const nonce = globalThis.crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))
      const sealed = await this.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, this.key, new Uint8Array(plaintext))
      return concatBytes(nonce, new Uint8Array(sealed))
    } catch {
      throw MurteError.decryptionFailed()
    }
  }

  async open(ciphertext: Uint8Array): Promise<Uint8Array> {
    try {
      if (ciphertext.length < NONCE_LENGTH + 16) throw new Error('too short')
      const nonce = ciphertext.slice(0, NONCE_LENGTH)
      const body = ciphertext.slice(NONCE_LENGTH)
      return new Uint8Array(await this.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, this.key, body))
    } catch {
      throw MurteError.decryptionFailed()
    }
  }
}
