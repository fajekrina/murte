import { MurteNode, type MurteProps } from '../MurteCore'
import { buildChildren, type MurteChild, type MurteNodeConvertible } from './MurteTreeBuilder'

export interface CardOptions {
  padding?: number
}

const isOptions = (value: unknown): value is CardOptions =>
  typeof value === 'object' && value !== null && !Array.isArray(value) &&
  !(value instanceof MurteNode) && typeof (value as { node?: unknown }).node !== 'function'

/// A padded container with a background.
export function Card(options?: CardOptions, ...children: MurteChild[]): MurteNodeConvertible
export function Card(...children: MurteChild[]): MurteNodeConvertible
export function Card(...args: unknown[]): MurteNodeConvertible {
  const options = isOptions(args[0]) ? (args.shift() as CardOptions) : {}
  const children = buildChildren(args as MurteChild[])
  return {
    node() {
      const props: MurteProps = {}
      if (options.padding !== undefined) props.padding = options.padding
      return new MurteNode({ type: 'card', props, children })
    }
  }
}
