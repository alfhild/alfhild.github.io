import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Liquid } from "liquidjs";

const root = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.join(root, "src");
export const PUBLIC = path.join(root, "public");
export const PARTIALS = path.join(SRC, "_partials");
export const DIST = path.join(root, "dist");
export const DATA = path.join(root, "data.json");
const PHONE = /^\+46(\d{3})(\d{6})$/;

const KEY = /^[a-z][a-z0-9_]*$/;

function leaves(value, at = "") {
  if (typeof value === "string" && at) return [[at, value]];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(at ? `data.json: "${at}" must be a string or a group of them` : "data.json: must hold a group of values");
  }
  const entries = Object.entries(value);
  if (!entries.length) throw new Error(at ? `data.json: "${at}" is an empty group` : "data.json: is empty");
  return entries.flatMap(([key, child]) => {
    const path = at ? `${at}.${key}` : key;
    if (!KEY.test(key)) throw new Error(`data.json: "${path}" must be snake_case: lowercase letters, digits and _`);
    return leaves(child, path);
  });
}

function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const values = new Map(leaves(data));
  for (const [at, value] of values) {
    if (/[<>&"\\\r\n]/.test(value)) {
      throw new Error(`data.json: "${at}" must be a plain string without < > & " \\ or line breaks`);
    }
  }
  if (!PHONE.test(data.contact?.phone)) throw new Error('data.json: "contact.phone" must look like +46762482220');
  return { data, values };
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

const COMMENT = /\/\*|<!--/;

const liquid = new Liquid({
  root: SRC,
  partials: PARTIALS,
  relativeReference: false,
  strictVariables: true,
  strictFilters: true,
  greedy: false,
});
const formatPhone = (format) => (value) => {
  if (!PHONE.test(value)) throw new Error(`the phone filters need a number like +46762482220, not "${value}"`);
  return value.replace(PHONE, format);
};
liquid.registerFilter("phone_display", formatPhone("+46(0)$1-$2"));
liquid.registerFilter("phone_vcard", formatPhone("+46 $1 $2"));

function render(rel, { data, values }, used) {
  const template = liquid.parseFileSync(rel);
  for (const at of liquid.globalFullVariablesSync(template)) {
    if (!values.has(at)) {
      const group = [...values.keys()].some((key) => key.startsWith(`${at}.`));
      throw new Error(`${rel}: {{ ${at} }} ${group ? "is a group: print one of its values" : "is not a value in data.json"}`);
    }
    if (rel.endsWith(".vcf") && /[,;]/.test(values.get(at))) {
      throw new Error(`${rel}: the value of {{ ${at} }} contains a comma or semicolon, which a vCard would need escaped`);
    }
    used.add(at);
  }
  try {
    return liquid.renderSync(template, data);
  } catch (error) {
    throw new Error(`${rel}: ${error.message}`);
  }
}

export function build() {
  const site = loadData();
  const used = new Set();
  const files = new Map();
  const origin = new Map();
  const add = (rel, from, write) => {
    if (origin.has(rel)) throw new Error(`${rel} exists in both ${origin.get(rel)}/ and ${from}/`);
    origin.set(rel, from);
    files.set(rel, write);
  };

  for (const rel of walk(SRC, "", /^[._]/)) {
    const text = render(rel, site, used);
    if (COMMENT.test(text)) throw new Error(`${rel}: a comment is left in the output`);
    add(rel, "src", (dest) => fs.writeFileSync(dest, text));
  }
  for (const rel of walk(PUBLIC)) {
    add(rel, "public", (dest) => fs.copyFileSync(path.join(PUBLIC, rel), dest));
  }

  const unused = [...site.values.keys()].filter((at) => !used.has(at));
  if (unused.length) throw new Error(`data keys that no template uses: ${unused.join(", ")}`);

  fs.rmSync(DIST, { recursive: true, force: true });
  for (const [rel, write] of files) {
    const dest = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    write(dest);
  }
  console.log(`built ${files.size} files into dist/: ${[...files.keys()].join(", ")}`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
