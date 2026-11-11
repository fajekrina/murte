import { MurteError } from './MurteError'
import { MurteValue, type MurteProps } from './MurteValue'
import { MurteActionSpec, canonical, optionalString } from './MurteActionSpec'

export interface MurteNodeInit {
  id?: string
  type: string
  props?: MurteProps
  children?: MurteNode[]
  action?: MurteActionSpec
}

/// A decoded UI node — the Composite element the renderer walks.
///
/// `type` is an OPEN vocabulary: the component registry is extensible, so the
/// model accepts any type string. Whether it resolves to a real component is a
/// semantic / render-time concern, not a decode concern.
///
/// `id` is optional in the JSON; the renderer keys children by `id ?? position`,
/// so the data model never fabricates one.
export class MurteNode {
  readonly id?: string
  readonly type: string
  readonly props: MurteProps
  readonly children: MurteNode[]
  readonly action?: MurteActionSpec

  constructor(init: MurteNodeInit) {
    if (init.id !== undefined) this.id = init.id
    this.type = init.type
    this.props = init.props ?? {}
    this.children = init.children ?? []
    if (init.action !== undefined) this.action = init.action
  }

  /// Structural decode: `type` is required; `props`/`children` default to empty;
  /// unknown keys are ignored.
  static decode(raw: unknown, path = 'node'): MurteNode {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw MurteError.decode(`${path}: expected an object`)
    const o = raw as Record<string, unknown>
    if (typeof o.type !== 'string') throw MurteError.decode(`${path}.type: required string is missing`)
    let children: MurteNode[] = []
    if (o.children != null) {
      if (!Array.isArray(o.children)) throw MurteError.decode(`${path}.children: expected an array`)
      children = o.children.map((child, i) => MurteNode.decode(child, `${path}.children[${i}]`))
    }
    return new MurteNode({
      id: optionalString(o.id, `${path}.id`),
      type: o.type,
      props: o.props == null ? {} : MurteValue.decodeObject(o.props, `${path}.props`),
      children,
      action: o.action == null ? undefined : MurteActionSpec.decode(o.action, `${path}.action`)
    })
  }

  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    if (this.id !== undefined) out.id = this.id
    out.type = this.type
    if (Object.keys(this.props).length > 0) out.props = this.props
    if (this.children.length > 0) out.children = this.children.map((c) => c.toJSON())
    if (this.action !== undefined) out.action = this.action.toJSON()
    return out
  }

  equals(other: MurteNode | undefined): boolean {
    return !!other && JSON.stringify(canonical(this.toJSON())) === JSON.stringify(canonical(other.toJSON()))
  }

  // MARK: - Typed prop accessors (defaulting; never throw)

  value(key: string): MurteValue | undefined { return this.props[key] }
  string(key: string): string { return MurteValue.stringValue(this.props[key]) ?? '' }
  int(key: string): number { return MurteValue.intValue(this.props[key]) ?? 0 }
  double(key: string): number { return MurteValue.doubleValue(this.props[key]) ?? 0 }
  bool(key: string): boolean { return MurteValue.boolValue(this.props[key]) ?? false }
  array(key: string): MurteValue[] { return MurteValue.arrayValue(this.props[key]) ?? [] }
}
