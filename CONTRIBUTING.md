# Contributing to Murte

Thanks for helping! Murte is built so that most changes are **one small file**.

## Extend by one file

- **New component** — one `MurteComponent` class, or one inline
  `factory.register('type', (node, context) => …)` call.
- **New screen** — a JSON payload + one `MurteScreenFactory` entry. Never a class
  per screen.
- **New library integration** — a small adapter implementing the relevant port
  (`MurteNetworkClient`, `MurteSignatureVerifier`, …). Networking adapters live in
  your app, not in this repo — see [docs/networking.md](docs/networking.md).

The action vocabulary is **closed** (navigate / api / dismiss / refresh / openURL);
adding an action type is a deliberate core change, not a routine PR.

## Build & test

```
npm install
npm run typecheck
npm test
npm run build
```

Keep the suite green and add tests with your change.

## Schema fixtures

The authoritative schema is [docs/murte.schema.json](docs/murte.schema.json). It is
the same structural contract as Murti's, so a payload stays portable between the
two. If you touch the payload shape, add matching fixtures under
`docs/fixtures/valid/` and `docs/fixtures/invalid/` (each invalid one demonstrates the
rule that rejects it), then run the lint:

```
python3 scripts/lint_schema.py
```

Valid fixtures must pass; invalid ones must fail for the stated reason. This keeps
the JSON Schema, the example payloads, and the TypeScript model in sync.

## Code style

- **Comments are documentation only** — what the code does and non-obvious *why*,
  present tense. No roadmap, version references, or "future / for now" notes.
- Match the surrounding code's naming and idiom. Public types carry the `Murte`
  prefix; small conforming types (components, commands) use short descriptive names.
- `strict` TypeScript, no `any` in public API.

## Commits

Commit messages are authored by the human contributor only — no tool-attribution
lines and no automated `Co-Authored-By` trailers.
