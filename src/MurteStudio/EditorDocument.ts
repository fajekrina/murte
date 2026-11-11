import { MurteNode, MurtePayload, MurteScreenSpec, MurteSchemaValidator, sortedJSONStringify, utf8, type BytesLike, type MurteData } from '../MurteCore'
import { DSLExport } from '../MurteBuilder'
import { insertingChild, movingChild, removing, replacing, strippingIDs, withEnsuredIDs } from './NodeTree'

/// The editable screen: a `MurteNode` tree where every node has an id, the current
/// selection, and undo history. Views observe it (`subscribe`) and call its edit
/// methods.
export class EditorDocument {
  private _key: string
  private _root: MurteNode
  private _selection?: string
  private undoStack: MurteNode[] = []
  private redoStack: MurteNode[] = []
  private readonly listeners = new Set<() => void>()

  constructor(init: { key?: string; root?: MurteNode } = {}) {
    this._key = init.key ?? 'screen'
    this._root = withEnsuredIDs(init.root ?? new MurteNode({ type: 'vstack' }))
  }

  get key(): string { return this._key }
  get root(): MurteNode { return this._root }

  get selection(): string | undefined { return this._selection }
  set selection(id: string | undefined) {
    this._selection = id
    this.changed()
  }

  /// Observe any change (tree, selection, history); returns the unsubscribe function.
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private changed(): void {
    for (const listener of [...this.listeners]) listener()
  }

  private mutate(transform: (root: MurteNode) => MurteNode): void {
    const next = transform(this._root)
    if (next.equals(this._root)) return   // a no-op edit must not touch undo/redo history
    this.undoStack.push(this._root)
    this.redoStack = []
    this._root = next
    this.changed()
  }

  insert(child: MurteNode, parentID: string): void {
    this.mutate((root) => insertingChild(root, withEnsuredIDs(child), parentID))
  }
  delete(id: string): void {
    this.mutate((root) => removing(root, id))
    if (this._selection === id) this.selection = undefined
  }
  move(id: string, delta: number): void { this.mutate((root) => movingChild(root, id, delta)) }
  replace(id: string, node: MurteNode): void { this.mutate((root) => replacing(root, id, node)) }

  /// Replace the document with the decoded payload, assigning editor ids.
  importJSON(data: BytesLike): void {
    const payload = MurtePayload.fromJSON(data)
    this.undoStack.push(this._root)
    this.redoStack = []
    this._key = payload.screen.key
    this._root = withEnsuredIDs(payload.screen.root)
    this._selection = undefined
    this.changed()
  }

  /// Validated JSON of the current tree, with all node ids stripped for clean
  /// output. The editor cannot tell authored ids apart from the UUIDs it assigns,
  /// so any id present in the imported JSON is not preserved on export.
  exportJSON(validator: MurteSchemaValidator = new MurteSchemaValidator()): MurteData {
    const payload = new MurtePayload('1.0', new MurteScreenSpec(this._key, strippingIDs(this._root)))
    validator.validate(payload)
    return utf8(sortedJSONStringify(payload))
  }

  /// MurteBuilder DSL source for the current tree. Node ids aren't emitted (the
  /// DSL doesn't set them), matching JSON export.
  exportDSLSource(): string {
    return DSLExport.sourceForScreen(this._key, this._root)
  }

  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }

  undo(): void {
    const previous = this.undoStack.pop()
    if (!previous) return
    this.redoStack.push(this._root)
    this._root = previous
    this.changed()
  }
  redo(): void {
    const next = this.redoStack.pop()
    if (!next) return
    this.undoStack.push(this._root)
    this._root = next
    this.changed()
  }
}
