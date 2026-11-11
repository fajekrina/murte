/// Build configuration — the counterpart of Swift's `#if DEBUG`. In a debug
/// build the Null-Object placeholder shows a subtle marker and the error view
/// shows the underlying error; in release both stay silent.
///
/// Detected from `process.env.NODE_ENV` when the host defines it (Node, most
/// bundlers); otherwise release. Hosts can set it explicitly.
export const MurteBuild = {
  debug: detectDebug()
}

function detectDebug(): boolean {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return proc?.env !== undefined && proc.env.NODE_ENV !== 'production'
}
