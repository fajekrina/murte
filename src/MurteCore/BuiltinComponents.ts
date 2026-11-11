import type { MurteComponent } from './MurteComponent'
import type { MurteNode } from './MurteNode'
import type { MurteRenderContext } from './MurteRenderContext'
import { murteAccessibility } from './Accessibility'
import { murteColor, murteFontWeight, murteForegroundColor, murteStyle } from './MurteStyle'
import { MurteSymbols } from './MurteSymbols'

// The built-in set: text, image, vstack, hstack, zstack, button, card. Each is a
// tidy, single-type component — the template third-party components follow.
// Native DOM elements with inline styles: no stylesheet, no framework.

const el = <K extends keyof HTMLElementTagNameMap>(context: MurteRenderContext, tag: K): HTMLElementTagNameMap[K] =>
  context.document.createElement(tag)

/// The default stack spacing (SwiftUI's standard spacing between views).
const DEFAULT_SPACING = 8

// MARK: - text

export class TextComponent implements MurteComponent {
  static readonly type = 'text'
  makeView(node: MurteNode, context: MurteRenderContext): Node {
    const text = el(context, 'span')
    text.className = 'murte-text'
    text.textContent = context.resolve(node.string('value'))
    text.style.display = 'block'
    text.style.whiteSpace = 'pre-wrap'
    Object.assign(text.style, TextComponent.font(node))
    murteForegroundColor(text, node.string('color'))
    murteStyle(text, node)
    return murteAccessibility(text, node, context)
  }

  /// The font from `style`, with an optional explicit `size` and `weight`.
  static font(node: MurteNode): { fontSize: string; fontWeight: string; lineHeight: string } {
    const weight = murteFontWeight(node.string('weight'))
    const size = node.value('size')
    if (typeof size === 'number') {
      return { fontSize: `${size}px`, fontWeight: String(weight ?? 400), lineHeight: '1.2' }
    }
    const base = TextComponent.styleFont(node.string('style'))
    return { fontSize: `${base.size}px`, fontWeight: String(weight ?? base.weight), lineHeight: '1.3' }
  }

  /// The text styles, at the platform's default type sizes.
  static styleFont(style: string): { size: number; weight: number } {
    switch (style) {
      case 'title': return { size: 28, weight: 400 }
      case 'headline': return { size: 17, weight: 600 }
      case 'caption': return { size: 12, weight: 400 }
      default: return { size: 17, weight: 400 }
    }
  }
}

// MARK: - image

export interface ImageComponentOptions {
  /// Maps a bundled asset `name` to a URL. Default: the name itself, resolved
  /// relative to the document (so `name: "hero.png"` loads `./hero.png`).
  assetURL?: (name: string) => string
}

export class ImageComponent implements MurteComponent {
  static readonly type = 'image'
  private readonly assetURL: (name: string) => string

  constructor(options: ImageComponentOptions = {}) {
    this.assetURL = options.assetURL ?? ((name) => name)
  }

  makeView(node: MurteNode, context: MurteRenderContext): Node {
    // `systemName` renders a symbol glyph; `name` renders a bundled asset. A
    // named remote `source` (allow-listed, never a raw URL) is supplied by the
    // host, not fetched here.
    const systemName = node.string('systemName')
    if (systemName) {
      const wrap = el(context, 'span')
      wrap.className = 'murte-image murte-symbol'
      wrap.style.display = 'inline-flex'
      wrap.appendChild(MurteSymbols.make(systemName, context.document))
      murteStyle(wrap, node)
      return murteAccessibility(wrap, node, context)
    }
    const img = el(context, 'img')
    img.className = 'murte-image'
    img.src = this.assetURL(node.string('name'))
    img.alt = ''
    img.style.display = 'block'
    img.style.width = '100%'
    img.style.height = 'auto'
    img.style.objectFit = node.string('contentMode') === 'fill' ? 'cover' : 'contain'
    murteStyle(img, node)
    return murteAccessibility(img, node, context)
  }
}

// MARK: - vstack / hstack

export class VStackComponent implements MurteComponent {
  static readonly type = 'vstack'
  makeView(node: MurteNode, context: MurteRenderContext): Node {
    const stack = el(context, 'div')
    stack.className = 'murte-vstack'
    Object.assign(stack.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: horizontalAlignment(node.string('alignment')),
      gap: `${spacing(node)}px`
    })
    murteChildren(stack, node, context)
    murteStyle(stack, node)
    return murteAccessibility(stack, node, context)
  }
}

export class HStackComponent implements MurteComponent {
  static readonly type = 'hstack'
  makeView(node: MurteNode, context: MurteRenderContext): Node {
    const stack = el(context, 'div')
    stack.className = 'murte-hstack'
    Object.assign(stack.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: verticalAlignment(node.string('alignment')),
      gap: `${spacing(node)}px`
    })
    murteChildren(stack, node, context)
    murteStyle(stack, node)
    return murteAccessibility(stack, node, context)
  }
}

// MARK: - zstack

