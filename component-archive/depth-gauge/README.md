# Depth gauge

A fixed marker on the right edge of the home page. It read "DEPTH", ran a coral dot down a
short line as the page scrolled, and counted from −000 M to −120 M. It appeared once the
building section reached the top of the screen, and switched from ink to paper as the water
darkened. It was hidden on phones and for people who prefer reduced motion.

Replaced on the home page by the anchor (`src/scripts/sea-anchor.mjs`) in October 2026.

## Files

- `depth-gauge.html`: the markup, which sat in `src/index.html`.
- `depth-gauge.css`: every rule that styled it, with the file and media query each came from.
- `depth-gauge.js`: the scroll code from `src/scripts/site.js`.

## Restoring it

Put each piece back where its comment says it came from. Nothing in `component-archive/`
is built or published.
