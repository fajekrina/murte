import { MurteNode } from '../MurteCore'
import { find } from './NodeTree'
import { editorID } from './NodeIdentity'
import { h } from './dom'
import type { EditorDocument } from './EditorDocument'

const DEFAULT_TYPES = ['text', 'vstack', 'hstack', 'button', 'image', 'card']
const CONTAINERS = ['vstack', 'hstack', 'card']

/// An "Add" menu that inserts a new component into the selected container (or the
/// root when the selection isn't a container). Consumer screens pass their own
/// palette (e.g. plus custom registered types); the default is the built-in set.
export function PaletteView(document: EditorDocument, types: string[] = DEFAULT_TYPES): HTMLElement {
  const insertionParent = (): string => {
    const id = document.selection
    const node = id ? find(document.root, id) : undefined
    if (id && node && CONTAINERS.includes(node.type)) return id
    return editorID(document.root)
  }
  const select = h('select', {
    'aria-label': 'Add',
    class: 'studio-palette',
    onchange: () => {
      if (select.value) document.insert(new MurteNode({ type: select.value }), insertionParent())
      select.value = ''
    }
  }, h('option', { value: '' }, '+ Add'), ...types.map((type) => h('option', { value: type }, type)))
  return select
}
