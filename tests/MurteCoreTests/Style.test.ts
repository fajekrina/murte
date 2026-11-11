import { describe, expect, it } from 'vitest'
import { MurteComponentFactory, MurteNode, MurteRenderer, murteColor, murteFontWeight, murteParseHexColor } from '../../src/MurteCore'

describe('Bounded style props', () => {
  it('parses six-digit hex', () => {
    const c = murteParseHexColor('#FF8000')!
    expect(c.red).toBeCloseTo(1, 9)
    expect(c.green).toBeCloseTo(0x80 / 255, 9)
    expect(c.blue).toBeCloseTo(0, 9)
    expect(c.alpha).toBe(1)
  })

  it('parses shorthand, alpha, and bare hex', () => {
    expect(murteParseHexColor('#FFF')).toEqual({ red: 1, green: 1, blue: 1, alpha: 1 })
    expect(murteParseHexColor('00FF00')).toEqual({ red: 0, green: 1, blue: 0, alpha: 1 })
    expect(murteParseHexColor('#00000080')!.alpha).toBeCloseTo(0x80 / 255, 9)
  })

  it('rejects non-hex', () => {
    expect(murteParseHexColor('')).toBeUndefined()
    expect(murteParseHexColor('nope')).toBeUndefined()
    expect(murteParseHexColor('#12345')).toBeUndefined()   // 5 digits isn't a valid length
    expect(murteColor('rgb(1,2,3)')).toBeUndefined()
  })

  it('known font weights resolve', () => {
    expect(murteFontWeight('bold')).toBe(700)
    expect(murteFontWeight('semibold')).toBe(600)
    expect(murteFontWeight('nope')).toBeUndefined()
  })

  it('styled nodes render without crashing', () => {
    const node = new MurteNode({
      type: 'card',
      props: { background: '#EB6D00', cornerRadius: 16, padding: 20, foreground: '#FFFFFF' },
      children: [new MurteNode({ type: 'text', props: { value: 'Balance', color: '#FFFFFF', weight: 'bold', size: 28 } })]
    })
    const card = new MurteRenderer(MurteComponentFactory.withBuiltins).render(node) as HTMLElement
    expect(card.style.padding).toBe('20px')
    expect(card.style.borderRadius).toBe('16px')
    const text = card.firstElementChild as HTMLElement
    expect(text.style.fontSize).toBe('28px')
    expect(text.style.fontWeight).toBe('700')
  })
})
