import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, "src");
const DIST = path.join(root, "dist");
const MARK = ".tmpl.";

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
  const expected = [];

  fs.rmSync(DIST, { recursive: true, force: true });
  for (const rel of walk(SRC)) {
    const isTemplate = path.basename(rel).includes(MARK);
    const out = isTemplate ? rel.replace(MARK, ".") : rel;
    const dest = path.join(DIST, out);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (isTemplate) {
      const text = render(fs.readFileSync(path.join(SRC, rel), "utf8"), data, rel, used);
      if (/\{\{|\}\}/.test(text)) throw new Error(`${rel}: unresolved placeholder left in the output`);
      fs.writeFileSync(dest, text);
    } else {
      fs.copyFileSync(path.join(SRC, rel), dest);
    }
    expected.push(out);
  }

  const unused = Object.keys(data).filter((key) => !used.has(key));
  if (unused.length) throw new Error(`data keys that no template uses: ${unused.join(", ")}`);

  const actual = [...walk(DIST)].sort();
  if (actual.join("\n") !== expected.sort().join("\n")) {
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
  fs.watch(path.join(root, "data.json"), rebuild);
  console.log("watching src/ and data.json; Ctrl-C to stop");
}
