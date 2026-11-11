import { describe, expect, it } from 'vitest'
import { DataContext, MurteComponentFactory, MurteError, MurteNode, MurtePayload, MurteRenderer } from '../../src/MurteCore'
import {
  Action, Button, Card, HStack, Image, MurteBuilder, Screen, Text, VStack, component
} from '../../src/MurteBuilder'
import { fixture } from '../helpers'

describe('MurteBuilder smoke', () => {
  it('module loads', () => expect(MurteBuilder.isAvailable).toBe(true))
})

describe('Text builder', () => {
  it('plain text', () => {
    expect(Text('hi').node().equals(new MurteNode({ type: 'text', props: { value: 'hi' } }))).toBe(true)
  })
  it('styled text', () => {
    const n = Text('Title', { style: 'title' }).node()
    expect(n.type).toBe('text')
    expect(n.string('value')).toBe('Title')
    expect(n.string('style')).toBe('title')
  })
})

describe('Stacks', () => {
  it('vstack with children', () => {
    const n = VStack({ spacing: 12, alignment: 'leading' }, Text('a'), Text('b')).node()
    expect(n.type).toBe('vstack')
    expect(n.int('spacing')).toBe(12)
    expect(n.string('alignment')).toBe('leading')
    expect(n.children).toHaveLength(2)
    expect(n.children[0]!.string('value')).toBe('a')
  })
  it('hstack defaults', () => {
    const n = HStack(Text('x')).node()
    expect(n.type).toBe('hstack')
    expect(n.children).toHaveLength(1)
    expect(n.props.spacing).toBeUndefined()   // omitted when unset
  })
  it('if and for in the builder', () => {
    const show = true
    const n = VStack(
      show && Text('shown'),
      ['a', 'b'].map((word) => Text(word))
    ).node()
    expect(n.children).toHaveLength(3)
  })
})

describe('Button + Action', () => {
  it('navigate button', () => {
    const n = Button('Go', { action: Action.navigate('detail', { params: { id: '1' } }) }).node()
    expect(n.type).toBe('button')
    expect(n.string('title')).toBe('Go')
    expect(n.action?.type).toBe('navigate')
    expect(n.action?.screen).toBe('detail')
    expect(n.action?.params?.id).toBe('1')
  })
  it('api with chain', () => {
    const a = Action.api('getBalance', { onSuccess: Action.navigate('balance') })
    expect(a.spec.type).toBe('api')
    expect(a.spec.request).toBe('getBalance')
    expect(a.spec.onSuccess?.type).toBe('navigate')
  })
  it('simple actions', () => {
    expect(Action.dismiss.spec.type).toBe('dismiss')
    expect(Action.refresh.spec.type).toBe('refresh')
    expect(Action.openURL('help').spec.link).toBe('help')
  })
  it('button without action', () => {
    expect(Button('Plain').node().action).toBeUndefined()
  })
})

describe('Image / Card / component', () => {
  it('image symbol name', () => expect(Image({ systemName: 'star.fill' }).node().string('systemName')).toBe('star.fill'))
  it('image asset', () => {
    const n = Image({ name: 'logo', contentMode: 'fit' }).node()
    expect(n.string('name')).toBe('logo')
    expect(n.string('contentMode')).toBe('fit')
  })
  it('card', () => {
    const n = Card({ padding: 16 }, Text('hi')).node()
    expect(n.type).toBe('card')
    expect(n.int('padding')).toBe(16)
    expect(n.children).toHaveLength(1)
  })
  it('custom component', () => {
    const n = component('rating', { stars: 4 }).node()
    expect(n.type).toBe('rating')
    expect(n.int('stars')).toBe(4)
  })
  it('custom component with children', () => {
    const n = component('carousel', { loop: true }, Text('a'), Text('b')).node()
    expect(n.type).toBe('carousel')
    expect(n.bool('loop')).toBe(true)
    expect(n.children).toHaveLength(2)
  })
})

describe('Screen', () => {
  const sample = () => new Screen('dashboard', () =>
    VStack({ spacing: 12, alignment: 'leading' },
      Text('Hello, {{user.name}}', { style: 'title' }),
      Button('Go', { action: Action.navigate('detail', { params: { id: '1' } }) })
    )
  )

  it('builds a payload', () => {
    const p = sample().payload
    expect(p.schemaVersion).toBe('1.0')
    expect(p.screen.key).toBe('dashboard')
    expect(p.screen.root.type).toBe('vstack')
    expect(p.screen.root.children).toHaveLength(2)
  })
  it('validates and encodes', () => {
    const decoded = MurtePayload.fromJSON(sample().validated().jsonData())
    expect(decoded.equals(sample().payload)).toBe(true)   // round-trips
  })
  it('an invalid screen throws on validate', () => {
    // openURL with a raw URL is rejected by the validator (link must be an identifier).
    const bad = new Screen('s', () => Button('x', { action: Action.openURL('https://evil.example.com') }))
    expect(() => bad.validated()).toThrow(MurteError)
  })
})

describe('DSL equivalence + render', () => {
  // Rebuild docs/fixtures/valid/dashboard.json in the DSL.
  const dashboard = () => new Screen('dashboard', () =>
    VStack({ spacing: 12, alignment: 'leading' },
      Text('Hello, {{user.name}}', { style: 'title' }),
      Button('View details', {
        action: Action.navigate('productDetail', { params: { productId: 'abc123' } }),
        a11yId: 'details_button'
      }),
      Button('Load balance', { action: Action.api('getAccountBalance', { onSuccess: Action.navigate('balanceDetail') }) })
    )
  )

  it('matches the hand-written fixture', () => {
    const hand = MurtePayload.fromJSON(fixture('valid/dashboard.json'))
    const root = dashboard().payload.screen.root
    expect(root.type).toBe(hand.screen.root.type)
    expect(root.children.map((c) => c.type)).toEqual(hand.screen.root.children.map((c) => c.type))
    expect(root.equals(hand.screen.root)).toBe(true)
  })

  it('DSL output renders', () => {
    const view = new MurteRenderer(MurteComponentFactory.withBuiltins)
      .render(dashboard().payload.screen.root, new DataContext({ user: { name: 'Ada' } }))
    expect(view.textContent).toContain('Hello, Ada')
  })
})
