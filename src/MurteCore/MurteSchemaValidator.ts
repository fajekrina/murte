import { MurteBounds } from './MurteBounds'
import { MurteError } from './MurteError'
import type { MurteNode } from './MurteNode'
import type { MurtePayload } from './MurtePayload'
import type { MurteActionSpec } from './MurteActionSpec'
import type { MurteValue } from './MurteValue'

/// Validation layers 2 (schema conformance) and the bounds JSON Schema can't
/// express. Pure — it walks an already-decoded tree (layer 1) and throws
/// `MurteError` on the first violation. Semantic checks (does a `type` resolve,
/// does a `screen`/`request` exist) and the render-time Null-Object fallback are
/// layers 3–4, elsewhere.
///
/// The component `type` vocabulary is OPEN, so this only checks that a type is a
/// well-formed identifier — never that it is registered.
export class MurteSchemaValidator {
  readonly bounds: MurteBounds
  readonly schemaMajor: number

  constructor(init: { bounds?: MurteBounds; schemaMajor?: number } = {}) {
    this.bounds = init.bounds ?? MurteBounds.default
    this.schemaMajor = init.schemaMajor ?? 1
  }

  validate(payload: MurtePayload): void {
    this.validateVersion(payload.schemaVersion)
    this.requireIdentifier(payload.screen.key, 'screen.key')
    this.validateRoot(payload.screen.root)
  }

  /// Validate a node tree without the payload envelope (handy for tests/tools).
  validateRoot(root: MurteNode): void {
    const counter = { nodes: 0 }
    this.validateNode(root, 1, counter)
  }

  // MARK: - Node walk

  private validateNode(node: MurteNode, depth: number, counter: { nodes: number }): void {
    const b = this.bounds
    if (depth > b.maxDepth) throw MurteError.bounds(`tree depth exceeds ${b.maxDepth}`)
    counter.nodes += 1
    if (counter.nodes > b.maxNodes) throw MurteError.bounds(`node count exceeds ${b.maxNodes}`)

    if (!isIdentifier(node.type, true) || length(node.type) > b.maxIdentifierLength) {
      throw MurteError.schema(`invalid component type '${node.type}'`)
    }
    if (node.id !== undefined && length(node.id) > b.maxIdentifierLength) {
      throw MurteError.bounds(`node id length exceeds ${b.maxIdentifierLength}`)
    }

    const props = Object.values(node.props)
    if (props.length > b.maxProps) throw MurteError.bounds(`props exceed ${b.maxProps}`)
    for (const value of props) this.validateValue(value)

    if (node.children.length > b.maxChildren) throw MurteError.bounds(`children exceed ${b.maxChildren}`)
    for (const child of node.children) this.validateNode(child, depth + 1, counter)

    if (node.action) this.validateAction(node.action, 1)
  }

  private validateValue(value: MurteValue): void {
    const b = this.bounds
    if (typeof value === 'string') {
      if (length(value) > b.maxStringLength) throw MurteError.bounds(`string length exceeds ${b.maxStringLength}`)
    } else if (Array.isArray(value)) {
      if (value.length > b.maxArrayItems) throw MurteError.bounds(`array items exceed ${b.maxArrayItems}`)
      for (const element of value) this.validateValue(element)
    } else if (value !== null && typeof value === 'object') {
      const values = Object.values(value)
      if (values.length > b.maxProps) throw MurteError.bounds(`object props exceed ${b.maxProps}`)
      for (const element of values) this.validateValue(element)
    }
  }

  private validateAction(action: MurteActionSpec, chainDepth: number): void {
    const b = this.bounds
    if (chainDepth > b.maxChainDepth) throw MurteError.bounds(`action chain depth exceeds ${b.maxChainDepth}`)
    switch (action.type) {
      case 'navigate': this.requireNamedTarget(action.screen, 'navigate.screen'); break
      case 'api': this.requireNamedTarget(action.request, 'api.request'); break
      case 'openURL': this.requireNamedTarget(action.link, 'openURL.link'); break
      case 'dismiss':
      case 'refresh': break
    }
    if (action.params) {
      const values = Object.values(action.params)
      if (values.length > b.maxProps) throw MurteError.bounds(`params exceed ${b.maxProps}`)
      for (const value of values) this.validateValue(value)
    }
    if (action.onSuccess) this.validateAction(action.onSuccess, chainDepth + 1)
    if (action.onError) this.validateAction(action.onError, chainDepth + 1)
  }

  // MARK: - Conformance helpers

  private validateVersion(version: string): void {
    const parts = version.split('.')
    const isInt = (s: string) => /^[+-]?\d+$/.test(s)
    if (parts.length !== 2 || !isInt(parts[0]!) || !isInt(parts[1]!)) {
      throw MurteError.schema(`schemaVersion must be MAJOR.MINOR, got '${version}'`)
    }
    if (Number(parts[0]) !== this.schemaMajor) throw MurteError.unsupportedVersion(version)
  }

  private requireNamedTarget(value: string | undefined, label: string): void {
    if (value === undefined) throw MurteError.schema(`${label} is required`)
    this.requireIdentifier(value, label)
  }

  private requireIdentifier(value: string, label: string): void {
    if (!isIdentifier(value) || length(value) > this.bounds.maxIdentifierLength) {
      throw MurteError.schema(`invalid identifier for ${label}: '${value}'`)
    }
  }
}

/// Mirrors the schema patterns: `^[A-Za-z][A-Za-z0-9_]*$` (dots allowed for
/// namespaced component types). ASCII only — rejects URLs, paths, injection.
function isIdentifier(value: string, allowDot = false): boolean {
  return (allowDot ? /^[A-Za-z][A-Za-z0-9_.]*$/ : /^[A-Za-z][A-Za-z0-9_]*$/).test(value)
}

/// Length in Unicode code points (not UTF-16 units), so one emoji counts once.
function length(value: string): number {
  let n = 0
  for (const _ of value) n++
  return n
}
