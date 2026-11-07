# alfhild.io

The contact page for Ulf Liedberg / Alfhild Consulting AB, published with GitHub Pages at https://www.alfhild.io. The layout, the commands and what to do when a deploy fails are in `README.md`. This file holds what the code does not say.

## What the owner cares about
- **The files that ship are easy to read and squeaky clean:** hand-formatted, no comments, no placeholders, no generator banners or timestamps. Noise on the developer side is fine; in `dist/` it is not. `build.mjs` and `validate.sh` enforce this, so keep them enforcing it.
- **Everything is inlined** (one HTML file per page, no stylesheet or script files) so pages load instantly. No web fonts: a system monospace stack.
- **Modern browsers only:** `light-dark()`, `text-wrap` and CSS `content` alt text are fine.
- **The look:** Gruvbox Material (medium) to match the owner's terminal, `#` and `##` heading markers, orange only on those markers and on the copy flash.

## Decisions already made
- The theme toggle is a quiet dev aid: not persisted, top right.
- No always-visible "copy" hint on touch devices; the numbers have a dotted underline instead. The hint appears on hover or focus and, as "copied" or "failed", after a click, fading out together with the colour.
- Side padding stays at 1em. Safari's double-tap zoom pads the tapped block by 5% per side, so a wider margin makes the page zoom.
- `public/hidden/` and `Disallow: /hidden` in `robots.txt` stay, for historical reasons.
- Contact details live once, in `data.json`. Do not add checks that keep files consistent; remove duplication in the build instead.
- Dependencies are pinned with a lockfile, and install scripts are off (`.npmrc`).

## How we work
- One change per branch, opened as a pull request. The owner reviews and says when to merge; the history uses merge commits (`gh pr merge --merge`).
- Head branches are deleted when a PR merges. Never push to a branch whose PR is merged; start a new branch from `main`.
- After a merge, check the deploy run, then compare the live files with a fresh `node build.mjs` (`curl -s URL | cmp - dist/FILE`).
- Compare behaviour, not only bytes. When the output is meant to change, show before and after in a real browser (light and dark, several widths) and say exactly what differs.
- `experience.pdf` is a local scratch file excluded through `.git/info/exclude`; never commit it.

## Traps
- Headless Chrome with `--virtual-time-budget` never advances CSS animations or fires their events. To test animations, drive Chrome in real time over the DevTools protocol.
- `validate.sh` runs the installed `vnu` directly, because `npx vnu --svg` printed a stray npm version.
- The vCard needs CRLF line endings: `.gitattributes` has `*.vcf -text` and the build writes it untouched. Values used in it cannot contain `,` or `;`.
- zsh does not split an unquoted variable into words, so loop over names instead of passing `$list`.
- To retry a failed deploy, use "Re-run failed jobs", not "Re-run all jobs": build and deploy are separate jobs so the artifact is reused.
- GitHub's Pages backend stalls now and then (10-minute timeouts, "Deployment failed, try again later"). It also hit the old managed workflow, so it is not ours to fix; see the README.
