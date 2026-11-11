import { MurteError } from './MurteError'
import { MurteValue, type MurteProps } from './MurteValue'

/// The closed action vocabulary. A payload cannot express arbitrary behavior —
/// it can only pick one of these.
export type ActionType = 'navigate' | 'api' | 'dismiss' | 'refresh' | 'openURL'

export const ActionType = {
  allCases: ['navigate', 'api', 'dismiss', 'refresh', 'openURL'] as readonly ActionType[],
  is(value: unknown): value is ActionType {
    return typeof value === 'string' && (ActionType.allCases as readonly string[]).includes(value)
  }
}

export interface MurteActionSpecInit {
  type: ActionType
  screen?: string
  request?: string
  link?: string
  params?: MurteProps
  onSuccess?: MurteActionSpec
  onError?: MurteActionSpec
}

/// The *data* form of an action; the dispatcher turns it into behavior. Targets
/// are named references — a screen key, a named request, a named link — never a
/// raw URL.
///
/// `onSuccess`/`onError` form a bounded LINEAR chain, not an arbitrary tree.
export class MurteActionSpec {
  readonly type: ActionType
  readonly screen?: string    // navigate → a screen key
  readonly request?: string   // api → an allow-listed named request
  readonly link?: string      // openURL → an allow-listed named link
  readonly params?: MurteProps
  readonly onSuccess?: MurteActionSpec
  readonly onError?: MurteActionSpec

  constructor(init: MurteActionSpecInit) {
    this.type = init.type
    if (init.screen !== undefined) this.screen = init.screen
    if (init.request !== undefined) this.request = init.request
    if (init.link !== undefined) this.link = init.link
    if (init.params !== undefined) this.params = init.params
    if (init.onSuccess !== undefined) this.onSuccess = init.onSuccess
    if (init.onError !== undefined) this.onError = init.onError
  }

  /// Structural decode. An unknown `type` is rejected (closed vocabulary);
  /// unknown keys are ignored.
  static decode(raw: unknown, path = 'action'): MurteActionSpec {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw MurteError.decode(`${path}: expected an object`)
    const o = raw as Record<string, unknown>
    if (!ActionType.is(o.type)) throw MurteError.decode(`${path}.type: unknown action type ${JSON.stringify(o.type)}`)
    return new MurteActionSpec({
      type: o.type,
      screen: optionalString(o.screen, `${path}.screen`),
      request: optionalString(o.request, `${path}.request`),
      link: optionalString(o.link, `${path}.link`),
      params: o.params == null ? undefined : MurteValue.decodeObject(o.params, `${path}.params`),
      onSuccess: o.onSuccess == null ? undefined : MurteActionSpec.decode(o.onSuccess, `${path}.onSuccess`),
      onError: o.onError == null ? undefined : MurteActionSpec.decode(o.onError, `${path}.onError`)
    })
  }

  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = { type: this.type }
    if (this.screen !== undefined) out.screen = this.screen
    if (this.request !== undefined) out.request = this.request
    if (this.link !== undefined) out.link = this.link
    if (this.params !== undefined) out.params = this.params
    if (this.onSuccess !== undefined) out.onSuccess = this.onSuccess.toJSON()
    if (this.onError !== undefined) out.onError = this.onError.toJSON()
    return out
  }

  equals(other: MurteActionSpec | undefined): boolean {
    return !!other && JSON.stringify(canonical(this.toJSON())) === JSON.stringify(canonical(other.toJSON()))
  }
}

export function optionalString(value: unknown, path: string): string | undefined {
  if (value == null) return undefined
  if (typeof value !== 'string') throw MurteError.decode(`${path}: expected a string`)
  return value
}

/// Key-sorted copy for equality checks.
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) out[key] = canonical((value as Record<string, unknown>)[key])
    return out
  }
  return value
}
