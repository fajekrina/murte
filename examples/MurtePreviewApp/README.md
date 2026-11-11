# MurtePreviewApp

A small web page that renders a bundled `Resources/Screen.json` with Murte, so you
can preview a screen you authored — with the DSL, MurteStudio, or by hand — in any
browser (desktop or a phone on the same network).

## Run

From `packages/murte`:

```sh
npm run preview-app
```

Vite serves the page and opens it. It uses the local `src/MurteCore` sources, so
changes to the framework show up immediately.

## Use it

Replace `Resources/Screen.json` with your own payload; the page reloads.

The app registers one custom component as an example of extending the built-ins: an
`image` that loads a `url` (a remote link or an embedded `data:` URL), falling back to
a labelled placeholder for a missing named asset. It also uses relaxed validation
bounds so oversized preview payloads still load; production apps keep the strict
defaults.
