import type { MurteNode } from '../MurteCore'
import { editorID, outlineChildren, outlineLabel } from './NodeIdentity'
import { PaletteView } from './PaletteView'
import { h } from './dom'
import type { EditorDocument } from './EditorDocument'

/// The node tree as a selectable, nestable outline.
export function OutlineView(document: EditorDocument, paletteTypes?: string[]): HTMLElement {
  const list = h('ul', { role: 'tree', class: 'studio-outline' })
  const view = h('section', { class: 'studio-column', 'aria-label': 'Outline' },
    h('header', { class: 'studio-column-header' }, h('h2', {}, 'Outline'), PaletteView(document, paletteTypes)),
    list
  )

  const row = (node: MurteNode, level: number): HTMLElement => {
    const id = editorID(node)
    const selected = document.selection === id
    const item = h('li', { role: 'treeitem', 'aria-selected': String(selected), 'aria-level': String(level) },
      h('button', {
        type: 'button',
        class: selected ? 'studio-row selected' : 'studio-row',
        style: `padding-left:${8 + (level - 1) * 14}px`,
        onclick: () => { document.selection = id }
      }, outlineLabel(node))
    )
    const kids = outlineChildren(node)
    if (kids) item.append(h('ul', { role: 'group' }, ...kids.map((c) => row(c, level + 1))))
    return item
  }

  const paint = () => list.replaceChildren(row(document.root, 1))
  paint()
  document.subscribe(paint)
  return view
}
