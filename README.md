# TruthLens — Sketchbook UI

This package is a Vite + React frontend that adapts the tactile sketchbook/page-turn visual language to the existing TruthLens product concept.

## Included TruthLens routes

- `/` — sketchbook-inspired TruthLens home
- `/scan` — food scan/upload UI
- `/history` — scan history UI
- `/durva` — dedicated Durva assistant UI
- `/limits`
- `/pricing`
- `/contact`
- `/login`

## Existing TruthLens styling preserved

- Parrot Green: `#7CFC00`
- Light grey/paper backgrounds
- Glass/translucent controls
- Instrument Serif + Newsreader visual direction
- Mobile-first responsive layout
- Dedicated `/durva` route

## Run

```bash
npm install
npm run dev
```

## Important source-fidelity note

The exact ThreeUI/Meng To source and its 17 registered binary assets were not available inside this execution environment, so this package does **not** claim to contain the byte-exact canonical ThreeUI document. It implements the requested TruthLens adaptation and the interaction language locally rather than inventing a dependency on an unavailable package.

To make the result byte-exact to the registered source, place the verified `meng-to-sketchbook.html` and all 17 registered assets at:

`public/landing-pages/meng-to-sketchbook/`

and wire the local iframe host described by the original skill.
