import { describe, expect, it } from 'vitest'
import { MurteEnvelope, MurtePayload } from '../../src/MurteCore'
import { fixture } from '../helpers'

/// Decodes the repository's shared `docs/fixtures/` through the TypeScript model,
/// so the JSON Schema, the example payloads, and the types can never silently
/// drift apart.
describe('Fixture decoding', () => {
  it.each(['dashboard.json', 'login.json', 'error_state.json', 'third_party_lottie.json'])(
    'valid payload fixture %s decodes into the model', (name) => {
      const payload = MurtePayload.fromJSON(fixture(`valid/${name}`))
      expect(payload.schemaVersion).toBe('1.0')
      expect(payload.screen.key).not.toBe('')
      expect(payload.screen.root.type).not.toBe('')
    })

  it('envelope decodes, and so does its inner payload', () => {
    const envelope = MurteEnvelope.fromJSON(fixture('valid/envelope.json'))
    expect(envelope.alg).toBe('ed25519')
    expect(envelope.payload.length).toBeGreaterThan(0)
    expect(MurtePayload.fromJSON(envelope.payload).screen.key).toBe('s')
  })

  it.each(['missing_type.json', 'action_unknown_type.json'])(
    'structurally invalid fixture %s is rejected at the decode layer', (name) => {
      expect(() => MurtePayload.fromJSON(fixture(`invalid/${name}`))).toThrow()
    })
})
