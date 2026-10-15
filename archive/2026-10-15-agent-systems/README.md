# Agent Systems / Reef / Poseidon archive

Archived on 15 October 2026 at the user's request to remove Agent Systems from the active Koralli site while preserving the work completely. This folder is outside the build inputs and outputs and is not covered by the repository's local artwork ignore rule.

The original baseline is Git revision `2200ff0930b5e70f555ce629649c8c9a38ed9397`. All 111 original files in `manifest.json` are preserved byte for byte. The manifest records each original path, archive path, role, byte count and SHA-256 checksum. Files copied from the baseline include the original shared dependencies, so later edits to the active site cannot change this snapshot.

## What is preserved

- `src/agent-systems.html`, its dedicated stylesheet, `yfalos-explainer.mjs`, `poseidon-sea.mjs`, `poseidon-thunder.mjs`, the Poseidon image and the workspace preview image. These seven exclusive source files were moved here, not discarded.
- The corresponding seven original `dist/` files, including the expanded page with its original navigation, footer and versioned asset URLs. These were also moved out of the active output.
- Original copies of all the page's shared styles, local fonts, header artwork and JavaScript dependencies. The shared `site.js` dynamic import closure and the computed workflow asset families are included. Shared files remain in the active source; the archive holds independent copies.
- Original `src/sections/nav.html`, `src/sections/footer.html`, `scripts/build.mjs`, `package.json` and `original-README.md` as integration references.

`inspection-objects.mjs` remains active because the Our Work animation uses it as well as the archived explainer. The existing `scripts/check-*.mjs` tests had no imports or references to the seven removed source files; no tests were removed. The sibling `agent_workspace` repository and its separate public prototype were not modified.

## Verify preservation

From the `new_site` project directory:

```sh
node archive/2026-10-15-agent-systems/verify.mjs
```

Expected result: 111 original files, 3,954,599 bytes, all matching their SHA-256 values. The manifest was created from the original baseline bytes, and the moved files were checked against that baseline before moving and against the manifest afterwards.

## Preview the exact archived page

The original rendered page and its dependencies are self-contained under this archive's `dist/`. Serve that directory as a separate local site:

```sh
python3 -m http.server 4184 --bind 127.0.0.1 --directory archive/2026-10-15-agent-systems/dist
```

Open `http://127.0.0.1:4184/agent-systems.html`. Do not run the archived build script: it is an integration reference, not a separate copy of every Koralli page. The page's existing navigation to other Koralli pages remains visually intact, but those other pages are not duplicated in this snapshot. External links still point to the separate Reef prototype.

This static preview preserves the original HTML, artwork, animations, interaction and opt-in sound. As before, it is an interface prototype; no model execution or live company systems are connected. Browser support and the external prototype remain external dependencies.

## Restore the page into the current site

1. Verify the archive using the command above.
2. Preview the source restoration, then apply it:

   ```sh
   node archive/2026-10-15-agent-systems/restore-source.mjs
   node archive/2026-10-15-agent-systems/restore-source.mjs --apply
   ```

   This copies only the seven exclusive source files back to their original paths. It does not overwrite a different existing file, replace shared files or copy old rendered files over the current site.

3. Add `'agent-systems.html'` back to the `pages` list in the current `scripts/build.mjs`.
4. Restore the navigation entry in `src/sections/nav.html`:

   ```html
   <a href="/agent-systems.html" class="nav-agents">AGENT SYSTEMS</a>
   ```

   Restore the footer entry in `src/sections/footer.html`:

   ```html
   <a href="/agent-systems.html">AGENT SYSTEMS</a>
   ```

5. Compare any changed shared styles/modules with this snapshot if exact historical appearance is needed. The complete original page remains available in the independent archive preview; avoid overwriting current shared files wholesale, since that would revert unrelated site work.
6. Run `npm run build`, `npm run check` and `npm run check:artwork`, then review the restored page at desktop and mobile widths. Update the main README's archive status if the page returns to the active site.

The archive itself should remain unchanged after restoration, preserving a reliable original reference.
