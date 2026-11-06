import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.join(root, "src");
export const PUBLIC = path.join(root, "public");
export const PARTIALS = path.join(SRC, "_partials");
export const DIST = path.join(root, "dist");
const STAGING = path.join(root, "dist.tmp");
export const DATA = path.join(root, "data.json");

function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" || /[<>&"\\\r\n]/.test(value)) {
      throw new Error(`data.json: "${key}" must be a plain string without < > & " \\ or line breaks`);
    }
  }
  const phone = /^\+46(\d{3})(\d{6})$/.exec(data.phone);
  if (!phone) throw new Error('data.json: "phone" must look like +46762482220');
  return {
    ...data,
    phoneDisplay: `+46(0)${phone[1]}-${phone[2]}`,
    phoneVcard: `+46 ${phone[1]} ${phone[2]}`,
  };
}

function* walk(dir, rel = "", skip = /^\./) {
  const entries = fs.readdirSync(path.join(dir, rel), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (skip.test(entry.name)) continue;
    const entryRel = path.join(rel, entry.name);
    if (entry.isDirectory()) yield* walk(dir, entryRel, skip);
    else yield entryRel;
  }
}

function expand(text, file, usedPartials) {
  return text.replace(/^([ \t]*)\{\{> ([\w.-]+)\}\}\n/gm, (_, indent, name) => {
    const source = path.join(PARTIALS, name);
    if (!fs.existsSync(source)) throw new Error(`${file}: no partial named ${name}`);
    const body = fs.readFileSync(source, "utf8");
    if (/\{\{|\}\}/.test(body)) throw new Error(`${path.relative(root, source)}: a partial cannot contain placeholders`);
    usedPartials.add(name);
    return body.replace(/^(?=.)/gm, indent) + (body.endsWith("\n") ? "" : "\n");
  });
}

function render(text, data, file, used) {
  const vcard = file.endsWith(".vcf");
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in data)) throw new Error(`${file}: no data for {{${key}}}`);
    if (vcard && /[,;]/.test(data[key])) {
      throw new Error(`${file}: the value of {{${key}}} contains a comma or semicolon, which a vCard would need escaped`);
    }
    used.add(key);
    return data[key];
  });
}

export function build() {
  const data = loadData();
  const used = new Set();
  const usedPartials = new Set();
  const origin = new Map();

  fs.rmSync(STAGING, { recursive: true, force: true });
  try {
    const place = (rel, from) => {
      if (origin.has(rel)) throw new Error(`${rel} exists in both ${origin.get(rel)}/ and ${from}/`);
      origin.set(rel, from);
      const dest = path.join(STAGING, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      return dest;
    };

    for (const rel of walk(SRC, "", /^[._]/)) {
      const text = render(expand(fs.readFileSync(path.join(SRC, rel), "utf8"), rel, usedPartials), data, rel, used);
      if (/\{\{|\}\}/.test(text)) throw new Error(`${rel}: unresolved placeholder left in the output`);
      fs.writeFileSync(place(rel, "src"), text);
    }
    for (const rel of walk(PUBLIC)) {
      fs.copyFileSync(path.join(PUBLIC, rel), place(rel, "public"));
    }

    const unused = Object.keys(data).filter((key) => !used.has(key));
    if (unused.length) throw new Error(`data keys that no template uses: ${unused.join(", ")}`);

    const idle = fs.existsSync(PARTIALS) ? [...walk(PARTIALS)].filter((name) => !usedPartials.has(name)) : [];
    if (idle.length) throw new Error(`partials that no page includes: ${idle.join(", ")}`);

    const actual = [...walk(STAGING)].sort();
    if (actual.join("\n") !== [...origin.keys()].sort().join("\n")) {
      throw new Error(`the build does not hold exactly the expected files:\n${actual.join("\n")}`);
    }

    fs.rmSync(DIST, { recursive: true, force: true });
    fs.renameSync(STAGING, DIST);
    console.log(`built ${actual.length} files into dist/: ${actual.join(", ")}`);
  } finally {
    fs.rmSync(STAGING, { recursive: true, force: true });
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
