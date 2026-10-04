# Exact Meng To Sketchbook source integration

The user-provided skill requires byte-exact use of:

`public/landing-pages/meng-to-sketchbook.html`

with the 17 registered local assets under:

`public/landing-pages/meng-to-sketchbook/`

This environment could not retrieve the canonical ThreeUI source during generation. Therefore the project intentionally avoids pretending that the supplied hashes/assets were reproduced.

When the verified source bundle is available, the intended architecture is:

```tsx
<iframe
  src="/landing-pages/meng-to-sketchbook.html"
  title="TruthLens Sketchbook"
  allow="forms; modals; downloads; popups; scripts"
/>
```

The TruthLens product shell should remain outside the iframe. Use the original HTML document inside the landing-page frame without rewriting its authored renderer.
