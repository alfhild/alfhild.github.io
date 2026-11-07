# alfhild.io

Source for https://www.alfhild.io.

## Layout and commands

- `src/` holds the pages that take data: the home page, the 404 page and the vCard. The build fills their `{{placeholders}}` from `data.json`, and fails if one has no data or a key in `data.json` is unused.
- `public/` holds files that are copied untouched (`favicon.svg`, `robots.txt`). Anything that must never be altered goes here. `hidden/` is kept for later but holds only a `.gitkeep`, and dotfiles are never copied, so it ships nothing until it contains a real file.
- `src/_partials/` holds snippets shared between pages. Names that start with `.` or `_` are never published. A line that contains only `/*# include "name" */` (inside `<style>`) or `<!--# include "name" -->` (in HTML) is replaced by `src/_partials/name`, re-indented to where the line sits. The token is a comment on purpose, so editors read the page as valid CSS and HTML; the `#` after the opener marks it as a directive, like `/*# sourceMappingURL=… */` or `<!--#include … -->`. For the same reason the build fails if any comment is left in a rendered file, which also catches a mistyped include. Today `base.css` (the palette, the page, link and heading styles) is shared by the home page and the 404. Partials are not published and cannot contain placeholders; a missing partial, or one that no page includes, fails the build.
- `data.json` holds the contact details once, plus the short tagline texts that are reused in the meta tags. The body prose stays in `src/index.html`. Values may not contain `< > & " \` or line breaks, and values used in the vCard may not contain `,` or `;` (a vCard would need them escaped); the build says so if they do. `vcardRev` is the vCard's last-revised stamp: bump it when the contact details change. It is cosmetic, and deriving it from git would make the shipped file depend on history.
- `npm run build` writes the result to `dist/` (git-ignored). `dist/` is exactly what gets published, so anything in there is public and nothing outside it is. A failed build leaves the previous `dist/` in place.
- `npm run dev` rebuilds on every change and serves `dist/` at http://localhost:8000 (`PORT=8001 npm run dev` for another port). Unknown paths get the 404 page, like Pages. `HOST=0.0.0.0 npm run dev` also serves it on your network, for trying it on a phone; copying to the clipboard needs a secure context, so it only works on localhost and on the real site.
- `./validate.sh` builds and then checks `dist/`: HTML, inline CSS, SVG, vCard and robots.txt. It needs Node 22 or newer and Java.
- Pull requests upload the generated `dist/` as a `site-preview` artifact, so the shipped bytes can be inspected even though they are not in the diff.
- Pushes to `main` are validated, built and deployed by `.github/workflows/deploy.yml`.

## Principles

- **The files that ship are easy to read and clean:** hand-formatted, no comments, no placeholders, no generator banners or timestamps. Noise on the development side is fine; in `dist/` it is not. The build fails if a comment or an unresolved placeholder is left in a rendered file, and it checks that `dist/` holds exactly the expected files. The rest (formatting, no banners or timestamps) is kept by convention and review, so check it when you change a template.
- **Everything is inlined:** one HTML file per page, no stylesheet or script files, so pages load instantly. No web fonts: a system monospace stack.
- **Modern browsers only:** `light-dark()`, `text-wrap` and CSS `content` alt text are fine.
- **The look is Gruvbox Material (medium),** to match the author's terminal, with `#` and `##` heading markers. Orange is used only on those markers and on the copy flash.

## Design decisions

- The theme toggle is a quiet development aid: not persisted, top right.
- There is no always-visible "copy" hint on touch devices; the numbers have a dotted underline instead. The hint appears on hover or focus and, as "copied" or "failed", after a click, fading out together with the colour.
- Side padding stays at 1em. Safari's double-tap zoom pads the tapped block by 5% per side, so a wider margin makes the page zoom.
- `public/hidden/` and `Disallow: /hidden` in `robots.txt` stay, for historical reasons.
- Contact details live once, in `data.json`. Duplication is removed in the build and not policed by consistency checks.
- Dependencies are pinned with a lockfile, and install scripts are off (`.npmrc`).

## Making changes

- One change per branch, opened as a pull request and squash-merged, so `main` stays linear. The squash commit takes the PR title and description, so write those as the commit message.
- Head branches are deleted when a pull request merges. Never push to a branch whose pull request is merged; start a new branch from `main`.
- After a merge, check the deploy run, then compare the live files with a fresh `node build.mjs` (`curl -s URL | cmp - dist/FILE`).
- Compare behaviour, not only bytes. When the output is meant to change, show before and after in a real browser (light and dark, several widths) and say exactly what differs.

## Gotchas

- Headless Chrome with `--virtual-time-budget` never advances CSS animations or fires their events. To test animations, drive Chrome in real time over the DevTools protocol.
- `validate.sh` runs the installed `vnu` directly, because `npx vnu --svg` printed a stray npm version.
- The vCard needs CRLF line endings: `.gitattributes` has `*.vcf -text` and the build writes it untouched.

## If a deploy fails

The live site keeps serving the last successful deploy, so nothing is broken while you sort it out.

- **Retry the failed job:** Actions, open the failed run, "Re-run failed jobs". Build and deploy are separate jobs, so the artifact is reused.
- **Or start a fresh run:** Actions, Deploy, "Run workflow" on `main`.
- **Prefer "Re-run failed jobs" over "Re-run all jobs".** Re-running the build uploads a second `github-pages` artifact to the same run, and the deploy can then fail with `Multiple artifacts named "github-pages"` (this is what happened when the artifact upload and the deploy were still one job).
- **`due to in progress deployment`:** GitHub allows one Pages deployment at a time, and rejects a second instead of queueing it. Wait for the stuck one to finish or time out (a cancel can take several minutes to settle), then retry.
- **`Deployment failed, try again later`** (no other detail): GitHub's backend. Check githubstatus.com, wait a few minutes, then start a fresh run.
