import { describe, expect, it } from 'vitest'
import { ActionType, MurteActionSpec, parseJSON, sortedJSONStringify } from '../../src/MurteCore'

describe('MurteActionSpec', () => {
  it('navigate carries screen + params', () => {
    const action = MurteActionSpec.decode(parseJSON(`{ "type": "navigate", "screen": "productDetail",
      "params": { "productId": "abc123" } }`))
    expect(action.type).toBe('navigate')
    expect(action.screen).toBe('productDetail')
    expect(action.params?.productId).toBe('abc123')
    expect(action.onSuccess).toBeUndefined()
  })

  it('api carries a linear onSuccess chain', () => {
    const action = MurteActionSpec.decode(parseJSON(`{ "type": "api", "request": "getAccountBalance",
      "onSuccess": { "type": "navigate", "screen": "balanceDetail" } }`))
    expect(action.type).toBe('api')
    expect(action.request).toBe('getAccountBalance')
    expect(action.onSuccess?.type).toBe('navigate')
    expect(action.onSuccess?.screen).toBe('balanceDetail')
  })

  it('unknown action type is rejected (closed vocabulary)', () => {
    expect(() => MurteActionSpec.decode(parseJSON('{ "type": "eval" }'))).toThrow()
  })

  it('the action vocabulary has exactly five members', () => {
    expect(ActionType.allCases).toHaveLength(5)
  })

  it('round-trips through JSON preserving the chain', () => {
    const action = new MurteActionSpec({
      type: 'api', request: 'r',
      onSuccess: new MurteActionSpec({ type: 'navigate', screen: 'next' })
    })
    const back = MurteActionSpec.decode(parseJSON(sortedJSONStringify(action)))
    expect(back.equals(action)).toBe(true)
    expect(back.onSuccess?.screen).toBe('next')
  })
})
