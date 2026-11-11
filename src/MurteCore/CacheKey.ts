import { hex, utf8 } from './MurteData'

/// Storage-safe cache key = hex(SHA256("screenKey@version")).
export async function cacheKey(screenKey: string, version: string, subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<string> {
  const digest = await subtle.digest('SHA-256', new Uint8Array(utf8(`${screenKey}@${version}`)))
  return hex(new Uint8Array(digest))
}
