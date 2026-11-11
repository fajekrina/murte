import type { MurteNode } from '../MurteCore'

/// Non-optional id for list identity. The editing tree always has ids.
export function editorID(node: MurteNode): string {
  return node.id ?? ''
}

/// Children for the outline — undefined for leaves so no empty disclosure shows.
export function outlineChildren(node: MurteNode): MurteNode[] | undefined {
  return node.children.length === 0 ? undefined : node.children
}

/// A short label for the outline row.
export function outlineLabel(node: MurteNode): string {
  switch (node.type) {
    case 'text': return `text: ${node.string('value')}`
    case 'button': return `button: ${node.string('title')}`
    default: return node.type
  }
}
