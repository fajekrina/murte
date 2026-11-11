import { DataContext } from './DataContext'
import { MurteBuild } from './MurteBuild'
import { MurteError } from './MurteError'
import { MurteSymbols } from './MurteSymbols'
import { LoadState, ScreenSource } from './ScreenSource'
import type { MurteEngine } from './MurteEngine'
import type { MurteValue } from './MurteValue'

// MARK: - Engine injection

const engines = new WeakMap<Node, MurteEngine>()

/// Inject the engine into a subtree so nested `<murte-screen>`s (e.g. navigation
/// destinations) pick it up automatically — the counterpart of an environment
/// value. Returns the element for chaining.
export function murteEngine<T extends Node>(element: T, engine: MurteEngine): T {
  engines.set(element, engine)
  return element
}

/// The engine injected on the nearest ancestor (crossing shadow roots), if any.
export function environmentEngine(from: Node): MurteEngine | undefined {
  let node: Node | null = from
  while (node) {
    const engine = engines.get(node)
    if (engine) return engine
    node = node.parentNode ?? (node as ShadowRoot).host ?? null
  }
  return undefined
}

// MARK: - The screen element

const BaseElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement

/// A single element that renders any screen from its JSON source. Every screen in
/// an app uses this same element with a different source, so there's no
/// per-screen class. It loads the source, renders the decoded tree, and hands
/// clicks to the action dispatcher; a load failure shows an error view rather
/// than throwing.
///
/// Each source has a stable identity (`ScreenSource.identity`): changing the
/// source to a different identity resets the screen's data and reloads, so state
/// isn't carried over between screens.
export class MurteScreen extends BaseElement {
  static readonly tagName = 'murte-screen'

  private currentSource?: ScreenSource
  private explicitEngine?: MurteEngine
  private seedValues: Record<string, MurteValue> = {}
  private dataContext = new DataContext()
  private state: LoadState = LoadState.loading
  private loadToken = 0
  private unsubscribe?: () => void

  /// Register `<murte-screen>` (idempotent).
  static define(registry: CustomElementRegistry | undefined = globalThis.customElements): void {
    if (registry && !registry.get(MurteScreen.tagName)) registry.define(MurteScreen.tagName, MurteScreen)
  }

  /// - source: where the screen JSON comes from.
  /// - engine: the engine (or inject one with `murteEngine(ancestor, engine)`).
  /// - seed: initial data context (e.g. navigation params).
  static create(source: ScreenSource, options: { engine?: MurteEngine; seed?: Record<string, MurteValue>; document?: Document } = {}): MurteScreen {
    MurteScreen.define()
    const screen = (options.document ?? globalThis.document).createElement(MurteScreen.tagName) as MurteScreen
    if (options.engine) screen.engine = options.engine
    if (options.seed) screen.seed = options.seed
    screen.source = source
    return screen
  }

  get source(): ScreenSource | undefined { return this.currentSource }
  set source(next: ScreenSource | undefined) {
    const changed = !this.currentSource || !next || ScreenSource.identity(this.currentSource) !== ScreenSource.identity(next)
    this.currentSource = next
    if (changed) {
      this.dataContext = new DataContext(this.seedValues)   // fresh state per identity
      if (this.isConnected) void this.reload()
    }
  }

  get engine(): MurteEngine | undefined { return this.explicitEngine }
  set engine(engine: MurteEngine | undefined) { this.explicitEngine = engine }

  get seed(): Record<string, MurteValue> { return this.seedValues }
  set seed(seed: Record<string, MurteValue>) {
    this.seedValues = seed
    this.dataContext = new DataContext(seed)
  }

  /// The screen's data context (navigation params in, API responses merged in).
  get data(): DataContext { return this.dataContext }

  /// The current load state.
  get loadState(): LoadState { return this.state }

  connectedCallback(): void {
    void this.reload()
  }

  disconnectedCallback(): void {
    this.unsubscribe?.()
    this.unsubscribe = undefined
    this.loadToken++
  }

  private resolvedEngine(): MurteEngine | undefined {
    return this.explicitEngine ?? environmentEngine(this)
  }

  /// Load (or reload) the current source and render the result.
  async reload(): Promise<void> {
    const token = ++this.loadToken
    const engine = this.resolvedEngine()
    if (!this.currentSource) return
    if (!engine) {
      this.setState(LoadState.failed(MurteError.decode('MurteScreen has no engine — set `engine` or use `murteEngine(ancestor, engine)`.')))
      return
    }
    this.setState(LoadState.loading)
    const next = await engine.load(this.currentSource)
    if (token === this.loadToken) this.setState(next)
  }

  private setState(state: LoadState): void {
    this.state = state
    this.paint()
    this.dispatchEvent(new CustomEvent('murte-statechange', { detail: state }))
  }

  private paint(): void {
    this.unsubscribe?.()
    this.unsubscribe = undefined
    const doc = this.ownerDocument
    switch (this.state.kind) {
      case 'loading': {
        const progress = doc.createElement('progress')
        progress.className = 'murte-progress'
        progress.setAttribute('aria-label', 'Loading')
        this.replaceChildren(progress)
        return
      }
      case 'failed':
        this.replaceChildren(MurteErrorView(this.state.error, doc))
        return
      case 'loaded': {
        const engine = this.resolvedEngine()
        if (!engine) {
          this.replaceChildren(MurteErrorView(MurteError.decode('MurteScreen has no engine.'), doc))
          return
        }
        const root = this.state.root
        const data = this.dataContext
        const render = () => {
          this.replaceChildren(engine.renderer.render(root, data, engine.actionDispatcher.sink(data), doc))
        }
        render()
        this.unsubscribe = data.subscribe(render)   // tokens re-resolve when the data changes
      }
    }
  }
}

// MARK: - Fail-closed error surface

export function MurteErrorView(error: MurteError, document: Document = globalThis.document): HTMLElement {
  const box = document.createElement('div')
  box.className = 'murte-error'
  box.setAttribute('role', 'alert')
  Object.assign(box.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', textAlign: 'center'
  })
  const icon = MurteSymbols.make('exclamationmark.triangle', document)
  icon.style.color = 'rgba(60, 60, 67, 0.6)'
  const title = document.createElement('span')
  title.textContent = "Couldn't load this screen"
  Object.assign(title.style, { fontSize: '17px', fontWeight: '600' })
  box.append(icon, title)
  if (MurteBuild.debug) {
    const detail = document.createElement('span')
    detail.textContent = error.message
    Object.assign(detail.style, { fontSize: '11px', color: 'rgba(60, 60, 67, 0.6)' })
    box.appendChild(detail)
  }
  return box
}
