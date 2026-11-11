import type { MurteActionSpec, ActionType } from './MurteActionSpec'
import type { DataContext } from './DataContext'
import type { MurteCommand } from './MurteCommand'
import { NoNetworkClient, type MurteNetworkClient } from './MurteNetworkClient'
import { MurteNavigator } from './MurteNavigator'
import { APICommand, DismissCommand, NavigateCommand, OpenURLCommand, RefreshCommand } from './Commands'

/// Turns a decoded `MurteActionSpec` into behavior (the Command pattern). Created
/// once with a network client and the host navigator, then passed to the engine.
export class MurteActionDispatcher {
  readonly network: MurteNetworkClient
  readonly navigator: MurteNavigator

  constructor(init: { network?: MurteNetworkClient; navigator?: MurteNavigator } = {}) {
    this.network = init.network ?? new NoNetworkClient()
    this.navigator = init.navigator ?? new MurteNavigator()
  }

  /// Build the command for an action type and run it. Chaining
  /// (`onSuccess`/`onError`) re-enters here; the chain is finite by construction
  /// and depth-bounded by validation.
  async dispatch(spec: MurteActionSpec, data: DataContext): Promise<void> {
    await MurteActionDispatcher.command(spec.type).execute(spec, data, this)
  }

  static command(type: ActionType): MurteCommand {
    switch (type) {
      case 'navigate': return new NavigateCommand()
      case 'api': return new APICommand()
      case 'dismiss': return new DismissCommand()
      case 'refresh': return new RefreshCommand()
      case 'openURL': return new OpenURLCommand()
    }
  }

  /// A fire-and-forget dispatch function for `MurteRenderContext` — a clicked
  /// button hands off here and the async work runs in the background.
  sink(data: DataContext): (spec: MurteActionSpec) => void {
    return (spec) => { void this.dispatch(spec, data) }
  }
}
