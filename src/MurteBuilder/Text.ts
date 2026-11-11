import { MurteNode, type MurteProps } from '../MurteCore'
import type { MurteNodeConvertible } from './MurteTreeBuilder'

export type TextStyle = 'title' | 'headline' | 'caption' | 'body'

export interface TextOptions {
  style?: TextStyle
  a11yLabel?: string
  a11yId?: string
}

/// A text component. Shares its name with the DOM's `Text` node; import it from
/// `murte/builder` in screen-authoring modules (the import shadows the global).
export function Text(value: string, options: TextOptions = {}): MurteNodeConvertible {
  return {
    node() {
      const props: MurteProps = { value }
      if (options.style !== undefined) props.style = options.style
      if (options.a11yLabel !== undefined) props.a11yLabel = options.a11yLabel
      if (options.a11yId !== undefined) props.a11yId = options.a11yId
      return new MurteNode({ type: 'text', props })
    }
  }
}
