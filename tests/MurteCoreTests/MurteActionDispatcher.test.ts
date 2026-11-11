import { describe, expect, it } from 'vitest'
import {
  DataContext, MurteActionDispatcher, MurteActionSpec, MurteError, MurteNavigator, utf8,
  type MurteNetworkClient, type MurteProps
} from '../../src/MurteCore'

/// Captures host effects so tests can assert what a command drove.
class Recorder {
  navigatedTo?: string
  navParams: MurteProps = {}
  dismissed = false
  refreshed = false
  openedLink?: string
  get navigator() {
    return new MurteNavigator({
      navigate: (screen, params) => { this.navigatedTo = screen; this.navParams = params },
      dismiss: () => { this.dismissed = true },
      refresh: () => { this.refreshed = true },
      openLink: (link) => { this.openedLink = link }
    })
  }
}

class MockNetwork implements MurteNetworkClient {
  constructor(private readonly response?: Uint8Array, private readonly fail = false) {}
  async perform(): Promise<Uint8Array> {
    if (this.fail) throw MurteError.network(500)
    return this.response ?? new Uint8Array()
  }
}

describe('MurteActionDispatcher', () => {
  it('navigate passes screen and params', async () => {
    const recorder = new Recorder()
    const dispatcher = new MurteActionDispatcher({ navigator: recorder.navigator })
    await dispatcher.dispatch(new MurteActionSpec({ type: 'navigate', screen: 'detail', params: { id: '7' } }), new DataContext())
    expect(recorder.navigatedTo).toBe('detail')
    expect(recorder.navParams.id).toBe('7')
  })

  it('dismiss, refresh, and openLink', async () => {
    const recorder = new Recorder()
    const dispatcher = new MurteActionDispatcher({ navigator: recorder.navigator })
    await dispatcher.dispatch(new MurteActionSpec({ type: 'dismiss' }), new DataContext())
    await dispatcher.dispatch(new MurteActionSpec({ type: 'refresh' }), new DataContext())
    await dispatcher.dispatch(new MurteActionSpec({ type: 'openURL', link: 'helpCenter' }), new DataContext())
    expect(recorder.dismissed).toBe(true)
    expect(recorder.refreshed).toBe(true)
    expect(recorder.openedLink).toBe('helpCenter')
  })

  it('api merges the response then runs onSuccess', async () => {
    const recorder = new Recorder()
    const dispatcher = new MurteActionDispatcher({ network: new MockNetwork(utf8('{ "amount": 100 }')), navigator: recorder.navigator })
    const data = new DataContext()
    await dispatcher.dispatch(new MurteActionSpec({
      type: 'api', request: 'getAccountBalance',
      onSuccess: new MurteActionSpec({ type: 'navigate', screen: 'balanceDetail' })
    }), data)
    expect(data.value('getAccountBalance.amount')).toBe(100)
    expect(recorder.navigatedTo).toBe('balanceDetail')
  })

  it('api failure runs onError', async () => {
    const recorder = new Recorder()
    const dispatcher = new MurteActionDispatcher({ network: new MockNetwork(undefined, true), navigator: recorder.navigator })
    await dispatcher.dispatch(new MurteActionSpec({ type: 'api', request: 'x', onError: new MurteActionSpec({ type: 'refresh' }) }), new DataContext())
    expect(recorder.refreshed).toBe(true)
  })

  it('default client makes every request fail closed', async () => {
    const recorder = new Recorder()
    const dispatcher = new MurteActionDispatcher({ navigator: recorder.navigator })   // NoNetworkClient
    await dispatcher.dispatch(new MurteActionSpec({ type: 'api', request: 'anything', onError: new MurteActionSpec({ type: 'dismiss' }) }), new DataContext())
    expect(recorder.dismissed).toBe(true)
  })
})
