import { describe, expect, it } from 'vitest'
import {
  MurteActionSpec, MurteBounds, MurteError, MurteNode, MurtePayload, MurteScreenSpec, MurteSchemaValidator
} from '../../src/MurteCore'
import { fixture } from '../helpers'

const validator = new MurteSchemaValidator()
const payload = (name: string) => MurtePayload.fromJSON(fixture(name))
const rootPayload = (root: MurteNode) => new MurtePayload('1.0', new MurteScreenSpec('s', root))

function expectMurteError(run: () => void, kind?: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(MurteError)
    if (kind) expect((error as MurteError).kind).toBe(kind)
    return
  }
  throw new Error('expected a MurteError')
}

describe('MurteSchemaValidator', () => {
  it.each(['valid/dashboard.json', 'valid/login.json', 'valid/error_state.json', 'valid/third_party_lottie.json'])(
    'valid fixture %s passes validation', (name) => {
      validator.validate(payload(name))
    })

  // Schema conformance (decode-clean but invalid)

  it('navigate without screen is rejected', () => {
    const node = new MurteNode({ type: 'button', action: new MurteActionSpec({ type: 'navigate' }) })
    expectMurteError(() => validator.validate(rootPayload(node)), 'schema')
  })

  it('openURL with a raw URL is rejected', () => {
    const node = new MurteNode({ type: 'button', action: new MurteActionSpec({ type: 'openURL', link: 'https://evil.example.com' }) })
    expectMurteError(() => validator.validate(rootPayload(node)), 'schema')
  })

  it('bad schemaVersion is rejected', () => {
    const p = new MurtePayload('1', new MurteScreenSpec('s', new MurteNode({ type: 'text' })))
    expectMurteError(() => validator.validate(p), 'schema')
  })

  it('unsupported major version is rejected', () => {
    const p = new MurtePayload('2.0', new MurteScreenSpec('s', new MurteNode({ type: 'text' })))
    try {
      validator.validate(p)
      throw new Error('expected a throw')
    } catch (error) {
      expect((error as MurteError).equals(MurteError.unsupportedVersion('2.0'))).toBe(true)
    }
  })

  // Bounds (tailored small limits)

  it('string length bound', () => {
    const v = new MurteSchemaValidator({ bounds: new MurteBounds({ maxStringLength: 4 }) })
    expectMurteError(() => v.validateRoot(new MurteNode({ type: 'text', props: { value: 'toolong' } })), 'bounds')
  })

  it('tree depth bound', () => {
    const v = new MurteSchemaValidator({ bounds: new MurteBounds({ maxDepth: 3 }) })
    let node = new MurteNode({ type: 'text' })
    for (let i = 0; i < 4; i++) node = new MurteNode({ type: 'vstack', children: [node] })   // depth 5
    expectMurteError(() => v.validateRoot(node), 'bounds')
  })

  it('children count bound', () => {
    const v = new MurteSchemaValidator({ bounds: new MurteBounds({ maxChildren: 2 }) })
    const node = new MurteNode({ type: 'vstack', children: [0, 1, 2].map(() => new MurteNode({ type: 'text' })) })
    expectMurteError(() => v.validateRoot(node), 'bounds')
  })

  it('total node bound', () => {
    const v = new MurteSchemaValidator({ bounds: new MurteBounds({ maxNodes: 5 }) })
    const node = new MurteNode({ type: 'vstack', children: Array.from({ length: 6 }, () => new MurteNode({ type: 'text' })) })   // 7 nodes
    expectMurteError(() => v.validateRoot(node), 'bounds')
  })

  it('action chain depth bound', () => {
    const v = new MurteSchemaValidator({ bounds: new MurteBounds({ maxChainDepth: 2 }) })
    let action = new MurteActionSpec({ type: 'refresh' })
    for (let i = 0; i < 3; i++) action = new MurteActionSpec({ type: 'navigate', screen: 's', onSuccess: action })
    expectMurteError(() => v.validateRoot(new MurteNode({ type: 'button', action })), 'bounds')
  })

  it('array items bound', () => {
    const v = new MurteSchemaValidator({ bounds: new MurteBounds({ maxArrayItems: 2 }) })
    expectMurteError(() => v.validateRoot(new MurteNode({ type: 'text', props: { tags: [1, 2, 3] } })), 'bounds')
  })

  it('valid node within defaults passes', () => {
    validator.validateRoot(new MurteNode({
      type: 'vstack',
      props: { spacing: 12 },
      children: [new MurteNode({ type: 'text', props: { value: 'hi' } })]
    }))
  })
})
