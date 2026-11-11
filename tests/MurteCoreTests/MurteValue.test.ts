import { describe, expect, it } from 'vitest'
import { MurteValue, parseJSON, sortedJSONStringify, type MurteProps } from '../../src/MurteCore'

describe('MurteValue', () => {
  it('decodes each JSON kind', () => {
    const dict = MurteValue.decodeObject(parseJSON(`{ "s": "hi", "n": 12, "f": 1.5, "b": true, "z": null,
      "a": [1, "two", false], "o": { "k": "v" } }`))
    expect(dict.s).toBe('hi')
    expect(dict.n).toBe(12)
    expect(dict.f).toBe(1.5)
    expect(dict.b).toBe(true)
    expect(dict.z).toBeNull()
    expect(dict.a).toEqual([1, 'two', false])
    expect(dict.o).toEqual({ k: 'v' })
  })

  it('typed accessors', () => {
    expect(MurteValue.stringValue('x')).toBe('x')
    expect(MurteValue.intValue(3)).toBe(3)
    expect(MurteValue.intValue(3.9)).toBe(3)
    expect(MurteValue.boolValue(true)).toBe(true)
    expect(MurteValue.intValue('x')).toBeUndefined()
  })

  it('displayString for interpolation', () => {
    expect(MurteValue.displayString(12)).toBe('12')
    expect(MurteValue.displayString(1.5)).toBe('1.5')
    expect(MurteValue.displayString('hi')).toBe('hi')
    expect(MurteValue.displayString(false)).toBe('false')
    expect(MurteValue.displayString(null)).toBe('')
  })

  it('round-trips through JSON', () => {
    const value: MurteValue = { a: [1, 'two'], b: true, c: null }
    expect(MurteValue.equals(MurteValue.decode(parseJSON(sortedJSONStringify(value))), value)).toBe(true)
  })

  it('rejects values outside the closed space', () => {
    expect(() => MurteValue.decode(undefined)).toThrow()
    expect(() => MurteValue.decode(Number.NaN)).toThrow()
    expect(() => MurteValue.decode(() => 1)).toThrow()
  })
})

describe('MurteValue literals', () => {
  it('scalar and collection literals are MurteValues', () => {
    const values: MurteValue[] = ['hi', 4, 1.5, true, [1, 2], { a: 1 }]
    expect(values).toHaveLength(6)
  })

  it('props bag uses literals', () => {
    const props: MurteProps = { stars: 4, label: 'x', on: true }
    expect(props.stars).toBe(4)
    expect(props.label).toBe('x')
    expect(props.on).toBe(true)
  })
})
