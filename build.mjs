import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, "src");
const PUBLIC = path.join(root, "public");
const DIST = path.join(root, "dist");

function loadData() {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));
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

function build() {
  const data = loadData();
  const used = new Set();
  const origin = new Map();

  fs.rmSync(DIST, { recursive: true, force: true });

  const place = (rel, from) => {
    if (origin.has(rel)) throw new Error(`${rel} exists in both ${origin.get(rel)}/ and ${from}/`);
    origin.set(rel, from);
    const dest = path.join(DIST, rel);
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

  const actual = [...walk(DIST)].sort();
  if (actual.join("\n") !== [...origin.keys()].sort().join("\n")) {
    throw new Error(`dist/ does not hold exactly the expected files:\n${actual.join("\n")}`);
  }
  console.log(`built ${actual.length} files into dist/: ${actual.join(", ")}`);
}

const watch = process.argv.includes("--watch");
try {
  build();
} catch (error) {
  console.error(error.message);
  if (!watch) process.exit(1);
}

if (watch) {
  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (error) {
        console.error(error.message);
      }
    }, 100);
  };
  fs.watch(SRC, { recursive: true }, rebuild);
  fs.watch(PUBLIC, { recursive: true }, rebuild);
  fs.watch(path.join(root, "data.json"), rebuild);
  console.log("watching src/, public/ and data.json; Ctrl-C to stop");
}
