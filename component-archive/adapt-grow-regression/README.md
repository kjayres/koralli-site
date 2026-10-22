# Adapt & Grow regression

The original third stage of "How we approach the work." on Our Work: the grains assembled into a
3D cube holding a fitted plane, and every four seconds a new observation arrived, pulsed and the
plane refitted by least squares. Archived in October 2026, when the stage became a coral growing
from what Build & Learn made, since the regression asked visitors to read a statistical graphic and
broke the shared field and frame of the first two stages.

- `adaptation.mjs`: the regression, from `src/scripts/art/`.
- `check-adaptation.mjs`: its tests, from `scripts/`.
- `approach-with-regression.mjs` and `check-approach-with-regression.mjs`: `approach.mjs` and its
  tests exactly as they were, including how grains were baked back into the field on exit.
- `regression-markup-and-styles.txt`: the caption key and the styles that hid the frame.

To restore it, put `adaptation.mjs` and `check-adaptation.mjs` back, restore the two approach files
from their copies here (keeping any later Build & Learn changes), put the markup and styles back,
and run `npm run build`, `npm run check` and `npm run check:artwork`.
