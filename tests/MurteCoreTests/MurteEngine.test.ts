import { describe, expect, it } from 'vitest'
import {
  LoadState, MurteComponentFactory, MurteEngine, MurteError, MurteScreen, MurteScreenFactory, ScreenSource
} from '../../src/MurteCore'
import { fixture } from '../helpers'

const engine = (screenFactory = new MurteScreenFactory()) =>
  new MurteEngine({ componentFactory: MurteComponentFactory.withBuiltins, screenFactory })

describe('MurteEngine.load & MurteScreenFactory', () => {
  it('loads an inline payload', async () => {
    const state = await engine().load(ScreenSource.inline('{ "schemaVersion": "1.0", "screen": { "key": "s", "root": { "type": "vstack" } } }'))
    expect(state.kind).toBe('loaded')
    if (state.kind === 'loaded') expect(state.root.type).toBe('vstack')
  })

  it('loads a registered key', async () => {
    const factory = new MurteScreenFactory()
    factory.register('home', '{"schemaVersion":"1.0","screen":{"key":"home","root":{"type":"text"}}}')
    const state = await engine(factory).load(ScreenSource.key('home'))
    expect(state.kind === 'loaded' && state.root.type).toBe('text')
  })

  it('unknown key fails closed', async () => {
    expect(LoadState.equals(await engine().load(ScreenSource.key('ghost')), LoadState.failed(MurteError.unknownScreen('ghost')))).toBe(true)
  })

  it('named without a resolver fails closed', async () => {
    expect(LoadState.equals(await engine().load(ScreenSource.named('remote')), LoadState.failed(MurteError.unknownScreen('remote')))).toBe(true)
  })

  it('garbage fails closed without crashing', async () => {
    expect((await engine().load(ScreenSource.inline('not json'))).kind).toBe('failed')
  })

  it('loads the dashboard fixture', async () => {
    const state = await engine().load(ScreenSource.inline(fixture('valid/dashboard.json')))
    expect(state.kind).toBe('loaded')
    if (state.kind === 'loaded') {
      expect(state.root.type).toBe('vstack')
      expect(state.root.children).toHaveLength(3)
    }
  })

  it('load rejects a decode-clean but invalid fixture', async () => {
    // navigate-without-screen decodes fine, but validation rejects it.
    const state = await engine().load(ScreenSource.inline(fixture('invalid/navigate_missing_screen.json')))
    expect(state.kind === 'failed' && state.error.kind).toBe('schema')
  })

  it('screen factory reports registered keys', () => {
    const factory = new MurteScreenFactory()
    factory.register('a', '{}').register('b', '{}')
    expect(factory.registeredKeys).toEqual(['a', 'b'])
  })

  it('screen constructs with an inline source and renders it', async () => {
    const screen = MurteScreen.create(
      ScreenSource.inline('{"schemaVersion":"1.0","screen":{"key":"s","root":{"type":"text","props":{"value":"Hi {{name}}"}}}}'),
      { engine: engine(), seed: { name: 'Ada' } }
    )
    document.body.appendChild(screen)
    await new Promise<void>((resolve) => screen.addEventListener('murte-statechange', (e) => {
      if ((e as CustomEvent<LoadState>).detail.kind !== 'loading') resolve()
    }))
    expect(screen.textContent).toBe('Hi Ada')
    screen.data.merge({ name: 'Grace' })   // tokens re-resolve on data change
    expect(screen.textContent).toBe('Hi Grace')
    screen.remove()
  })

  it('screen without an engine shows the error view', async () => {
    const screen = MurteScreen.create(ScreenSource.key('home'))
    document.body.appendChild(screen)
    await screen.reload()
    expect(screen.loadState.kind).toBe('failed')
    expect(screen.textContent).toContain("Couldn't load this screen")
    screen.remove()
  })
})
