import {
  MurteActionDispatcher, MurteBounds, MurteEngine, MurteNavigator, MurteScreen, MurteScreenFactory, MurteSchemaValidator,
  ScreenSource
} from '../../../src/MurteCore'
import { previewFactory } from './CustomComponents'
import screenJSON from '../Resources/Screen.json?raw'

/// Holds the engine (built-ins + a `url`/placeholder-aware `image`) and the bundled
/// `Screen.json` to render. Replace that file with your own payload.
export class PreviewModel {
  readonly engine: MurteEngine

  constructor() {
    const navigator = new MurteNavigator({
      navigate: (screen) => console.log(`navigate → ${screen}`),
      dismiss: () => console.log('dismiss'),
      refresh: () => console.log('refresh'),
      openLink: (link) => console.log(`openURL → ${link}`)
    })
    // Relaxed bounds so an embedded-image export (base64 far exceeds the
    // production 4096-char string cap) still loads in this preview harness.
    const bounds = new MurteBounds({
      maxDepth: 128,
      maxNodes: 100_000,
      maxStringLength: 64_000_000,
      maxProps: 512,
      maxChildren: 2048,
      maxArrayItems: 8192
    })
    this.engine = new MurteEngine({
      componentFactory: previewFactory(),
      screenFactory: new MurteScreenFactory(),
      actionDispatcher: new MurteActionDispatcher({ navigator }),
      validator: new MurteSchemaValidator({ bounds })
    })
  }

  get json(): string {
    return screenJSON.trim() !== ''
      ? screenJSON
      : '{"schemaVersion":"1.0","screen":{"key":"placeholder","root":{"type":"text","props":{"value":"Add Resources/Screen.json"}}}}'
  }
}

export function ContentView(model: PreviewModel = new PreviewModel()): HTMLElement {
  const page = document.createElement('main')
  Object.assign(page.style, { maxWidth: '480px', margin: '0 auto', padding: '16px' })
  const title = document.createElement('h1')
  title.textContent = 'Murte Preview'
  Object.assign(title.style, { fontSize: '17px', textAlign: 'center', margin: '0 0 16px' })
  page.append(title, MurteScreen.create(ScreenSource.inline(model.json), { engine: model.engine }))
  return page
}
