import type { MurteNode } from './MurteNode'

// The bounded style layer: a small, closed set of visual props the built-in
// components read, on top of their structural props. A color is a hex string, a
// font weight is a known name, a radius/size is a number — validated at render
// time, and simply ignored when unrecognized (render-what-you-can). This is not
// arbitrary CSS: the value space stays closed.

/// Straight RGBA components in 0...1, parsed from a hex string. Kept separate from
/// the CSS string so the parsing is unit-testable without a DOM.
export interface MurteRGBA {
  red: number
  green: number
  blue: number
  alpha: number
}

/// Parse `#RGB`, `#RRGGBB`, or `#RRGGBBAA` (the leading `#` is optional). Returns
/// `undefined` for anything else, so an unrecognized value leaves styling untouched.
export function murteParseHexColor(hex: string): MurteRGBA | undefined {
  let s = hex.replace(/^[\t\p{Zs}]+|[\t\p{Zs}]+$/gu, '')
  if (s.startsWith('#')) s = s.slice(1)
  if (s.length === 0 || !/^[0-9A-Fa-f]+$/.test(s)) return undefined

  const channel = (value: number, shift: number) => ((value >>> shift) & 0xff) / 255

  switch (s.length) {
    case 3: {
      const n = parseInt([...s].map((c) => c + c).join(''), 16)
      return { red: channel(n, 16), green: channel(n, 8), blue: channel(n, 0), alpha: 1 }
    }
    case 6: {
      const n = parseInt(s, 16)
      return { red: channel(n, 16), green: channel(n, 8), blue: channel(n, 0), alpha: 1 }
    }
    case 8: {
      const n = parseInt(s, 16)
      return { red: channel(n, 24), green: channel(n, 16), blue: channel(n, 8), alpha: channel(n, 0) }
    }
    default:
      return undefined
  }
}

/// A CSS color from a Murte hex string, or `undefined` when the string isn't a hex color.
export function murteColor(hex: string): string | undefined {
  const c = murteParseHexColor(hex)
  if (!c) return undefined
  const to255 = (v: number) => Math.round(v * 255)
  return `rgba(${to255(c.red)}, ${to255(c.green)}, ${to255(c.blue)}, ${+c.alpha.toFixed(4)})`
}

/// A known font weight name, as a CSS `font-weight`, or `undefined`.
export function murteFontWeight(name: string): number | undefined {
  switch (name) {
    case 'ultralight': return 100
    case 'thin': return 200
    case 'light': return 300
    case 'regular': return 400
    case 'medium': return 500
    case 'semibold': return 600
    case 'bold': return 700
    case 'heavy': return 800
    case 'black': return 900
    default: return undefined
  }
}

/// Apply the shared container style props (`padding`, `background`,
/// `cornerRadius`, `foreground`) from a node. Each is applied only when present,
/// so a node without them renders exactly as before.
export function murteStyle<E extends HTMLElement>(element: E, node: MurteNode): E {
  const padding = node.value('padding')
  if (typeof padding === 'number') element.style.padding = `${padding}px`
  const background = murteColor(node.string('background'))
  if (background) element.style.background = background
  const radius = node.value('cornerRadius')
  if (typeof radius === 'number') {
    element.style.borderRadius = `${radius}px`
    element.style.overflow = 'hidden'
  }
  const foreground = murteColor(node.string('foreground'))
  if (foreground) element.style.color = foreground
  return element
}

/// Sets the foreground color from a hex prop, leaving it untouched when absent or
/// unrecognized. Used by `text` (its `color` prop) and `card` (its `foreground`).
export function murteForegroundColor<E extends HTMLElement>(element: E, hex: string): E {
  const color = murteColor(hex)
  if (color) element.style.color = color
  return element
}
