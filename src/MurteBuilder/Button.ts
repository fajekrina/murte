import { MurteNode, type MurteProps } from '../MurteCore'
import type { Action } from './Action'
import type { MurteNodeConvertible } from './MurteTreeBuilder'

export interface ButtonOptions {
  action?: Action
  a11yId?: string
}

export function Button(title: string, options: ButtonOptions = {}): MurteNodeConvertible {
  return {
    node() {
      const props: MurteProps = { title }
      if (options.a11yId !== undefined) props.a11yId = options.a11yId
      return new MurteNode({ type: 'button', props, action: options.action?.spec })
    }
  }
}
