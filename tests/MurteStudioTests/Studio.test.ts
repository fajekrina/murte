import { describe, expect, it } from 'vitest'
import { MurteActionSpec, MurteError, MurteNode, MurtePayload } from '../../src/MurteCore'
import {
  EditorDocument, InspectorView, OutlineView, PaletteView, PreviewView, StudioView,
  find, insertingChild, movingChild, removing, replacing, strippingIDs, withEnsuredIDs
} from '../../src/MurteStudio'

const ids = (nodes: MurteNode[]) => nodes.map((n) => n.id)

describe('MurteStudio smoke', () => {
  it('document starts as an empty vstack', () => expect(new EditorDocument().root.type).toBe('vstack'))
})

describe('Node tree edits', () => {
  const tree = () => new MurteNode({
    id: 'root', type: 'vstack', children: [
      new MurteNode({ id: 'a', type: 'text', props: { value: 'a' } }),
      new MurteNode({ id: 'b', type: 'vstack', children: [new MurteNode({ id: 'c', type: 'text' })] })
    ]
  })
  it('finds by id', () => {
    expect(find(tree(), 'c')?.type).toBe('text')
    expect(find(tree(), 'missing')).toBeUndefined()
  })
  it('replaces by id', () => {
    const updated = replacing(tree(), 'a', new MurteNode({ id: 'a', type: 'text', props: { value: 'Z' } }))
    expect(find(updated, 'a')?.string('value')).toBe('Z')
  })
  it('removes by id', () => {
    const updated = removing(tree(), 'c')
    expect(find(updated, 'c')).toBeUndefined()
    expect(find(updated, 'b')?.children).toEqual([])
  })
})

describe('Node tree insert/move/ids', () => {
  const tree = () => new MurteNode({
    id: 'root', type: 'vstack', children: [new MurteNode({ id: 'a', type: 'text' }), new MurteNode({ id: 'b', type: 'text' })]
  })
  it('inserts a child', () => expect(ids(insertingChild(tree(), new MurteNode({ id: 'x', type: 'text' }), 'root').children)).toEqual(['a', 'b', 'x']))
  it('moves a child', () => expect(ids(movingChild(tree(), 'b', -1).children)).toEqual(['b', 'a']))
  it('move out of bounds is a no-op', () => expect(ids(movingChild(tree(), 'a', -1).children)).toEqual(['a', 'b']))
  it('ensures ids where missing', () => {
    const withIDs = withEnsuredIDs(new MurteNode({ type: 'vstack', children: [new MurteNode({ type: 'text' })] }))
    expect(withIDs.id).toBeDefined()
    expect(withIDs.children[0]!.id).toBeDefined()
  })
  it('preserves existing ids', () => {
    expect(withEnsuredIDs(tree()).id).toBe('root')
    expect(withEnsuredIDs(tree()).children[0]!.id).toBe('a')
  })
  it('strips ids', () => {
    expect(strippingIDs(tree()).id).toBeUndefined()
    expect(strippingIDs(tree()).children.every((c) => c.id === undefined)).toBe(true)
  })
})

describe('EditorDocument', () => {
  const doc = () => new EditorDocument({
    key: 's',
    root: new MurteNode({ id: 'root', type: 'vstack', children: [new MurteNode({ id: 'a', type: 'text' }), new MurteNode({ id: 'b', type: 'text' })] })
  })
  it('inserts into a container', () => {
    const d = doc()
    d.insert(new MurteNode({ id: 'x', type: 'text' }), 'root')
    expect(ids(d.root.children)).toEqual(['a', 'b', 'x'])
  })
  it('deletes and clears the selection', () => {
    const d = doc(); d.selection = 'a'
    d.delete('a')
    expect(find(d.root, 'a')).toBeUndefined()
    expect(d.selection).toBeUndefined()
  })
  it('moves and replaces', () => {
    const d = doc()
    d.move('b', -1)
    expect(ids(d.root.children)).toEqual(['b', 'a'])
    d.replace('a', new MurteNode({ id: 'a', type: 'text', props: { value: 'Z' } }))
    expect(find(d.root, 'a')?.string('value')).toBe('Z')
  })
})

