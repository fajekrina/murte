import { describe, expect, it } from 'vitest'
import {
  DataContext, MurteActionSpec, MurteComponentFactory, MurteNode, MurtePayload, MurteRenderContext, MurteRenderer
} from '../../src/MurteCore'
import { fixture } from '../helpers'

const renderer = () => new MurteRenderer(MurteComponentFactory.withBuiltins)

describe('MurteRenderer', () => {
  it('renders a known node', () => {
    const node = new MurteNode({ type: 'text', props: { value: 'Hi {{name}}' } })
    const view = renderer().render(node, new DataContext({ name: 'Ada' }))
    expect(view.textContent).toBe('Hi Ada')
  })

  it('renders an image by symbol name', () => {
    const view = renderer().render(new MurteNode({ type: 'image', props: { systemName: 'star.fill' } })) as HTMLElement
    expect(view.querySelector('svg')?.getAttribute('data-symbol')).toBe('star.fill')
  })

  it('unknown type resolves to undefined and falls back without crashing', () => {
    const factory = MurteComponentFactory.withBuiltins
    expect(factory.component('lottie')).toBeUndefined()   // open registry: unknown → undefined
    const view = new MurteRenderer(factory).render(new MurteNode({ type: 'lottie' }))   // Null-Object fallback, not a crash
    expect(view.textContent).toContain('unknown: lottie')
  })

  it('walks a nested tree decoded from the dashboard fixture', () => {
    const payload = MurtePayload.fromJSON(fixture('valid/dashboard.json'))
    const view = renderer().render(payload.screen.root, new DataContext({ user: { name: 'Ada' } })) as HTMLElement
    // vstack → text + two buttons all resolve through the Composite walk.
    expect(view.textContent).toContain('Hello, Ada')
    expect(view.querySelectorAll('button')).toHaveLength(2)
  })

  it('a clicked button dispatches its action', () => {
    let dispatched: MurteActionSpec | undefined
    const context = new MurteRenderContext({
      data: new DataContext(),
      factory: MurteComponentFactory.withBuiltins,
      dispatch: (spec) => { dispatched = spec }
    })
    const button = new MurteNode({
      type: 'button',
      props: { title: 'Go' },
      action: new MurteActionSpec({ type: 'navigate', screen: 'next' })
    })
    ;(context.view(button) as HTMLButtonElement).click()
    expect(dispatched?.type).toBe('navigate')
    expect(dispatched?.screen).toBe('next')
  })

  it('applies accessibility props', () => {
    const view = renderer().render(new MurteNode({
      type: 'text', props: { value: 'x', a11yLabel: 'Hello {{name}}', a11yId: 'greeting', a11yTraits: ['header'] }
    }), new DataContext({ name: 'Ada' })) as HTMLElement
    expect(view.getAttribute('aria-label')).toBe('Hello Ada')
    expect(view.getAttribute('data-testid')).toBe('greeting')
    expect(view.getAttribute('role')).toBe('heading')
  })
})
