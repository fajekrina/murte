import { DataContext } from './DataContext'
import { MurteComponentFactory } from './MurteComponentFactory'
import { MurteUnknownView } from './MurteUnknownView'
import type { MurteActionSpec } from './MurteActionSpec'
import type { MurteNode } from './MurteNode'
import type { MurteValue } from './MurteValue'

/// Everything a component needs to render, plus the glue: the data context, token
/// resolution, action dispatch, child scoping, and Composite recursion.
export class MurteRenderContext {
  readonly data: DataContext
  readonly factory: MurteComponentFactory
  readonly dispatch: (spec: MurteActionSpec) => void
  /// The document views are built in (the host's, or a test DOM).
  readonly document: Document

  constructor(init: {
    data: DataContext
    factory?: MurteComponentFactory
    dispatch?: (spec: MurteActionSpec) => void
    document?: Document
  }) {
    this.data = init.data
    this.factory = init.factory ?? new MurteComponentFactory()
    this.dispatch = init.dispatch ?? (() => {})
    this.document = init.document ?? globalThis.document
  }

  /// Interpolate `{{token}}`s against the data context.
  resolve(template: string): string {
    return this.data.resolve(template)
  }

  /// A scoped context for children / list rows: a fresh `DataContext` seeded
  /// from this one plus `extra`, so a row's tokens never leak into the parent.
  child(merging: Record<string, MurteValue>): MurteRenderContext {
    const scoped = new DataContext({ ...this.data.snapshot, ...merging })
    return new MurteRenderContext({ data: scoped, factory: this.factory, dispatch: this.dispatch, document: this.document })
  }

  /// Resolve a node to its view: Composite recursion, with the Null-Object
  /// fallback for any unregistered type — never a crash.
  view(node: MurteNode): Node {
    const component = this.factory.component(node.type)
    if (component) return component.makeView(node, this)
    return MurteUnknownView(node.type, this.document)
  }
}
