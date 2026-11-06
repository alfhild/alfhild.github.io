#!/bin/sh
# Validate the site: HTML + inline CSS with the W3C Nu validator, plus a
# basic structural check of the vCard. Requires Java and npx; nothing is
# installed in the repo.
set -eu
cd "$(dirname "$0")"

npx --yes vnu-jar --also-check-css index.html

vcf=uliedberg_alfhild.vcf
[ "$(head -n 1 "$vcf" | tr -d '\r')" = "BEGIN:VCARD" ] || { echo "$vcf: must start with BEGIN:VCARD" >&2; exit 1; }
[ "$(tail -n 1 "$vcf" | tr -d '\r')" = "END:VCARD" ] || { echo "$vcf: must end with END:VCARD" >&2; exit 1; }
grep -q '^VERSION:3.0' "$vcf" || { echo "$vcf: expected VERSION:3.0" >&2; exit 1; }
if grep -qv "$(printf '\r')\$" "$vcf"; then echo "$vcf: lines must end with CRLF" >&2; exit 1; fi
