import { MurteNode, type MurteProps } from '../MurteCore'
import type { MurteNodeConvertible } from './MurteTreeBuilder'

/// A symbol image (`{ systemName }`) or a bundled asset (`{ name, contentMode? }`).
/// Shares its name with the DOM's `Image` constructor; import it from
/// `murte/builder` in screen-authoring modules.
export function Image(source: { systemName: string } | { name: string; contentMode?: string }): MurteNodeConvertible {
  return {
    node() {
      let props: MurteProps
      if ('systemName' in source) {
        props = { systemName: source.systemName }
      } else {
        props = { name: source.name }
        if (source.contentMode !== undefined) props.contentMode = source.contentMode
      }
      return new MurteNode({ type: 'image', props })
    }
  }
}
