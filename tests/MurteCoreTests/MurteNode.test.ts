import { describe, expect, it } from 'vitest'
import { MurteActionSpec, MurteNode, parseJSON, sortedJSONStringify } from '../../src/MurteCore'

describe('MurteNode', () => {
  it('decodes type, props, children, action', () => {
    const node = MurteNode.decode(parseJSON(`{ "type": "vstack", "props": { "spacing": 12 },
      "children": [ { "type": "text", "props": { "value": "hi" } } ],
      "action": { "type": "refresh" } }`))
    expect(node.type).toBe('vstack')
    expect(node.int('spacing')).toBe(12)
    expect(node.children).toHaveLength(1)
    expect(node.children[0]!.string('value')).toBe('hi')
    expect(node.action?.type).toBe('refresh')
    expect(node.id).toBeUndefined()
  })

  it('id is preserved when present', () => {
    expect(MurteNode.decode(parseJSON('{ "id": "n1", "type": "text" }')).id).toBe('n1')
  })

  it('missing type is rejected at the structural layer', () => {
    expect(() => MurteNode.decode(parseJSON('{ "props": {} }'))).toThrow()
  })

  it('defaulting accessors never throw on missing props', () => {
    const node = new MurteNode({ type: 'text' })
    expect(node.string('missing')).toBe('')
    expect(node.int('missing')).toBe(0)
    expect(node.bool('missing')).toBe(false)
    expect(node.array('missing')).toEqual([])
  })

  it('round-trips through JSON', () => {
    const node = new MurteNode({
      type: 'button',
      props: { title: 'Go' },
      action: new MurteActionSpec({ type: 'navigate', screen: 'next' })
    })
    expect(MurteNode.decode(parseJSON(sortedJSONStringify(node))).equals(node)).toBe(true)
  })
})
