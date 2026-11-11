import { MurteNode, type MurteProps } from '../MurteCore'
import { buildChildren, type MurteChild, type MurteNodeConvertible } from './MurteTreeBuilder'

/// Author any component `type` the renderer might have, including third-party or
/// custom ones. This is the escape hatch for Murte's open component registry.
export function component(type: string, props: MurteProps = {}, ...children: MurteChild[]): MurteNodeConvertible {
  const built = buildChildren(children)
  return { node: () => new MurteNode({ type, props, children: built }) }
}
