# Authoring screens

Murte renders screens from JSON. `MurteBuilder` is a TypeScript DSL that produces
that JSON, so you can write screens in typed code instead of by hand, and `MurteGen`
turns authored screens into validated JSON files at build time.

Both depend on `MurteCore`; `MurteGen` runs on Node.

## The DSL

```ts
import { Action, Button, Screen, Text, VStack } from 'murte/builder'

const dashboard = new Screen('dashboard', () =>
  VStack({ spacing: 12, alignment: 'leading' },
    Text('Hello, {{user.name}}', { style: 'title' }),
    Button('View details', {
      action: Action.navigate('productDetail', { params: { productId: 'abc123' } })
    }),
    Button('Load balance', {
      action: Action.api('getAccountBalance', { onSuccess: Action.navigate('balanceDetail') })
    })
  )
)

const json = dashboard.validated().jsonData()
```

`{{user.name}}` stays in the output verbatim; the app resolves tokens at render
time. `validated()` runs the schema validator and throws if the screen is invalid;
`jsonData()` encodes the payload (with sorted keys, so output is stable).

### Built-in components

`Text`, `Image`, `VStack`, `HStack`, `Button`, and `Card` cover the built-in
component set. Containers take an optional options object, then their children.
Children may be arrays, and `false`/`null`/`undefined` drop out — so `&&` and
`.map()` give you `if` and `for`:

```ts
VStack({ spacing: 8 },
  showHeader && Text('Recent', { style: 'headline' }),
  items.map((item) => Text(item.title))
)
```

### Any other component

The built-ins mirror the renderer's built-in set, but the registry is open. Use
`component(type, props, ...children)` to author a third-party or custom type by its
`type` string:

```ts
component('lottie', { name: 'success_check', loop: false })
component('rating', { stars: 4 })
```

### Actions

`Button` takes an `Action`: `Action.navigate(screen, { params, onSuccess, onError })`,
`Action.api(request, { params, onSuccess, onError })`, `Action.dismiss`,
`Action.refresh`, or `Action.openURL(link)`. Targets are named references (a screen
key, a named request, a named link), never a raw URL.

### A note on names

`Text` and `Image` share names with DOM globals (the `Text` node and the `Image`
constructor). Importing them from `murte/builder` shadows the globals inside that
module, so write screen-authoring modules that import the DSL explicitly; if a module
needs both, import the DSL under a namespace (`import * as M from 'murte/builder'`).

## Export as DSL

`DSLExport` runs the DSL in reverse: given a decoded tree (a `MurteNode` or a full
`MurtePayload`), it generates MurteBuilder source that rebuilds an equivalent tree.
The [visual editor](studio.md) uses it for its **Export DSL** button, so a screen
imported as JSON — or built by direct manipulation — can come back out as TypeScript.

```ts
import { DSLExport } from 'murte/builder'

const source = DSLExport.source(payload)   // a string of MurteBuilder code
```

A node is written with its typed builder (`Text`, `VStack`, `Button`, …) when its
props fit that builder exactly; anything else falls back to the open-vocabulary
`component("type", { props }, …)` so no props are lost. Node ids aren't emitted (the
DSL doesn't set them), matching JSON export. An action on a non-button has no DSL
form, so it's omitted with a note in the output.

## Build-time generation

`MurteGen` writes each authored screen to `<key>.json`, validating every screen
first so a bad bundle never ships. Author screens in
[`src/MurteGen/main.ts`](https://github.com/fajekrina/murte/blob/main/src/MurteGen/main.ts)
(loop over data for lists), then run:

```
npm run gen -- Generated
```

Serve the resulting JSON from any backend or CDN as opaque bytes. The structure is
fixed at generation time; dynamic values stay at runtime through `{{token}}`s and
named API requests. To ship signed, production-ready payloads, wrap the output in
a signed envelope (see the security model) as part of your build.
