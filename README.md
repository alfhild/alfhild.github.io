# alfhild.io

Source for https://www.alfhild.io.

- `public/` is the website. The deploy workflow publishes it exactly as it is, so anything in there is public and nothing outside it is.
- `./validate.sh` checks the HTML, CSS, SVG and vCard (needs Java and npx).
- Pushes to `main` are validated and deployed by `.github/workflows/deploy.yml`.

## If a deploy fails

The live site keeps serving the last successful deploy, so nothing is broken while you sort it out.

- **Retry the failed job:** Actions, open the failed run, "Re-run failed jobs". Build and deploy are separate jobs, so the artifact is reused.
- **Or start a fresh run:** Actions, Deploy, "Run workflow" on `main`.
- **Prefer "Re-run failed jobs" over "Re-run all jobs".** Re-running the build uploads a second `github-pages` artifact to the same run, and the deploy can then fail with `Multiple artifacts named "github-pages"` (this is what happened when the artifact upload and the deploy were still one job).
- **`due to in progress deployment`:** GitHub allows one Pages deployment at a time, and rejects a second instead of queueing it. Wait for the stuck one to finish or time out (a cancel can take several minutes to settle), then retry.
- **`Deployment failed, try again later`** (no other detail): GitHub's backend. Check githubstatus.com, wait a few minutes, then start a fresh run.
