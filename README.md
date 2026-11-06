# alfhild.io

Source for https://www.alfhild.io.

- `src/` holds the pages that take data: the home page, the 404 page and the vCard. The build fills their `{{placeholders}}` from `data.json`, and fails if one has no data or a key in `data.json` is unused.
- `public/` holds files that are copied untouched (`favicon.svg`, `robots.txt`, `hidden/`). Anything that must never be altered goes here.
- `data.json` holds the contact details once. Change them there and not in the pages.
- `npm run build` writes the result to `dist/` (git-ignored). `dist/` is exactly what gets published, so anything in there is public and nothing outside it is. `npm run dev` rebuilds on every change.
- `./validate.sh` builds and then checks `dist/`: HTML, inline CSS, SVG, vCard and robots.txt. It needs Node 22 or newer and Java.
- Pull requests upload the generated `dist/` as a `site-preview` artifact, so the shipped bytes can be inspected even though they are not in the diff.
- Pushes to `main` are validated, built and deployed by `.github/workflows/deploy.yml`.

## If a deploy fails

The live site keeps serving the last successful deploy, so nothing is broken while you sort it out.

- **Retry the failed job:** Actions, open the failed run, "Re-run failed jobs". Build and deploy are separate jobs, so the artifact is reused.
- **Or start a fresh run:** Actions, Deploy, "Run workflow" on `main`.
- **Prefer "Re-run failed jobs" over "Re-run all jobs".** Re-running the build uploads a second `github-pages` artifact to the same run, and the deploy can then fail with `Multiple artifacts named "github-pages"` (this is what happened when the artifact upload and the deploy were still one job).
- **`due to in progress deployment`:** GitHub allows one Pages deployment at a time, and rejects a second instead of queueing it. Wait for the stuck one to finish or time out (a cancel can take several minutes to settle), then retry.
- **`Deployment failed, try again later`** (no other detail): GitHub's backend. Check githubstatus.com, wait a few minutes, then start a fresh run.
