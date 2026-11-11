# Visual editor (MurteStudio)

`MurteStudio` is a web app for building a screen by direct manipulation instead
of writing JSON or TypeScript. It edits the same `MurteNode` tree the framework
renders, so the preview you see is produced by the real renderer, and the JSON it
exports is the same JSON a server would send.

It depends on `MurteCore` and `MurteBuilder`. Run it with:

```sh
npm run studio
```

## Layout

The window is a three-column split view:

- **Outline** (left) — the node tree, selectable and nestable. Selecting a node
  drives the inspector. The **Add** menu inserts a new component into the
  selected container, or into the root when the selection isn't a container.
- **Preview** (center) — the tree rendered by `MurteRenderer`, so it looks exactly
  like the shipped screen.
- **Inspector** (right) — type-aware fields for the selected node's props (for
  example a text node's value and style, a stack's spacing), plus move up / move
  down / delete.

## Editing model

Every edit goes through `EditorDocument`, which holds the root node and applies
changes as pure tree transforms keyed by node id. Each change that actually alters
the tree pushes the previous root onto an undo stack; **Undo** and **Redo** in the
toolbar walk that history. A no-op edit (moving the first child up, or setting a
prop to its current value) leaves the history untouched.

## Import and export

- **Import** opens a sheet to paste JSON. It is decoded into a node tree and any
  node without an `id` is assigned one so the editor can track it.
- **Export** validates the tree against the payload schema and, on success, shows
  the JSON (with sorted keys, so output is stable) to copy. The ids the editor uses
  for tracking are stripped from exported JSON. The editor can't tell an authored
  id apart from one it assigned, so ids present in imported JSON are not preserved
  on export.
- **Export DSL** shows the tree as MurteBuilder TypeScript source (see
  [Export as DSL](authoring.md#export-as-dsl)), so a screen can round-trip back to
  code.
