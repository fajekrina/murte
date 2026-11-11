import { typeName, type MurteComponent } from './MurteComponent'
import type { MurteNode } from './MurteNode'
import type { MurteRenderContext } from './MurteRenderContext'
import {
  ButtonComponent, CardComponent, HStackComponent, ImageComponent, TextComponent, VStackComponent, ZStackComponent
} from './BuiltinComponents'

/// An inline view builder: the one-line way to wrap any library.
export type MurteViewBuilder = (node: MurteNode, context: MurteRenderContext) => Node

/// The one registry: a `type` string → a component (Factory pattern). One
/// registry, many small components — never a registry per component.
export class MurteComponentFactory {
  private readonly components = new Map<string, MurteComponent>()

  /// Register a component under its static `type`. Returns `this` for chaining.
  register(component: MurteComponent): this
  /// Register a component with an inline builder — the one-line way to wrap any
  /// third-party library (or a one-off view) without declaring a type or a
  /// module. The same registry, same render path, same Null-Object fallback.
  register(type: string, makeView: MurteViewBuilder): this
  register(componentOrType: MurteComponent | string, makeView?: MurteViewBuilder): this {
    if (typeof componentOrType === 'string') {
      if (!makeView) throw new TypeError('register(type, makeView) requires a view builder')
      this.components.set(componentOrType, new ClosureComponent(makeView))
    } else {
      this.components.set(typeName(componentOrType), componentOrType)
    }
    return this
  }

  /// The component for a type, or `undefined` if none is registered (the
  /// renderer then falls back to the Null Object).
  component(type: string): MurteComponent | undefined {
    return this.components.get(type)
  }

  /// Registered type strings, sorted (handy for gallery/tests).
  get registeredTypes(): string[] {
    return [...this.components.keys()].sort()
  }

  /// A factory pre-loaded with the built-in component set.
  static get withBuiltins(): MurteComponentFactory {
    return new MurteComponentFactory()
      .register(new TextComponent())
      .register(new ImageComponent())
      .register(new VStackComponent())
      .register(new HStackComponent())
      .register(new ZStackComponent())
      .register(new ButtonComponent())
      .register(new CardComponent())
  }
}

/// A component whose view comes from an inline function (the closure form of
/// `MurteComponentFactory.register`). It is keyed directly by the registered
/// type, so it carries no static `type` of its own.
class ClosureComponent implements MurteComponent {
  constructor(private readonly body: MurteViewBuilder) {}
  makeView(node: MurteNode, context: MurteRenderContext): Node { return this.body(node, context) }
}
