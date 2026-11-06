#!/bin/sh
# Build the site and validate what is published (dist/): HTML + inline CSS
# with the W3C Nu validator, plus basic checks of the vCard and robots.txt.
# Requires Node and Java.
set -eu
cd "$(dirname "$0")"
root=$(pwd)

[ -d node_modules ] || npm ci --silent
node build.mjs
cd dist

"$root/node_modules/.bin/vnu" --also-check-css index.html 404.html
"$root/node_modules/.bin/vnu" --svg favicon.svg

vcf=uliedberg_alfhild.vcf
[ "$(head -n 1 "$vcf" | tr -d '\r')" = "BEGIN:VCARD" ] || { echo "$vcf: must start with BEGIN:VCARD" >&2; exit 1; }
[ "$(tail -n 1 "$vcf" | tr -d '\r')" = "END:VCARD" ] || { echo "$vcf: must end with END:VCARD" >&2; exit 1; }
grep -q '^VERSION:3.0' "$vcf" || { echo "$vcf: expected VERSION:3.0" >&2; exit 1; }
if grep -qv "$(printf '\r')\$" "$vcf"; then echo "$vcf: lines must end with CRLF" >&2; exit 1; fi

robots=robots.txt
if grep -nivE '^[[:space:]]*($|#|(user-agent|sitemap):[[:space:]]*[^[:space:]]|(allow|disallow):)' "$robots"; then
  echo "$robots: the lines above are not blank, comments or known directives" >&2; exit 1
fi
first=$(grep -ivE '^[[:space:]]*(#|$)' "$robots" | head -n 1)
printf '%s\n' "$first" | grep -qi '^user-agent:' || { echo "$robots: the first directive must be User-agent" >&2; exit 1; }
if grep -niE '^[[:space:]]*(allow|disallow):[[:space:]]*[^/*[:space:]]' "$robots"; then
  echo "$robots: Allow/Disallow paths must start with / or *" >&2; exit 1
fi
