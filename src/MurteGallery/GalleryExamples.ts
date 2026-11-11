import type { MurteValue } from '../MurteCore'

/// One named example: a title, a blurb, the JSON payload, and an optional data
/// context to seed (so `{{token}}` examples resolve).
export interface GalleryExample {
  id: string
  title: string
  subtitle: string
  json: string
  seed?: Record<string, MurteValue>
}

const example = (e: Omit<GalleryExample, 'id'>): GalleryExample => ({ id: e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...e })

export const GalleryExamples: { all: GalleryExample[] } = {
  all: [
    example({
      title: 'Text & tokens',
      subtitle: 'Text styles + {{token}} interpolation',
      json: `{
  "schemaVersion": "1.0",
  "screen": { "key": "textDemo", "root": {
    "type": "vstack", "props": { "spacing": 12, "alignment": "leading" }, "children": [
      { "type": "text", "props": { "value": "Title style", "style": "title" } },
      { "type": "text", "props": { "value": "Headline style", "style": "headline" } },
      { "type": "text", "props": { "value": "Hello, {{user.name}} — welcome back." } },
      { "type": "text", "props": { "value": "Caption style", "style": "caption" } }
    ]
  } }
}`,
      seed: { user: { name: 'Ada Lovelace' } }
    }),

    example({
      title: 'Buttons & actions',
      subtitle: 'navigate / refresh / openURL / dismiss',
      json: `{
  "schemaVersion": "1.0",
  "screen": { "key": "actions", "root": {
    "type": "vstack", "props": { "spacing": 12, "alignment": "leading" }, "children": [
      { "type": "text", "props": { "value": "Tap a button — the dispatched action shows in the bar below.", "style": "caption" } },
      { "type": "button", "props": { "title": "Navigate", "a11yId": "nav_button" },
        "action": { "type": "navigate", "screen": "productDetail", "params": { "productId": "42" } } },
      { "type": "button", "props": { "title": "Refresh" }, "action": { "type": "refresh" } },
      { "type": "button", "props": { "title": "Open help" }, "action": { "type": "openURL", "link": "helpCenter" } },
      { "type": "button", "props": { "title": "Dismiss" }, "action": { "type": "dismiss" } }
    ]
  } }
}`
    }),

    example({
      title: 'Layout',
      subtitle: 'Nested vstack / hstack',
      json: `{
  "schemaVersion": "1.0",
  "screen": { "key": "layout", "root": {
    "type": "vstack", "props": { "spacing": 16, "alignment": "leading" }, "children": [
      { "type": "text", "props": { "value": "A horizontal row", "style": "headline" } },
      { "type": "hstack", "props": { "spacing": 12 }, "children": [
        { "type": "text", "props": { "value": "Left" } },
        { "type": "text", "props": { "value": "Middle" } },
        { "type": "text", "props": { "value": "Right" } }
      ] },
      { "type": "text", "props": { "value": "A nested column", "style": "headline" } },
      { "type": "vstack", "props": { "spacing": 4, "alignment": "leading" }, "children": [
        { "type": "text", "props": { "value": "Row one" } },
        { "type": "text", "props": { "value": "Row two" } }
      ] }
    ]
  } }
}`
    }),

    example({
      title: 'Cards & icons',
      subtitle: 'card container + symbol images',
      json: `{
  "schemaVersion": "1.0",
  "screen": { "key": "cards", "root": {
    "type": "vstack", "props": { "spacing": 12, "alignment": "leading" }, "children": [
      { "type": "hstack", "props": { "spacing": 16 }, "children": [
        { "type": "image", "props": { "systemName": "star.fill", "a11yLabel": "star" } },
        { "type": "image", "props": { "systemName": "bolt.fill" } },
        { "type": "image", "props": { "systemName": "heart.fill" } }
      ] },
      { "type": "card", "props": { "padding": 16 }, "children": [
        { "type": "text", "props": { "value": "Account balance", "style": "caption" } },
        { "type": "text", "props": { "value": "$1,234.56", "style": "title" } }
      ] }
    ]
  } }
}`
    }),

    example({
      title: 'Unknown component',
      subtitle: 'Null-Object fallback keeps rendering',
      json: `{
  "schemaVersion": "1.0",
  "screen": { "key": "fallback", "root": {
    "type": "vstack", "props": { "spacing": 12, "alignment": "leading" }, "children": [
      { "type": "text", "props": { "value": "The next node is an unregistered type:" } },
      { "type": "lottie", "props": { "name": "success_check" } },
      { "type": "text", "props": { "value": "…and rendering continues safely." } }
    ]
  } }
}`
    })
  ]
}
