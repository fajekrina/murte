import { MurteNode, type MurteProps } from '../MurteCore'
import { buildChildren, type MurteChild, type MurteNodeConvertible } from './MurteTreeBuilder'

export type HAlignment = 'leading' | 'center' | 'trailing'
export type VAlignment = 'top' | 'center' | 'bottom'

export interface StackOptions<A> {
  spacing?: number
  alignment?: A
}

const isOptions = (value: unknown): value is StackOptions<string> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) &&
  !(value instanceof MurteNode) && typeof (value as { node?: unknown }).node !== 'function'

function stack(type: 'vstack' | 'hstack', args: unknown[]): MurteNodeConvertible {
  const options = isOptions(args[0]) ? (args.shift() as StackOptions<string>) : {}
  const children = buildChildren(args as MurteChild[])
  return {
    node() {
      const props: MurteProps = {}
      if (options.spacing !== undefined) props.spacing = options.spacing
      if (options.alignment !== undefined) props.alignment = options.alignment
      return new MurteNode({ type, props, children })
    }
  }
}

/// A vertical stack. Cross-axis alignment is horizontal.
export function VStack(options?: StackOptions<HAlignment>, ...children: MurteChild[]): MurteNodeConvertible
export function VStack(...children: MurteChild[]): MurteNodeConvertible
export function VStack(...args: unknown[]): MurteNodeConvertible {
  return stack('vstack', args)
}

/// A horizontal stack. Cross-axis alignment is vertical.
export function HStack(options?: StackOptions<VAlignment>, ...children: MurteChild[]): MurteNodeConvertible
export function HStack(...children: MurteChild[]): MurteNodeConvertible
export function HStack(...args: unknown[]): MurteNodeConvertible {
  return stack('hstack', args)
}
