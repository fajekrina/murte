import { utf8String, type MurteComponentFactory } from '../MurteCore'
import { EditorDocument } from './EditorDocument'
import { InspectorView } from './InspectorView'
import { OutlineView } from './OutlineView'
import { PreviewView } from './PreviewView'
import { h } from './dom'
import './studio.css'

export interface StudioOptions {
  /// Component factory for the live preview (custom types included).
  factory?: MurteComponentFactory
  /// Palette entries for the Add menu (custom types included).
  paletteTypes?: string[]
}

/// The editor shell: outline on the left, live preview in the middle, inspector on
/// the right, with import/export/undo in the toolbar.
export function StudioView(
  document: EditorDocument = new EditorDocument(),
  options: StudioOptions = {}
): HTMLElement {
  const undo = h('button', { type: 'button', title: 'Undo', onclick: () => document.undo() }, '↶ Undo')
  const redo = h('button', { type: 'button', title: 'Redo', onclick: () => document.redo() }, '↷ Redo')

  const sheet = JSONSheet()
  const showError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    alert(message)
  }

  const runImport = () => sheet.open('Paste JSON', '', 'Load', (text) => {
    try {
      document.importJSON(text)
      return true
    } catch (error) {
      showError(error)
      return false
    }
  })
  const runExport = () => {
    try {
      sheet.open('Exported JSON', utf8String(document.exportJSON()), 'Done')
    } catch (error) {
      showError(error)
    }
  }

  const toolbar = h('nav', { class: 'studio-toolbar', 'aria-label': 'Toolbar' },
    h('strong', {}, 'Murte Studio'),
    h('span', { class: 'spacer' }),
    undo, redo,
    h('button', { type: 'button', onclick: runImport }, 'Import'),
    h('button', { type: 'button', onclick: runExport }, 'Export'),
    h('button', { type: 'button', onclick: () => sheet.open('Exported DSL', document.exportDSLSource(), 'Done') }, 'Export DSL')
  )

  const refreshToolbar = () => {
    undo.disabled = !document.canUndo
    redo.disabled = !document.canRedo
  }
  refreshToolbar()
  document.subscribe(refreshToolbar)

  return h('div', { class: 'studio' },
    toolbar,
    h('main', { class: 'studio-split' }, OutlineView(document, options.paletteTypes), PreviewView(document, options.factory), InspectorView(document)),
    sheet.element
  )
}

/// A monospaced text sheet used for both pasting JSON to import and showing exported
/// JSON to copy.
function JSONSheet() {
  const title = h('h2', {})
  const text = h('textarea', { spellcheck: false, class: 'studio-sheet-text' })
  const action = h('button', { type: 'button', class: 'primary' })
  const element = h('dialog', { class: 'studio-sheet' }, h('form', { method: 'dialog' }, title, text, h('menu', {}, action)))
  let onAction: ((text: string) => boolean) | undefined

  action.addEventListener('click', (event) => {
    event.preventDefault()
    if (!onAction || onAction(text.value)) close()
  })
  const close = () => (typeof element.close === 'function' ? element.close() : element.removeAttribute('open'))

  return {
    element,
    open(heading: string, value: string, label: string, handler?: (text: string) => boolean) {
      title.textContent = heading
      text.value = value
      text.readOnly = !handler
      action.textContent = label
      onAction = handler
      if (typeof element.showModal === 'function') element.showModal()
      else element.setAttribute('open', '')
    }
  }
}
