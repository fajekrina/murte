import { MurteError } from './MurteError'
import type { MurteData } from './MurteData'
import type { MurteProps } from './MurteValue'

/// An allow-listed request name. Extensible by design: adopters add static
/// members in their own module (`NamedRequest.getBalance = new NamedRequest('getBalance')`),
/// so the framework never hard-codes the app's endpoints. The JSON `request`
/// string becomes one of these.
export class NamedRequest {
  constructor(readonly rawValue: string) {}
  equals(other: NamedRequest): boolean { return other.rawValue === this.rawValue }
  toString(): string { return this.rawValue }
}

/// The networking Strategy. `MurteCore` has zero networking dependencies; the
/// adopter provides a client that owns the real base URL, auth, and pinning.
/// Library types are never leaked — the boundary is bytes in, `MurteError` out.
export interface MurteNetworkClient {
  perform(request: NamedRequest, params: MurteProps): Promise<MurteData>
}

/// The default when no client is wired: every request is (correctly) unknown, so
/// an `api` action fails closed to its `onError`.
export class NoNetworkClient implements MurteNetworkClient {
  async perform(request: NamedRequest): Promise<MurteData> {
    throw MurteError.unknownRequest(request.rawValue)
  }
}
