import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MurteEnvelope, sortedJSONStringify, utf8, type MurteData } from '../src/MurteCore'

/// Bytes of a shared fixture under `docs/fixtures/` (relative path, e.g. `valid/dashboard.json`).
export function fixture(relativePath: string): MurteData {
  return new Uint8Array(readFileSync(resolve(ROOT, 'docs/fixtures', relativePath)))
}

/// The package root (vitest runs from it).
export const ROOT = process.cwd()

export interface SigningKey {
  publicKey: Uint8Array
  sign(data: Uint8Array): Promise<Uint8Array>
}

/// A fresh Ed25519 key pair (the test-side signer; signing is server-side in production).
export async function signingKey(): Promise<SigningKey> {
  const subtle = globalThis.crypto.subtle
  const pair = (await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const publicKey = new Uint8Array(await subtle.exportKey('raw', pair.publicKey))
  return {
    publicKey,
    sign: async (data) => new Uint8Array(await subtle.sign({ name: 'Ed25519' }, pair.privateKey, new Uint8Array(data)))
  }
}

export function envelopeJSON(payload: Uint8Array, signature: Uint8Array): MurteData {
  return utf8(sortedJSONStringify(new MurteEnvelope('1.0', 'ed25519', payload, signature)))
}

/// Counts provider calls (the `FetchCounter` actor in the Swift suite).
export class FetchCounter {
  count = 0
  bump() { this.count += 1 }
}
