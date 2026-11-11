import {
  MurteActionDispatcher, MurteComponentFactory, MurteEngine, MurteNavigator, MurteScreen, MurteScreenFactory, ScreenSource
} from '../MurteCore'
import { h } from '../MurteStudio/dom'
import { GalleryExamples, type GalleryExample } from './GalleryExamples'

/// Records the most recent action a JSON-defined control dispatched, so the demo
/// can show that clicks actually flow through the command layer.
export class ActionLog {
  private _last = 'No action yet'
  private readonly listeners = new Set<() => void>()
  get last(): string { return this._last }
  note(message: string): void {
    this._last = message
    for (const listener of this.listeners) listener()
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

/// Owns the shared engine (wired with built-in components and a navigator that
/// reports effects into the `ActionLog`).
export class GalleryModel {
  readonly actionLog = new ActionLog()
  readonly engine: MurteEngine

  constructor() {
    const log = this.actionLog
    const navigator = new MurteNavigator({
      navigate: (screen, params) => {
        const keys = Object.keys(params).sort()
        log.note(`navigate → ${screen}${keys.length ? ` (${keys.join(', ')})` : ''}`)
      },
      dismiss: () => log.note('dismiss'),
      refresh: () => log.note('refresh'),
      openLink: (link) => log.note(`openURL → ${link}`)
    })
    this.engine = new MurteEngine({
      componentFactory: MurteComponentFactory.withBuiltins,
      screenFactory: new MurteScreenFactory(),
      actionDispatcher: new MurteActionDispatcher({ navigator })
    })
  }
}

type Route = { kind: 'list' } | { kind: 'example'; example: GalleryExample } | { kind: 'hotReload' }

/// The gallery shell: a list of examples and tools, a detail page per route, and
/// the action banner pinned to the bottom. Routes live in the URL hash so the
/// browser's back button walks the navigation stack.
export function GalleryRootView(model: GalleryModel = new GalleryModel()): HTMLElement {
  const page = h('main', { class: 'gallery-page' })
  const titleBar = h('header', { class: 'gallery-titlebar' })

  const route = (): Route => {
    const hash = location.hash.replace(/^#\/?/, '')
    if (hash === 'hot-reload') return { kind: 'hotReload' }
    const example = GalleryExamples.all.find((e) => e.id === hash)
    return example ? { kind: 'example', example } : { kind: 'list' }
  }

  const paint = () => {
    const r = route()
    switch (r.kind) {
      case 'list':
        titleBar.replaceChildren(h('h1', {}, 'Murte Gallery'))
        page.replaceChildren(ExampleList())
        break
      case 'example': {
        const detail = ExampleDetailView(r.example, model)
        titleBar.replaceChildren(BackLink(), h('h1', {}, r.example.title), detail.toggle)
        page.replaceChildren(detail.element)
        break
      }
      case 'hotReload':
        titleBar.replaceChildren(BackLink(), h('h1', {}, 'Hot reload'))
        page.replaceChildren(HotReloadView(model))
        break
    }
  }
  addEventListener('hashchange', paint)
  paint()

  return h('div', { class: 'gallery' }, titleBar, page, ActionBanner(model.actionLog))
}

function BackLink(): HTMLElement {
  return h('a', { href: '#', class: 'gallery-back' }, '‹ Examples')
}

function ExampleList(): HTMLElement {
  return h('div', { class: 'gallery-list' },
    h('h2', {}, 'Examples'),
    h('ul', {}, ...GalleryExamples.all.map((example) =>
      h('li', {}, h('a', { href: `#/${example.id}` },
        h('span', { class: 'gallery-item-title' }, example.title),
        h('span', { class: 'gallery-item-subtitle' }, example.subtitle)
      ))
    )),
    h('h2', {}, 'Tools'),
    h('ul', {}, h('li', {}, h('a', { href: '#/hot-reload' }, h('span', { class: 'gallery-item-title' }, 'Hot reload (paste JSON)'))))
  )
}

export function ActionBanner(log: ActionLog): HTMLElement {
  const value = h('span', { class: 'gallery-banner-value' }, log.last)
  log.subscribe(() => { value.textContent = log.last })
  return h('footer', { class: 'gallery-banner', 'aria-live': 'polite' },
    h('span', { class: 'gallery-banner-icon', 'aria-hidden': 'true' }, '⚡'),
    h('strong', {}, 'Last action:'),
    value
  )
}

export function ExampleDetailView(example: GalleryExample, model: GalleryModel): { element: HTMLElement; toggle: HTMLElement } {
  let showSource = false
  const body = h('div', { class: 'gallery-detail' })
  const toggle = h('button', { type: 'button', class: 'gallery-toggle' }, 'JSON')
  const paint = () => {
    toggle.textContent = showSource ? 'Preview' : 'JSON'
    body.replaceChildren(showSource
      ? h('pre', { class: 'gallery-source' }, example.json)
      : MurteScreen.create(ScreenSource.inline(example.json), { engine: model.engine, seed: example.seed }))
  }
  toggle.addEventListener('click', () => { showSource = !showSource; paint() })
  paint()
  return { element: body, toggle }
}

export function HotReloadView(model: GalleryModel): HTMLElement {
  const editor = h('textarea', { class: 'gallery-editor', spellcheck: false })
  editor.value = GalleryExamples.all[0]?.json ?? '{}'
  // The screen re-renders whenever the JSON (its source identity) changes.
  const screen = MurteScreen.create(ScreenSource.inline(editor.value), { engine: model.engine })
  editor.addEventListener('input', () => { screen.source = ScreenSource.inline(editor.value) })
  return h('div', { class: 'gallery-hot-reload' }, editor, h('div', { class: 'gallery-detail' }, screen))
}
