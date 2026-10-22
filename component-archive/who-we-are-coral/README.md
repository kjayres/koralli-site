# Who We Are coral tree

The animated coral beside the opening of Who We Are: a fine trace that grew through dots in the
water, colouring each as a researcher (blue) or an operator (coral), and redrew a new study every
few seconds. Archived in October 2026 so the coral lives in one place, the Adapt & Grow stage on
Our Work, and the people and portraits carry this page.

- `work-coral.html`: the section, from `src/sections/`, included after the opening text.
- `work-coral.css`: its styles, from `src/styles/`, linked from `src/who-we-are.html`.
- `who-we-are-markup.html`: the opening as it was, with the coral column.

The drawing code stays in `src/scripts/art/coral.mjs` (`drawWorkCoralTrace`), alongside the coral
studies that Our Work still uses, and `src/scripts/site.js` still knows the `work-coral` canvas.
To restore it, move the two files back, put the markup back in `src/who-we-are.html` with the
stylesheet link, and run `npm run build`, `npm run check` and `npm run check:artwork`.
