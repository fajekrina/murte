import { MurteActionSpec, type MurteProps } from '../MurteCore'

export interface ChainOptions {
  params?: MurteProps
  onSuccess?: Action
  onError?: Action
}

/// Builds a `MurteActionSpec` from the closed action set. Targets are named
/// references — a screen key, a named request, a named link — never a raw URL.
export class Action {
  private constructor(readonly spec: MurteActionSpec) {}

  static navigate(screen: string, options: ChainOptions = {}): Action {
    return new Action(new MurteActionSpec({
      type: 'navigate', screen, params: options.params,
      onSuccess: options.onSuccess?.spec, onError: options.onError?.spec
    }))
  }

  static api(request: string, options: ChainOptions = {}): Action {
    return new Action(new MurteActionSpec({
      type: 'api', request, params: options.params,
      onSuccess: options.onSuccess?.spec, onError: options.onError?.spec
    }))
  }

  static get dismiss(): Action { return new Action(new MurteActionSpec({ type: 'dismiss' })) }
  static get refresh(): Action { return new Action(new MurteActionSpec({ type: 'refresh' })) }
  static openURL(link: string): Action { return new Action(new MurteActionSpec({ type: 'openURL', link })) }
}
