import { DataContext } from './DataContext'
import { MurteRenderContext } from './MurteRenderContext'
import type { MurteComponentFactory } from './MurteComponentFactory'
import type { MurteActionSpec } from './MurteActionSpec'
import type { MurteNode } from './MurteNode'

/// Walks a `MurteNode` tree (Composite) and interprets it into DOM nodes.
/// A thin entry point: it seeds the root `MurteRenderContext`, which carries the
/// recursion and the Null-Object fallback.
export class MurteRenderer {
  constructor(readonly factory: MurteComponentFactory) {}

  /// Render a node tree into a DOM node.
  render(
    node: MurteNode,
    data: DataContext = new DataContext(),
    dispatch: (spec: MurteActionSpec) => void = () => {},
    document: Document = globalThis.document
  ): Node {
    const context = new MurteRenderContext({ data, factory: this.factory, dispatch, document })
    return context.view(node)
  }
}
