import { MurtePayload, MurteScreenSpec, MurteSchemaValidator, sortedJSONStringify, utf8, type MurteData } from '../MurteCore'
import type { MurteNodeConvertible } from './MurteTreeBuilder'

export interface ScreenOptions {
  schemaVersion?: string
}

/// A screen authored in the DSL. Produces a `MurtePayload` and can validate and
/// encode it to JSON.
export class Screen {
  readonly payload: MurtePayload

  constructor(key: string, root: () => MurteNodeConvertible)
  constructor(key: string, options: ScreenOptions, root: () => MurteNodeConvertible)
  constructor(key: string, optionsOrRoot: ScreenOptions | (() => MurteNodeConvertible), maybeRoot?: () => MurteNodeConvertible) {
    const options = typeof optionsOrRoot === 'function' ? {} : optionsOrRoot
    const root = typeof optionsOrRoot === 'function' ? optionsOrRoot : maybeRoot!
    this.payload = new MurtePayload(options.schemaVersion ?? '1.0', new MurteScreenSpec(key, root().node()))
  }

  /// Throws if the payload doesn't satisfy the schema and bounds.
  validated(validator: MurteSchemaValidator = new MurteSchemaValidator()): this {
    validator.validate(this.payload)
    return this
  }

  /// Encode the payload to JSON bytes, with sorted keys for stable output.
  jsonData(): MurteData {
    return utf8(this.jsonString())
  }

  /// The same JSON, as text.
  jsonString(): string {
    return sortedJSONStringify(this.payload)
  }
}
