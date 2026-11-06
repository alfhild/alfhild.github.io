# alfhild.io

Source for https://www.alfhild.io.

- `public/` is the website. The deploy workflow publishes it exactly as it is, so anything in there is public and nothing outside it is.
- `./validate.sh` checks the HTML, CSS, SVG and vCard (needs Java and npx).
- Pushes to `main` are validated and deployed by `.github/workflows/deploy.yml`.
