import type { MurteNode } from './MurteNode'
import type { MurteRenderContext } from './MurteRenderContext'

/// A single component (Pattern B): one small type per JSON `type`, added to the
/// one `MurteComponentFactory`. This is what makes "add a component = one file,
/// one PR" true, and lets third-party modules self-register.
///
/// The class declares its JSON `type` as a static property:
///
/// ```ts
/// class RatingComponent implements MurteComponent {
///   static readonly type = 'rating'
///   makeView(node: MurteNode, context: MurteRenderContext) { … }
/// }
/// ```
export interface MurteComponent {
  /// Build the DOM for a node. Reads props from the node and resolves dynamic
  /// values (`{{token}}`) via the context.
  makeView(node: MurteNode, context: MurteRenderContext): Node
}

/// The constructor side of a component: where the static `type` lives.
export interface MurteComponentType {
  readonly type: string
}

/// The registered type string of a component instance.
export function typeName(component: MurteComponent): string {
  const type = (component.constructor as Partial<MurteComponentType>).type
  if (typeof type !== 'string' || type.length === 0) {
    throw new TypeError(`${component.constructor.name} has no static 'type'`)
  }
  return type
}
