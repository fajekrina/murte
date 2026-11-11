# Murte

A web-native **server-driven UI** framework — render native web screens from JSON,
navigate and call APIs declaratively, extend with any third-party component, with
fintech-grade validation, signing, and secure caching. The web edition of
[Murti](https://github.com/iQbalADR/murti).

The server describes *what* a screen is; the client owns *how* it renders,
navigates, and talks to the network. Ship layout changes without a redeploy.
Deliberately **web-platform-only** — plain DOM, Custom Elements, WebCrypto, and
IndexedDB; no UI framework — a strength, not a limitation.

[Get the code on GitHub](https://github.com/fajekrina/murte){ .md-button .md-button--primary }

## Install

```sh
npm install murte
```

```ts
import { MurteEngine } from 'murte'        // the engine (MurteCore)
import { Screen, VStack } from 'murte/builder'   // the authoring DSL (MurteBuilder)
```

## 60-second quickstart

```ts
import {
  MurteActionDispatcher, MurteComponentFactory, MurteEngine, MurteNavigator, MurteScreen,
  MurteScreenFactory, ScreenSource
} from 'murte'

// Create the engine, giving it the component/screen factories and the action dispatcher.
const engine = new MurteEngine({
  componentFactory: MurteComponentFactory.withBuiltins,   // text, image, vstack, hstack, zstack, button, card
  screenFactory: new MurteScreenFactory().register('home', homeJSON),
  actionDispatcher: new MurteActionDispatcher({ network: new MyNetworkClient(), navigator: new MurteNavigator() })
})

// <murte-screen> loads the JSON registered for "home" and renders it.
document.body.append(MurteScreen.create(ScreenSource.key('home'), { engine }))
```

## Reference

- [Payload schema & validation](schema.md) — the authoritative JSON Schema, the
  `schemaVersion` policy, bounds, valid/invalid fixtures, and the signed manifest.
- [Networking adapters](networking.md) — the `MurteNetworkClient` port plus
  ready-to-copy `fetch` / axios / ky adapters.

## Why Murte

- **Extend by data or by one file** — a new screen is JSON + one factory entry; a
  new component is one `MurteComponent`; a new action is one command; wrapping a
  library is one self-registering component (or a one-line function).
- **Fintech-grade security** — Ed25519 signature verification (re-verified on every
  load, including from cache), bounded validation, a closed action vocabulary, and an
  optionally-encrypted at-rest cache.
- **Zero third-party dependencies** in `MurteCore`; optional adapters bring their
  own.
- **Same payloads as Murti** — one JSON renders natively on iOS (Murti) and on the
  web (Murte); the schema and fixtures are shared.
