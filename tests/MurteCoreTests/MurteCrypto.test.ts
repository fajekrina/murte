// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  Ed25519Verifier, LoadState, MurteComponentFactory, MurteEngine, MurteError, MurteScreenFactory, PayloadSecurity,
  ScreenSource, concatBytes, utf8
} from '../../src/MurteCore'
import { envelopeJSON, signingKey } from '../helpers'

const payloadJSON = utf8('{"schemaVersion":"1.0","screen":{"key":"s","root":{"type":"text"}}}')
const engine = (security: PayloadSecurity) =>
  new MurteEngine({ componentFactory: MurteComponentFactory.withBuiltins, screenFactory: new MurteScreenFactory(), security })

describe('Signature verification & PayloadSecurity', () => {
  // Verifier unit

  it('accepts a valid signature', async () => {
    const key = await signingKey()
    const verifier = await Ed25519Verifier.create(key.publicKey)
    expect(await verifier.verify(payloadJSON, await key.sign(payloadJSON))).toBe(true)
  })

  it('rejects a tampered payload', async () => {
    const key = await signingKey()
    const verifier = await Ed25519Verifier.create(key.publicKey)
    const signature = await key.sign(payloadJSON)
    expect(await verifier.verify(concatBytes(payloadJSON, utf8(' ')), signature)).toBe(false)
  })

  it('rejects a signature from the wrong key', async () => {
    const signer = await signingKey()
    const attacker = await signingKey()
    const verifier = await Ed25519Verifier.create(attacker.publicKey)
    expect(await verifier.verify(payloadJSON, await signer.sign(payloadJSON))).toBe(false)
  })

  it('rejects an invalid public key at creation', async () => {
    await expect(Ed25519Verifier.create(new Uint8Array(5))).rejects.toThrow()
  })

  // Engine, signed policy

  it('signed policy loads a valid envelope', async () => {
    const key = await signingKey()
    const verifier = await Ed25519Verifier.create(key.publicKey)
    const data = envelopeJSON(payloadJSON, await key.sign(payloadJSON))
    const state = await engine(PayloadSecurity.signed(verifier)).load(ScreenSource.inline(data))
    expect(state.kind === 'loaded' && state.root.type).toBe('text')
  })

  it('signed policy rejects a forged payload', async () => {
    const key = await signingKey()
    const verifier = await Ed25519Verifier.create(key.publicKey)
    // Sign the real payload, then ship a different one under that signature.
    const signature = await key.sign(payloadJSON)
    const forged = utf8('{"schemaVersion":"1.0","screen":{"key":"s","root":{"type":"button","props":{"title":"HACKED"}}}}')
    const state = await engine(PayloadSecurity.signed(verifier)).load(ScreenSource.inline(envelopeJSON(forged, signature)))
    expect(LoadState.equals(state, LoadState.failed(MurteError.signatureInvalid()))).toBe(true)
  })

  it('signed policy rejects an unsigned payload', async () => {
    const key = await signingKey()
    const verifier = await Ed25519Verifier.create(key.publicKey)
    const state = await engine(PayloadSecurity.signed(verifier)).load(ScreenSource.inline(payloadJSON))
    expect(LoadState.equals(state, LoadState.failed(MurteError.signatureInvalid()))).toBe(true)
  })

  // Engine, insecureDevelopment policy (the dev toggle)

  it('development accepts a bare payload', async () => {
    expect((await engine(PayloadSecurity.insecureDevelopment).load(ScreenSource.inline(payloadJSON))).kind).toBe('loaded')
  })

  it('development accepts an envelope without verifying', async () => {
    const data = envelopeJSON(payloadJSON, utf8('bogus'))
    expect((await engine(PayloadSecurity.insecureDevelopment).load(ScreenSource.inline(data))).kind).toBe('loaded')
  })
})
