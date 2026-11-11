import type { MurteActionSpec } from './MurteActionSpec'
import type { DataContext } from './DataContext'
import type { MurteActionDispatcher } from './MurteActionDispatcher'

/// A single action (Command pattern): a self-contained unit that performs one
/// action type. The vocabulary is CLOSED — these types are internal and fixed, so
/// a payload can never express arbitrary behavior, only pick one of them.
export interface MurteCommand {
  execute(spec: MurteActionSpec, data: DataContext, dispatcher: MurteActionDispatcher): Promise<void>
}
