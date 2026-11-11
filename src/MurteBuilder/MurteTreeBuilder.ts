import { MurteNode } from '../MurteCore'

/// A value that produces one `MurteNode` — anything the DSL can place in a tree.
export interface MurteNodeConvertible {
  node(): MurteNode
}

/// What a container accepts as children. Arrays flatten and `null`/`undefined`/
/// `false` drop out, so plain `cond && Text(…)` and `items.map(…)` give you `if`
/// and `for` inside a container.
export type MurteChild = MurteNodeConvertible | MurteNode | MurteChild[] | null | undefined | false

/// Collects children into `MurteNode[]`.
export function buildChildren(children: MurteChild[]): MurteNode[] {
  const out: MurteNode[] = []
  const visit = (child: MurteChild) => {
    if (child === null || child === undefined || child === false) return
    if (Array.isArray(child)) { child.forEach(visit); return }
    out.push(child instanceof MurteNode ? child : child.node())
  }
  children.forEach(visit)
  return out
}