describe('Undo/redo', () => {
  it('undo/redo restores the tree', () => {
    const d = new EditorDocument({ root: new MurteNode({ id: 'root', type: 'vstack' }) })
    expect(d.canUndo).toBe(false)
    d.insert(new MurteNode({ id: 'x', type: 'text' }), 'root')
    expect(d.root.children).toHaveLength(1)
    expect(d.canUndo).toBe(true)
    d.undo()
    expect(d.root.children).toHaveLength(0)
    expect(d.canRedo).toBe(true)
    d.redo()
    expect(d.root.children).toHaveLength(1)
  })
  it('an edit clears redo', () => {
    const d = new EditorDocument({ root: new MurteNode({ id: 'root', type: 'vstack' }) })
    d.insert(new MurteNode({ id: 'x', type: 'text' }), 'root')
    d.undo()
    d.insert(new MurteNode({ id: 'y', type: 'text' }), 'root')   // new edit
    expect(d.canRedo).toBe(false)
  })
  it('a no-op edit leaves history untouched', () => {
    const d = new EditorDocument({
      root: new MurteNode({ id: 'root', type: 'vstack', children: [new MurteNode({ id: 'a', type: 'text' }), new MurteNode({ id: 'b', type: 'text' })] })
    })
    d.insert(new MurteNode({ id: 'x', type: 'text' }), 'root')
    d.undo()                       // canUndo == false, canRedo == true
    d.move('a', -1)                // no-op: "a" is already first
    expect(d.canRedo).toBe(true)   // redo not wiped by a no-op
    expect(d.canUndo).toBe(false)  // no phantom undo entry
  })
})

describe('Import/export', () => {
  it('import then export round-trips', () => {
    const d = new EditorDocument()
    d.importJSON('{"schemaVersion":"1.0","screen":{"key":"home","root":{"type":"vstack","children":[{"type":"text","props":{"value":"hi"}}]}}}')
    expect(d.key).toBe('home')
    expect(d.root.children[0]!.string('value')).toBe('hi')
    // Export strips editor ids and validates.
    const payload = MurtePayload.fromJSON(d.exportJSON())
    expect(payload.screen.key).toBe('home')
    expect(payload.screen.root.id).toBeUndefined()   // ids stripped
    expect(payload.screen.root.children[0]!.string('value')).toBe('hi')
  })
  it('export rejects an invalid tree', () => {
    const d = new EditorDocument({ root: new MurteNode({ type: 'button', action: new MurteActionSpec({ type: 'openURL', link: 'https://evil.example.com' }) }) })
    expect(() => d.exportJSON()).toThrow(MurteError)
  })
  it('export DSL produces screen source', () => {
    const d = new EditorDocument({ key: 'home', root: new MurteNode({ type: 'vstack', children: [new MurteNode({ type: 'text', props: { value: 'hi' } })] }) })
    expect(d.exportDSLSource()).toBe([
      'new Screen("home", () =>',
      '    VStack(',
      '        Text("hi"),',
      '    ),',
      ')'
    ].join('\n'))
  })
})

describe('View smoke', () => {
  it('shell constructs', () => expect(StudioView().querySelector('.studio-split')).not.toBeNull())
  it('outline constructs', () => expect(OutlineView(new EditorDocument()).querySelector('[role=tree]')).not.toBeNull())
  it('inspector constructs', () => expect(InspectorView(new EditorDocument()).textContent).toContain('No selection'))
  it('palette constructs', () => expect(PaletteView(new EditorDocument()).tagName).toBe('SELECT'))
  it('preview constructs', () => expect(PreviewView(new EditorDocument()).querySelector('.murte-vstack')).not.toBeNull())

  it('selecting in the outline drives the inspector, and palette inserts into the selection', () => {
    const d = new EditorDocument({ root: new MurteNode({ id: 'root', type: 'vstack' }) })
    const outline = OutlineView(d)
    const inspector = InspectorView(d)
    outline.querySelector<HTMLButtonElement>('.studio-row')!.click()
    expect(d.selection).toBe('root')
    expect(inspector.textContent).toContain('vstack')
    const palette = outline.querySelector<HTMLSelectElement>('select')!
    palette.value = 'text'
    palette.dispatchEvent(new Event('change'))
    expect(d.root.children.map((c) => c.type)).toEqual(['text'])
  })
})
