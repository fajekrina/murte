# Murte payload schema (v1)

The authoritative, machine-readable schema is
[`murte.schema.json`](./murte.schema.json) (JSON Schema **Draft 2020-12**). This
document is the human guide: what the schema does (and deliberately does *not*)
enforce, the `schemaVersion` policy, the concrete bounds, and valid/invalid
fixtures. When the two disagree, `murte.schema.json` wins.

---

## What validates where

Validation is layered, cheapest first (see the main spec). The JSON Schema is
**only the second layer** — it cannot express everything, and that's by design.

| Layer | Runs | Enforces | Tool |
| --- | --- | --- | --- |
| 1 · Structural decode | client | it's well-formed JSON that maps to `MurteNode` | `MurteNode.decode` |
| 2 · **Schema conformance** | **CI + client** | **shape, closed vocabularies, per-field bounds** | **`murte.schema.json`** |
| 3 · Semantic / factory | client | every `type` resolves; `screen`/`request`/`link` and referenced data keys exist | TypeScript validator |
| 4 · Render-time fallback | client | unknown/failed node → Null-Object placeholder | renderer |

**JSON Schema deliberately does NOT enforce:**

- **Tree depth, total node count, action-chain depth** — JSON Schema has no way to
  bound recursion depth. The client validator enforces these (see bounds below).
- **That a `type` is a *real* component** — the component registry is **open**, so
  the schema accepts any well-formed `type` string. Layer 3 confirms it resolves;
  otherwise layer 4 renders the Null-Object placeholder. This is what keeps the
  framework forward-compatible and extensible.
- **That a `screen`/`request`/`link` exists** — the schema only checks the *shape*
  of the reference (an identifier, never a URL); layer 3 checks existence.

---

## `schemaVersion` policy

- **Format:** `MAJOR.MINOR` (e.g. `1.0`). Present on **both** the envelope and the
  payload. The envelope's is checked *before* verify/decrypt, so a wrong-major
  payload is rejected cheaply.
- **Match on MAJOR.** A client declares the major it supports.
  - **Same major, same-or-lower minor** → validate strictly against that minor's
    schema.
  - **Same major, *higher* minor** → **render-what-you-can (forward-compatible).**
    Unknown component `type`s degrade to the Null-Object placeholder; unknown
    *props* are ignored (the `props` bag is open); unknown *structural* node keys
    are ignored by the structural decoder, and schema violations limited to those unknown keys
    are downgraded to warnings rather than a hard fail.
  - **Different major** → **reject, fail-closed** (last-good cache / bundled
    default / error state). A major bump may change structural meaning, so it is
    never rendered speculatively.
- **Additions within a major are additive only** (new optional props, new
  component types, new minor). Anything that removes or repurposes a field is a
  major bump.

---

## Bounds

Defaults below; all are configurable on the client validator. The first block is
what the **schema** enforces; the second is what only the **client** can.

| Bound | Default | Enforced by |
| --- | --- | --- |
| Max string length (any value) | 4096 | schema · `maxLength` |
| Max identifier length (keys/refs) | 128 | schema · `maxLength` |
| Max props per object | 64 | schema · `maxProperties` |
| Max children per node | 256 | schema · `maxItems` |
| Max array-value length | 512 | schema · `maxItems` |
| Max envelope payload size | ~1 MiB | schema · `maxLength` (base64) |
| **Max tree depth** | 32 | **client validator** |
| **Max total nodes** | 5000 | **client validator** |
| **Max action-chain depth** (`onSuccess`/`onError`) | 4 | **client validator** |

These caps are the DoS defense from the security model: they bound worst-case
decode + render cost regardless of what an authentic-but-malicious payload asks
for.

---

## Shape at a glance

**Two top-level forms** (the loader accepts either):

- **Envelope** (production) — signed, optionally encrypted, wrapping a base64
  payload.
- **Payload** (development) — the plaintext screen tree, posted directly.

```jsonc
// Envelope (production)
{
  "schemaVersion": "1.0",
  "alg": "ed25519",
  "payload": "<base64 of the payload JSON, or ciphertext if 'enc' set>",
  "signature": "<base64 signature over the payload bytes>"
}

// Payload (what's inside, or posted directly in dev)
{
  "schemaVersion": "1.0",
  "screen": {
    "key": "dashboard",
    "root": { "type": "vstack", "props": { "spacing": 12 }, "children": [ /* nodes */ ] }
  }
}
```

**A node** (`type` + optional `props` / `children` / `action` / `id`); **an
action** carries *named* targets at its top level, never a URL.

---

## Style props

On top of their structural props, the built-in components read a small, closed set
of visual props. The value space stays bounded — a color is a hex string, a weight
is a known name — and anything unrecognized is ignored (render-what-you-can), so
these never break an older client.

