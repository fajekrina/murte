import { describe, expect, it } from 'vitest'
import { MurteComponentFactory, MurteNode, MurteRenderer, TextComponent } from '../../src/MurteCore'

describe('MurteComponentFactory', () => {
  it('registers and resolves by type', () => {
    const factory = new MurteComponentFactory()
    factory.register(new TextComponent())
    expect(factory.component('text')).toBeDefined()
    expect(factory.component('unregistered')).toBeUndefined()
  })

  it('closure registration wraps any view inline', () => {
    // Wrapping a library/view is one call — no new type, no new module.
    const factory = new MurteComponentFactory()
    factory.register('gauge', (node, context) => {
      const el = context.document.createElement('meter')
      el.textContent = context.resolve(node.string('label'))
      return el
    })
    expect(factory.component('gauge')).toBeDefined()
    expect(factory.registeredTypes).toContain('gauge')
    // Still renders through the one registry + render path.
    const view = new MurteRenderer(factory).render(new MurteNode({ type: 'gauge', props: { label: 'hi' } })) as HTMLElement
    expect(view.textContent).toBe('hi')
  })

  it('builtins are all registered', () => {
    expect(MurteComponentFactory.withBuiltins.registeredTypes).toEqual(['button', 'card', 'hstack', 'image', 'text', 'vstack', 'zstack'])
  })

  it('last registration wins for the same type', () => {
    const factory = new MurteComponentFactory()
    factory.register(new TextComponent())
    factory.register(new TextComponent())
    expect(factory.registeredTypes).toEqual(['text'])
  })
})
