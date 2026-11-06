import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { build, DATA, DIST, PUBLIC, SRC } from "./build.mjs";

const port = Number(process.env.PORT ?? 8000);
const host = process.env.HOST ?? "127.0.0.1";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".vcf": "text/x-vcard",
};

function rebuild() {
  try {
    build();
  } catch (error) {
    console.error(error.message);
  }
}

function locate(url) {
  const rel = decodeURIComponent(url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(DIST, rel);
  if (!file.startsWith(DIST + path.sep)) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function respond(req, res) {
  let file;
  try {
    file = locate(req.url);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }
  const target = file ?? path.join(DIST, "404.html");
  fs.readFile(target, (error, body) => {
    if (error) {
      res.writeHead(503).end("Rebuilding, try again");
      return;
    }
    res.writeHead(file ? 200 : 404, {
      "Content-Type": TYPES[path.extname(target)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  });
}

rebuild();
let timer;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 100);
};
for (const dir of [SRC, PUBLIC]) fs.watch(dir, { recursive: true }, schedule);
fs.watch(path.dirname(DATA), (_, name) => {
  if (!name || name === path.basename(DATA)) schedule();
});

const server = http.createServer(respond);
server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is in use; try PORT=8001 npm run dev` : error.message);
  process.exit(1);
});
server.listen(port, host, () => {
  console.log(`Serving dist/ at http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`);
  if (host === "0.0.0.0") {
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const a of addresses ?? []) if (a.family === "IPv4" && !a.internal) console.log(`  on your network: http://${a.address}:${port}/`);
    }
  }
  console.log("Rebuilding when src/, public/ or data.json change. Unknown paths get the 404 page, like Pages. Ctrl-C to stop.");
});