| Prop | On | Value |
| --- | --- | --- |
| `color` | `text` | hex `#RGB` / `#RRGGBB` / `#RRGGBBAA` |
| `weight` | `text` | `ultralight` `thin` `light` `regular` `medium` `semibold` `bold` `heavy` `black` |
| `size` | `text` | number (point size; overrides `style`'s size) |
| `background` | `vstack` `hstack` `card` `text` `image` `button` | hex color |
| `foreground` | `card` | hex color (tints the card's text) |
| `cornerRadius` | any container | number |
| `padding` | any container | number |

`card` keeps its grey box and rounded corners as defaults; `background`,
`cornerRadius`, `padding`, and `foreground` override them.

```json
{ "type": "card",
  "props": { "background": "#EB6D00", "cornerRadius": 16, "foreground": "#FFFFFF" },
  "children": [
    { "type": "text", "props": { "value": "Rp150.000", "weight": "bold", "size": 28 } }
  ]
}
```

The `props` bag is open, so these need no schema change; they're bounded by the
components that read them, not by the structural schema.

## Overlays (`zstack`)

Most layout flows (stacks). A `zstack` instead **overlays** its children, and with a
frame size plus per-child position it reproduces an absolutely-positioned design (a
hero image with content layered on top).

| Prop | On | Meaning |
| --- | --- | --- |
| `width` / `height` | `zstack` | the source frame's size — the coordinate space |
| `x` / `y` | a `zstack` child | the child's top-left within that space |
| `width` / `height` | a `zstack` child | the child's size |

The `zstack` scales its whole frame to the available width, so the layout keeps its
proportions on any device. Without a `width`/`height` it's a plain centered overlay.

---

## Manifest

The cache's version index is fetched as its own signed payload — the **same
envelope** used for screens, wrapping this JSON:

```json
{ "sequence": 7, "screens": { "home": "v7", "dashboard": "v3" } }
```

`screens` maps each `screenKey` to the version the cache should treat as current.
`sequence` is **monotonic**: a manifest whose `sequence` is lower than the last
applied one is rejected, which defends against a rollback to a stale-but-validly-
signed manifest. The envelope is verified before the manifest is trusted, exactly
like a payload.

---

## Valid fixture

```json
{
  "schemaVersion": "1.0",
  "screen": {
    "key": "dashboard",
    "root": {
      "type": "vstack",
      "props": { "spacing": 12, "alignment": "leading" },
      "children": [
        { "type": "text", "props": { "value": "Hello, {{user.name}}", "style": "title" } },
        {
          "type": "button",
          "props": { "title": "View details", "a11yId": "details_button" },
          "action": {
            "type": "navigate",
            "screen": "productDetail",
            "params": { "productId": "abc123" }
          }
        },
        {
          "type": "button",
          "props": { "title": "Load balance" },
          "action": {
            "type": "api",
            "request": "getAccountBalance",
            "onSuccess": { "type": "navigate", "screen": "balanceDetail" }
          }
        }
      ]
    }
  }
}
```

---

## Invalid fixtures (and which layer catches them)

A shared bank of `valid/` + `invalid/` fixtures is a great first-contribution
surface — each invalid one names the layer that must reject it.

| Fixture | Why it's rejected | Caught by |
| --- | --- | --- |
| Node with no `type` | `type` is required | schema |
| `"action": { "type": "eval" }` | not in the closed action enum | schema |
| `"type": "navigate"` with no `screen` | `if/then` requires `screen` | schema |
| `"type": "openURL", "link": "https://evil.com"` | `link` must be an identifier; the pattern rejects URLs | schema |
| `"props": { "value": "<10k chars>" }` | exceeds `maxLength` 4096 | schema |
| Node nested 40 levels deep | exceeds max tree depth 32 | client validator |
| Payload with 8000 nodes | exceeds max total nodes 5000 | client validator |
| `onSuccess` chained 6 deep | exceeds max chain depth 4 | client validator |
| `"screen": "ghostScreen"` (well-formed, not registered) | no `MurteScreenFactory` entry | client validator (semantic) |
| `"type": "lottie"` but no `lottie` component registered | valid payload; no such component at runtime | renderer → Null-Object placeholder |

The last row is *not* a validation failure — it's the fail-safe degradation path,
and it's what makes the framework forward-compatible.

---

## Using it

- **CI:** lint every fixture in `docs/fixtures/valid` and `docs/fixtures/invalid`
  against `murte.schema.json` on each commit (valid must pass, invalid must fail
  for the stated reason). This is the anti-drift guarantee.
- **Client:** the TypeScript `MurteSchemaValidator` mirrors this schema for layer 2 and
  adds layers 3–4; the shared fixtures keep TypeScript and the JSON Schema in sync.
