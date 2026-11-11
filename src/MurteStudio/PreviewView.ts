import { DataContext, MurteComponentFactory, MurteRenderer } from '../MurteCore'
import { h } from './dom'
import type { EditorDocument } from './EditorDocument'

/// Renders the current tree with the real renderer, so the editor shows exactly
/// what the framework would render. Consumer screens pass their component
/// factory (custom types included); the default is the built-in set.
export function PreviewView(
  document: EditorDocument,
  factory: MurteComponentFactory = MurteComponentFactory.withBuiltins
): HTMLElement {
  const renderer = new MurteRenderer(factory)
  const canvas = h('div', { class: 'studio-preview' })
  const view = h('section', { class: 'studio-column studio-center', 'aria-label': 'Preview' },
    h('header', { class: 'studio-column-header' }, h('h2', {}, 'Preview')),
    canvas
  )
  const paint = () => canvas.replaceChildren(renderer.render(document.root, new DataContext()))
  paint()
  document.subscribe(paint)
  return view
}
