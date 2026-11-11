import { MurteNode } from '../MurteCore'

// Pure tree transforms keyed by node id — every editor change is one of these.

/// A copy with the same identity, type, props, and action but different children.
export function withChildren(node: MurteNode, children: MurteNode[]): MurteNode {
  return new MurteNode({ id: node.id, type: node.type, props: node.props, children, action: node.action })
}

/// The node with this id, searching self and descendants.
export function find(node: MurteNode, targetID: string): MurteNode | undefined {
  if (node.id === targetID) return node
  for (const child of node.children) {
    const found = find(child, targetID)
    if (found) return found
  }
  return undefined
}

/// A copy with the node identified by `targetID` replaced.
export function replacing(node: MurteNode, targetID: string, replacement: MurteNode): MurteNode {
  if (node.id === targetID) return replacement
  return withChildren(node, node.children.map((c) => replacing(c, targetID, replacement)))
}

/// A copy with the node `targetID` removed wherever it appears among descendants.
export function removing(node: MurteNode, targetID: string): MurteNode {
  return withChildren(node, node.children.filter((c) => c.id !== targetID).map((c) => removing(c, targetID)))
}

/// A copy with `child` appended to the children of `parentID`.
export function insertingChild(node: MurteNode, child: MurteNode, parentID: string): MurteNode {
  if (node.id === parentID) return withChildren(node, [...node.children, child])
  return withChildren(node, node.children.map((c) => insertingChild(c, child, parentID)))
}

/// A copy with child `targetID` swapped with the sibling `delta` positions away
/// within its parent (no-op if that position is out of range). Callers pass ±1
/// for adjacent moves.
export function movingChild(node: MurteNode, targetID: string, delta: number): MurteNode {
  const index = node.children.findIndex((c) => c.id === targetID)
  if (index >= 0) {
    const target = index + delta
    if (target < 0 || target >= node.children.length) return node
    const moved = [...node.children]
    ;[moved[index], moved[target]] = [moved[target]!, moved[index]!]
    return withChildren(node, moved)
  }
  return withChildren(node, node.children.map((c) => movingChild(c, targetID, delta)))
}

/// A copy where every node has an id: existing ids are kept, missing ones get a UUID.
export function withEnsuredIDs(node: MurteNode): MurteNode {
  return new MurteNode({
    id: node.id ?? globalThis.crypto.randomUUID(), type: node.type, props: node.props,
    children: node.children.map(withEnsuredIDs), action: node.action
  })
}

/// A copy with all ids removed, for clean exported JSON.
export function strippingIDs(node: MurteNode): MurteNode {
  return new MurteNode({ type: node.type, props: node.props, children: node.children.map(strippingIDs), action: node.action })
}