/// Overlays children. With a `width`/`height` (the source frame's size) and `x`/`y`/
/// `width`/`height` on each child, it places them at absolute positions and scales
/// the whole frame to the available width — reproducing a Figma frame that layers
/// content instead of flowing it. Without a frame size it's a plain centered overlay.
export class ZStackComponent implements MurteComponent {
  static readonly type = 'zstack'
  makeView(node: MurteNode, context: MurteRenderContext): Node {
    const width = (node.value('width') as number | undefined) ?? 0
    const height = (node.value('height') as number | undefined) ?? 0
    const outer = el(context, 'div')
    outer.className = 'murte-zstack'

    if (!(typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0)) {
      Object.assign(outer.style, { display: 'grid', placeItems: 'center' })
      for (const child of keyedChildren(node, context)) {
        if (isElement(child)) child.style.gridArea = '1 / 1'
        outer.appendChild(child)
      }
      murteStyle(outer, node)
      return murteAccessibility(outer, node, context)
    }

    Object.assign(outer.style, { position: 'relative', width: '100%', aspectRatio: `${width} / ${height}`, overflow: 'hidden' })
    const frame = el(context, 'div')
    Object.assign(frame.style, {
      position: 'absolute', left: '0', top: '0',
      width: `${width}px`, height: `${height}px`, transformOrigin: 'top left'
    })
    node.children.forEach((child, index) => {
      const box = childBox(child, width, height)
      const slot = el(context, 'div')
      Object.assign(slot.style, {
        position: 'absolute',
        left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      })
      slot.dataset.murteKey = child.id ?? String(index)
      slot.appendChild(context.view(child))
      frame.appendChild(slot)
    })
    outer.appendChild(frame)

    // Scale the whole frame to the available width (like `scaleEffect` from the
    // top-leading corner). Without ResizeObserver the frame renders at 1:1.
    const scaleToFit = () => {
      const available = outer.clientWidth
      if (available > 0) frame.style.transform = `scale(${available / width})`
    }
    const RO = (context.document.defaultView as (Window & typeof globalThis) | null)?.ResizeObserver
    if (RO) new RO(scaleToFit).observe(outer)

    murteStyle(outer, node)
    return murteAccessibility(outer, node, context)
  }
}

/// The absolute box of a `zstack` child, defaulting to the whole frame.
export function childBox(node: MurteNode, frameWidth: number, frameHeight: number): { x: number; y: number; width: number; height: number } {
  const num = (key: string) => {
    const v = node.value(key)
    return typeof v === 'number' ? v : undefined
  }
  return { x: num('x') ?? 0, y: num('y') ?? 0, width: num('width') ?? frameWidth, height: num('height') ?? frameHeight }
}

// MARK: - button

export class ButtonComponent implements MurteComponent {
  static readonly type = 'button'
  makeView(node: MurteNode, context: MurteRenderContext): Node {
    const button = el(context, 'button')
    button.type = 'button'
    button.className = 'murte-button'
    button.textContent = context.resolve(node.string('title'))
    Object.assign(button.style, {
      font: 'inherit', fontSize: '17px', color: '#007AFF',
      background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', textAlign: 'center'
    })
    button.addEventListener('click', () => {
      if (node.action) context.dispatch(node.action)
    })
    murteStyle(button, node)
    return murteAccessibility(button, node, context)
  }
}

// MARK: - card

export class CardComponent implements MurteComponent {
  static readonly type = 'card'
  makeView(node: MurteNode, context: MurteRenderContext): Node {
    // A card's grey box is the default; `background`, `cornerRadius`, `padding`,
    // and `foreground` props override it.
    const num = (key: string, fallback: number) => {
      const v = node.value(key)
      return typeof v === 'number' ? v : fallback
    }
    const card = el(context, 'div')
    card.className = 'murte-card'
    Object.assign(card.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
      padding: `${num('padding', 16)}px`,
      background: murteColor(node.string('background')) ?? 'rgba(120, 120, 128, 0.12)',
      borderRadius: `${num('cornerRadius', 12)}px`,
      overflow: 'hidden'
    })
    murteChildren(card, node, context)
    murteForegroundColor(card, node.string('foreground'))
    return murteAccessibility(card, node, context)
  }
}

// MARK: - Composite child rendering

/// Renders a node's children into a container, giving each a stable key from
/// `id ?? position`.
export function murteChildren(container: HTMLElement, node: MurteNode, context: MurteRenderContext): void {
  for (const child of keyedChildren(node, context)) container.appendChild(child)
}

function keyedChildren(node: MurteNode, context: MurteRenderContext): Node[] {
  return node.children.map((child, index) => {
    const view = context.view(child)
    if (isElement(view)) view.dataset.murteKey = child.id ?? String(index)
    return view
  })
}

/// An element node (HTML or SVG) — realm-independent, unlike `instanceof`.
function isElement(node: Node): node is HTMLElement {
  return node.nodeType === 1
}

// MARK: - Layout prop helpers

function spacing(node: MurteNode): number {
  const v = node.value('spacing')
  return typeof v === 'number' ? v : DEFAULT_SPACING
}

function horizontalAlignment(value: string): string {
  switch (value) {
    case 'leading': return 'flex-start'
    case 'trailing': return 'flex-end'
    default: return 'center'
  }
}

function verticalAlignment(value: string): string {
  switch (value) {
    case 'top': return 'flex-start'
    case 'bottom': return 'flex-end'
    default: return 'center'
  }
}
