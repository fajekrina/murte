# Authoring guide

A Murte screen is a JSON **payload** the app renders with native web elements. There
are three ways to write one — all produce the same payload, so pick by taste:

| Path | Best for | Output |
| --- | --- | --- |
| [MurteBuilder DSL](authoring.md) | code-first authoring, screens in version control, generating many screens from data | TypeScript → validated JSON at build time |
| [MurteStudio](studio.md) | building visually, tweaking a tree, exploring | edit → export JSON (or DSL) |
| Hand-written JSON | tiny screens, tests, learning the shape | JSON you validate yourself |

## The shape

Every screen is the same envelope:

```json
{ "schemaVersion": "1.0",
  "screen": { "key": "home", "root": { "…": "a node" } } }
```

A **node** is `{ "type", props?, children?, action? }`. `type` names a component,
`props` configures it, `children` nest, and `action` fires on interaction. The
component set is **closed**: an unknown `type` renders a placeholder rather than
crashing.

## The components

| `type` | Purpose | Key props |
| --- | --- | --- |
| `text` | a label | `value`, `style` (`title`·`headline`·`body`·`caption`), `color`, `weight`, `size` |
| `image` | an image | `systemName` (a built-in symbol) · `name` (bundled asset), `contentMode` |
| `vstack` / `hstack` | flow layout | `spacing`, `alignment` |
| `zstack` | overlay / absolute layout | `width`/`height`; children carry `x`/`y`/`width`/`height` |
| `card` | a padded box | `padding`, `background`, `cornerRadius`, `foreground` |
| `button` | a clickable control | `title`, plus an `action` |

The visual props (`background`, `cornerRadius`, `padding`, `foreground`, and text
`color`/`weight`/`size`) are a small, closed set — see
[Style props](schema.md#style-props) and [Overlays](schema.md#overlays-zstack) for the
value ranges. The registry is extensible: an app can register its own component for
[any other type](authoring.md#any-other-component), including remote-image or
third-party views.

`systemName` uses the same names as Murti's SF Symbols (`star.fill`, `heart.fill`,
`bolt.fill`, …), drawn from Murte's built-in glyph set; add more with
`MurteSymbols.register(name, svgPath)`.

## Data and behavior

- **Tokens** — text like `Hello, {{user.name}}` is resolved against the screen's data
  context at render time. Author them literally; the app supplies the values.
- **Actions** — a closed set: `navigate`, `api`, `dismiss`, `refresh`, `openURL`.
  Targets are **named** (a screen key, a request name, a link name) — never a raw URL.
  `navigate` and `api` can chain through `onSuccess` / `onError`.

## A screen, in the DSL and as JSON

```ts
new Screen('home', () =>
  VStack({ spacing: 12, alignment: 'leading' },
    Text('Hello, {{user.name}}', { style: 'title' }),
    Button('View details', { action: Action.navigate('productDetail', { params: { id: 'abc' } }) })
  )
)
```

produces

```json
{ "schemaVersion": "1.0", "screen": { "key": "home", "root": {
  "type": "vstack", "props": { "spacing": 12, "alignment": "leading" }, "children": [
    { "type": "text", "props": { "value": "Hello, {{user.name}}", "style": "title" } },
    { "type": "button", "props": { "title": "View details" },
      "action": { "type": "navigate", "screen": "productDetail", "params": { "id": "abc" } } }
  ] } } }
```

## Validate before you ship

Whatever the path, validate against the schema and bounds:

- DSL — `screen.validated()`.
- MurteStudio — **Export** validates before handing you JSON.
- Anywhere — `new MurteSchemaValidator().validate(payload)`.

Validation checks structure, the closed action vocabulary, and per-field bounds — see
[Payload schema & validation](schema.md).

## Preview it

`examples/MurtePreviewApp` is a small web page that renders a bundled `Screen.json`.
Drop in the JSON you authored (from the DSL, MurteStudio, or by hand), run
`npm run preview-app`, and see the screen in any browser.
