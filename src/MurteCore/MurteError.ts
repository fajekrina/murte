/// The single namespaced error type. Library/transport errors are never leaked
/// through the public API — they are mapped onto one of these.
export type MurteErrorKind =
  | 'decode'             // structural decode failure (message)
  | 'schema'             // schema-conformance violation (pattern, required field)
  | 'unsupportedVersion' // schemaVersion major not supported
  | 'unknownType'        // no component registered for this type
  | 'unknownRequest'     // named request not allow-listed
  | 'unknownScreen'      // screen key not in the factory
  | 'bounds'             // a rendering bound was exceeded
  | 'network'            // transport failure (no library type leaked)
  | 'signatureInvalid'   // authenticity check failed
  | 'decryptionFailed'
  | 'tokenUnresolved'    // a required token had no value

export class MurteError extends Error {
  readonly kind: MurteErrorKind
  /// The associated value: a message, version, type, request, screen, or token.
  readonly detail?: string
  /// `network` only: the HTTP status, or `null` when there was none.
  readonly status?: number | null

  private constructor(kind: MurteErrorKind, detail?: string, status?: number | null) {
    super(MurteError.describe(kind, detail, status))
    this.name = 'MurteError'
    this.kind = kind
    if (detail !== undefined) this.detail = detail
    if (kind === 'network') this.status = status ?? null
  }

  static decode(message: string) { return new MurteError('decode', message) }
  static schema(message: string) { return new MurteError('schema', message) }
  static unsupportedVersion(version: string) { return new MurteError('unsupportedVersion', version) }
  static unknownType(type: string) { return new MurteError('unknownType', type) }
  static unknownRequest(request: string) { return new MurteError('unknownRequest', request) }
  static unknownScreen(key: string) { return new MurteError('unknownScreen', key) }
  static bounds(message: string) { return new MurteError('bounds', message) }
  static network(status: number | null = null) { return new MurteError('network', undefined, status) }
  static signatureInvalid() { return new MurteError('signatureInvalid') }
  static decryptionFailed() { return new MurteError('decryptionFailed') }
  static tokenUnresolved(token: string) { return new MurteError('tokenUnresolved', token) }

  equals(other: unknown): boolean {
    return other instanceof MurteError && other.kind === this.kind && other.detail === this.detail && other.status === this.status
  }

  /// Mirrors Swift's `String(describing:)` of the enum case, e.g. `unknownScreen("ghost")`.
  private static describe(kind: MurteErrorKind, detail?: string, status?: number | null): string {
    if (kind === 'network') return `network(status: ${status ?? 'nil'})`
    return detail === undefined ? kind : `${kind}(${JSON.stringify(detail)})`
  }
}
