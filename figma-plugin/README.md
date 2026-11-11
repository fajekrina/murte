# Murte Export (Figma plugin)

> **Experimental.** This produces rough structural scaffolding from a design — a
> starting point you refine — not a pixel-accurate conversion. For authoring real
> screens, prefer the MurteBuilder DSL or MurteStudio, which emit clean, validated
> payloads directly. See "What it can't do" in `docs/figma.md`.

Exports the selected Figma frame as a validated Murte SDUI payload (`schemaVersion`
+ `screen`), so a design can become an approximate Murte screen without writing JSON
by hand.

The mapping is lossy by design: Murte has a closed component vocabulary, so only the
layers that map to a component are exported. Anything else produces a warning.

## Build and load

Requires Node 18+.

```sh
cd figma-plugin
npm install
npm run build      # bundles src/code.ts into code.js
```

In the Figma desktop app: **Plugins → Development → Import plugin from manifest…**
and pick `figma-plugin/manifest.json`. Select a frame and run the plugin; the panel
shows the JSON to copy, plus any warnings.

## Development

```sh
npm run typecheck  # tsc --noEmit
npm test           # maps sample trees and validates them against docs/murte.schema.json
```

The mapping (`src/mapping.ts`) is kept free of the Figma plugin API so it can be
unit-tested with plain objects. `src/code.ts` reads the real selection into that
plain shape and shows the result.

## How layers map

| Figma layer | Murte node |
| --- | --- |
| Auto-layout frame, vertical | `vstack` (item spacing → `spacing`, cross-axis alignment → `alignment`) |
| Auto-layout frame, horizontal | `hstack` (item spacing → `spacing`, cross-axis alignment → `alignment`) |
| Frame with a background fill and rounded corners | `card` (auto-layout padding → `padding`) |
| Other frame / group / component / instance | `vstack` |
| Text | `text` (characters → `value`; named text style, else font size → `style`) |
| Rectangle / ellipse / vector | `image` (layer name → `name`; image-fill scale `FILL` → `contentMode: fill`) |
| Hidden layer | skipped |
| Anything else | empty `text` placeholder + a warning |

The text style comes from the layer's named text style when its name contains
`title`, `heading`, `caption`, or `body`; otherwise font size decides: ≥28 →
`title`, ≥20 → `headline`, ≥15 → `body`, otherwise `caption`.

## Actions and tokens

Actions have no Figma equivalent, so a button and its action come from the layer
name, formatted `type:verb:target`:

| Layer name | Result |
| --- | --- |
| `button:navigate:productDetail` | button with a `navigate` action to the `productDetail` screen |
| `button:api:getBalance` | button with an `api` action calling the `getBalance` request |
| `button:openurl:supportChat` | button with an `openURL` action to the named `supportChat` link |
| `button:dismiss`, `button:refresh` | button with that action |
| `image:systemName:star.fill` | image rendering the `star.fill` symbol |
| `card`, `vstack`, `hstack`, `text`, `image` | forces that node type |

A button's title is its first text layer, falling back to the target, then the layer
name. Targets are sanitized to Murte identifiers; a button whose action has no valid
target keeps the button but drops the action (with a warning).

The convention is read from the layer name, or, for a renamed component instance,
from its main component's name — so a library component named `button` (or
`button:navigate:…`) maps correctly even when the instance is renamed.

Data tokens are authored literally: text such as `Hello, {{user.name}}` is copied
through verbatim and resolved by the app at render time.
