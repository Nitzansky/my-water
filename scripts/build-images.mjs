// Copies the AI-enhanced product images into public/ and writes src/data/images.json,
// mapping each live WordPress image URL to its enhanced cutout (for cards/gallery) and
// white-background version (for social sharing / Google Shopping).
//
// usage: node scripts/build-images.mjs
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const WEB = path.resolve(import.meta.dirname, "..");
const ENHANCED = path.join(ROOT, "images-processed/products-enhanced");

function readCsv(file) {
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const nfc = (s) => s.normalize("NFC");
// live image URL -> path relative to images/products
const urlByRel = new Map();
for (const r of readCsv(path.join(ROOT, "images/manifest.csv"))) {
  if (r.local_path.startsWith("products/")) urlByRel.set(nfc(r.local_path.slice("products/".length)), nfc(r.original_url));
}
// images/products rel -> final white file
const whiteByRel = new Map();
for (const r of readCsv(path.join(ROOT, "images-final/products/index.csv"))) {
  whiteByRel.set(nfc(r.original_image.slice("images/products/".length)), path.join(ROOT, "images-final/products", r.file));
}
const report = JSON.parse(readFileSync(path.join(ENHANCED, "report.json"), "utf8"));

for (const dir of ["public/img/p", "public/img/w", "src/data"]) mkdirSync(path.join(WEB, dir), { recursive: true });

const out = {};
let missing = 0;
for (const [relRaw, info] of Object.entries(report)) {
  const rel = nfc(relRaw);
  const url = urlByRel.get(rel);
  const cutout = path.join(ENHANCED, "cutout", info.out);
  const white = whiteByRel.get(rel);
  if (!url || !existsSync(cutout) || !white || !existsSync(white)) { missing++; continue; }
  const id = createHash("sha1").update(url).digest("hex").slice(0, 12);
  copyFileSync(cutout, path.join(WEB, "public/img/p", `${id}.webp`));
  copyFileSync(white, path.join(WEB, "public/img/w", `${id}.webp`));
  const { width, height } = await sharp(cutout).metadata();
  out[url] = { cutout: `/img/p/${id}.webp`, white: `/img/w/${id}.webp`, width, height, lowRes: info.flags.includes("low-res") };
}
writeFileSync(path.join(WEB, "src/data/images.json"), JSON.stringify(out, null, 1));
console.log(`mapped ${Object.keys(out).length} images, ${missing} without a match`);
