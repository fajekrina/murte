import type { MurteProps } from './MurteValue'

export interface MurteNavigatorInit {
  navigate?: (screen: string, params: MurteProps) => void
  dismiss?: () => void
  refresh?: () => void
  openLink?: (named: string) => void
}

/// The host-effect bridge. Navigation, dismissal, refresh, and link-opening are
/// UI concerns the app owns — commands call these functions rather than reaching
/// into the app's router or `window` from the core. Every handler defaults to a
/// no-op, so it is trivial to wire partially (and to assert against in tests).
///
/// `navigate`'s params seed the target screen's fresh `DataContext` on the host
/// side — that is the first step of the data-context lifecycle.
export class MurteNavigator {
  navigate: (screen: string, params: MurteProps) => void
  dismiss: () => void
  refresh: () => void
  openLink: (named: string) => void

  constructor(init: MurteNavigatorInit = {}) {
    this.navigate = init.navigate ?? (() => {})
    this.dismiss = init.dismiss ?? (() => {})
    this.refresh = init.refresh ?? (() => {})
    this.openLink = init.openLink ?? (() => {})
  }
}
