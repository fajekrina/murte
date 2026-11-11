import type { MurteCommand } from './MurteCommand'
import type { MurteActionSpec } from './MurteActionSpec'
import type { DataContext } from './DataContext'
import type { MurteActionDispatcher } from './MurteActionDispatcher'
import { NamedRequest } from './MurteNetworkClient'
import { MurteValue } from './MurteValue'
import { parseJSON } from './MurtePayload'

// The closed command set. Each maps one `ActionType` to native behavior.

export class NavigateCommand implements MurteCommand {
  async execute(spec: MurteActionSpec, data: DataContext, dispatcher: MurteActionDispatcher) {
    if (spec.screen === undefined) return
    dispatcher.navigator.navigate(spec.screen, spec.params ?? {})
    if (spec.onSuccess) await dispatcher.dispatch(spec.onSuccess, data)
  }
}

export class DismissCommand implements MurteCommand {
  async execute(_spec: MurteActionSpec, _data: DataContext, dispatcher: MurteActionDispatcher) {
    dispatcher.navigator.dismiss()
  }
}

export class RefreshCommand implements MurteCommand {
  async execute(_spec: MurteActionSpec, _data: DataContext, dispatcher: MurteActionDispatcher) {
    dispatcher.navigator.refresh()
  }
}

export class OpenURLCommand implements MurteCommand {
  async execute(spec: MurteActionSpec, _data: DataContext, dispatcher: MurteActionDispatcher) {
    if (spec.link === undefined) return
    dispatcher.navigator.openLink(spec.link)
  }
}

/// The one command that reaches the network. On success the response merges into
/// the data context under the request's key, then `onSuccess` runs; any failure
/// runs `onError` — fail-closed.
export class APICommand implements MurteCommand {
  async execute(spec: MurteActionSpec, data: DataContext, dispatcher: MurteActionDispatcher) {
    if (spec.request === undefined) {
      await this.runError(spec, data, dispatcher)
      return
    }
    let bytes: Uint8Array
    try {
      bytes = await dispatcher.network.perform(new NamedRequest(spec.request), spec.params ?? {})
    } catch {
      await this.runError(spec, data, dispatcher)
      return
    }
    try {
      data.merge({ [spec.request]: MurteValue.decode(parseJSON(bytes)) })
    } catch {
      // A non-JSON body still counts as success; there is just nothing to merge.
    }
    if (spec.onSuccess) await dispatcher.dispatch(spec.onSuccess, data)
  }

  private async runError(spec: MurteActionSpec, data: DataContext, dispatcher: MurteActionDispatcher) {
    if (spec.onError) await dispatcher.dispatch(spec.onError, data)
  }
}
