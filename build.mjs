import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.join(root, "src");
export const PUBLIC = path.join(root, "public");
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

function* walk(dir, rel = "") {
  const entries = fs.readdirSync(path.join(dir, rel), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith(".")) continue;
    const entryRel = path.join(rel, entry.name);
    if (entry.isDirectory()) yield* walk(dir, entryRel);
    else yield entryRel;
  }
}

function render(text, data, file, used) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in data)) throw new Error(`${file}: no data for {{${key}}}`);
    used.add(key);
    return data[key];
  });
}

export function build() {
  const data = loadData();
  const used = new Set();
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

    for (const rel of walk(SRC)) {
      const text = render(fs.readFileSync(path.join(SRC, rel), "utf8"), data, rel, used);
      if (/\{\{|\}\}/.test(text)) throw new Error(`${rel}: unresolved placeholder left in the output`);
      fs.writeFileSync(place(rel, "src"), text);
    }
    for (const rel of walk(PUBLIC)) {
      fs.copyFileSync(path.join(PUBLIC, rel), place(rel, "public"));
    }

    const unused = Object.keys(data).filter((key) => !used.has(key));
    if (unused.length) throw new Error(`data keys that no template uses: ${unused.join(", ")}`);

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
