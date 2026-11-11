import { MurteBuild } from './MurteBuild'

/// The Null-Object fallback: a safe placeholder for an unregistered component
/// type, so an unknown or forward-incompatible node degrades gracefully rather
/// than crashing. Empty in release; a subtle marker in debug builds.
export function MurteUnknownView(type: string, document: Document = globalThis.document): Node {
  if (!MurteBuild.debug) return document.createDocumentFragment()
  const marker = document.createElement('span')
  marker.className = 'murte-unknown'
  marker.textContent = `⚠︎ unknown: ${type}`
  marker.setAttribute('aria-hidden', 'true')
  Object.assign(marker.style, {
    display: 'inline-block',
    fontSize: '11px',
    color: 'rgba(60, 60, 67, 0.6)',
    padding: '4px',
    border: '1px solid rgba(60, 60, 67, 0.24)',
    borderRadius: '4px'
  })
  return marker
}
