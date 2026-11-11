import { MurteComponentFactory, MurteSymbols, type MurteNode } from '../../../src/MurteCore'

/// Built-ins, with `image` overridden so a `url` loads a real photo and a missing
/// named asset shows a labelled placeholder (a Figma export references layer
/// names, not bundled assets) instead of a broken image.
export function previewFactory(): MurteComponentFactory {
  return MurteComponentFactory.withBuiltins.register('image', (node, context) => SDUIImage(node, context.document))
}

/// Renders an `image` node. A `url` loads a real photo (a remote link or an
/// embedded `data:` URL); a symbol or bundled asset also work; a missing named
/// asset falls back to a labelled placeholder.
function SDUIImage(node: MurteNode, document: Document): HTMLElement {
  const width = node.value('width')
  const height = node.value('height')
  const radius = node.value('cornerRadius')
  const frame = document.createElement('div')
  Object.assign(frame.style, {
    width: typeof width === 'number' ? `${width}px` : '100%',
    height: typeof height === 'number' ? `${height}px` : 'auto',
    overflow: 'hidden',
    borderRadius: typeof radius === 'number' ? `${radius}px` : '0'
  })

  const systemName = node.string('systemName')
  const url = node.string('url')
  const name = node.string('name')

  if (systemName) {
    frame.appendChild(MurteSymbols.make(systemName, document))
    return frame
  }
  const source = url || name
  if (source) {
    const img = document.createElement('img')
    img.src = source
    img.alt = ''
    Object.assign(img.style, { display: 'block', width: '100%', height: '100%', objectFit: 'cover' })
    img.addEventListener('error', () => frame.replaceChildren(placeholder(document, name || 'image')))
    frame.appendChild(img)
    return frame
  }
  frame.appendChild(placeholder(document, 'image'))
  return frame
}

function placeholder(document: Document, label: string): HTMLElement {
  const box = document.createElement('div')
  Object.assign(box.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40px', height: '100%',
    background: 'rgba(120, 120, 128, 0.12)', color: 'rgba(60, 60, 67, 0.6)', fontSize: '11px', padding: '4px'
  })
  box.textContent = label
  return box
}
