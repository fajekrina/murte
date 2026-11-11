import { MurteNode, MurteValue } from '../MurteCore'
import { find } from './NodeTree'
import { h } from './dom'
import type { EditorDocument } from './EditorDocument'

/// Edits the props of the selected node, plus move/delete. Each change rebuilds the
/// node and calls `document.replace`.
export function InspectorView(document: EditorDocument): HTMLElement {
  const body = h('div', { class: 'studio-form' })
  const view = h('section', { class: 'studio-column', 'aria-label': 'Inspector' },
    h('header', { class: 'studio-column-header' }, h('h2', {}, 'Inspector')),
    body
  )

  const setProp = (id: string, key: string, value: MurteValue) => {
    const node = find(document.root, id)
    if (!node) return
    document.replace(id, new MurteNode({ id: node.id, type: node.type, props: { ...node.props, [key]: value }, children: node.children, action: node.action }))
  }

  const textField = (id: string, label: string, key: string) => {
    const input = h('input', { type: 'text', value: find(document.root, id)?.string(key) ?? '' })
    input.addEventListener('change', () => setProp(id, key, input.value))
    return h('label', {}, h('span', {}, label), input)
  }
  const numberField = (id: string, label: string, key: string) => {
    const input = h('input', { type: 'number', value: String(find(document.root, id)?.double(key) ?? 0) })
    input.addEventListener('change', () => setProp(id, key, Number(input.value) || 0))
    return h('label', {}, h('span', {}, label), input)
  }
  const picker = (id: string, label: string, key: string, options: string[]) => {
    const current = find(document.root, id)?.string(key) ?? ''
    const select = h('select', {}, ...options.map((o) => h('option', { value: o, selected: o === current }, o)))
    select.addEventListener('change', () => setProp(id, key, select.value))
    return h('label', {}, h('span', {}, label), select)
  }

  const propertyFields = (node: MurteNode, id: string): HTMLElement[] => {
    switch (node.type) {
      case 'text': return [textField(id, 'Value', 'value'), picker(id, 'Style', 'style', ['body', 'title', 'headline', 'caption'])]
      case 'button': return [textField(id, 'Title', 'title')]
      case 'image': return [textField(id, 'System name', 'systemName'), textField(id, 'Name', 'name')]
      case 'vstack':
      case 'hstack': return [numberField(id, 'Spacing', 'spacing')]
      case 'card': return [numberField(id, 'Padding', 'padding')]
      default: return Object.keys(node.props).sort().map((key) => textField(id, key, key))
    }
  }

  const paint = () => {
    const id = document.selection
    const node = id ? find(document.root, id) : undefined
    if (!id || !node) {
      body.replaceChildren(h('p', { class: 'studio-empty' }, 'No selection'))
      return
    }
    body.replaceChildren(
      h('fieldset', {}, h('legend', {}, 'Node'), h('p', {}, h('span', { class: 'studio-label' }, 'Type '), node.type)),
      h('fieldset', {}, h('legend', {}, 'Properties'), ...propertyFields(node, id)),
      h('fieldset', { class: 'studio-actions' },
        h('button', { type: 'button', onclick: () => document.move(id, -1) }, 'Move up'),
        h('button', { type: 'button', onclick: () => document.move(id, 1) }, 'Move down'),
        h('button', { type: 'button', class: 'destructive', onclick: () => document.delete(id) }, 'Delete')
      )
    )
  }
  paint()
  document.subscribe(paint)
  return view
}
