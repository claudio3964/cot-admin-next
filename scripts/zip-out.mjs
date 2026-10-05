// Arma el zip de out/ para subir a Netlify (Deploys → arrastrar el zip).
//
// Formato: solo entradas de archivo (ninguna entrada de carpeta), rutas con "/",
// external_attr = 0o100666 << 16. Un zip con entradas de carpeta y atributos en 0
// hizo que Netlify publicara solo los archivos de la raíz, sin avisar (05/10/2026:
// todo /_next/* y /dashboard/* en 404, panel en blanco).
//
// Uso: npm run build && npm run zip
// Salida: cot-admin-next-out-<AAAAMMDD>-<sha>[-dirty].zip en la raíz del repo.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const OUT = "out";

if (!existsSync(join(OUT, "index.html"))) {
  console.error("No existe out/index.html — correr `npm run build` primero.");
  process.exit(1);
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listFiles(p) : [p];
  });
}

const files = listFiles(OUT)
  .map((p) => ({ path: p, name: relative(OUT, p).split(sep).join("/") }))
  .sort((a, b) => (a.name < b.name ? -1 : 1));

// Cada asset que referencia index.html tiene que estar en out/.
const index = readFileSync(join(OUT, "index.html"), "utf8");
const names = new Set(files.map((f) => f.name));
const missing = [...new Set(index.match(/\/_next\/[^"\\]+/g) ?? [])].filter(
  (a) => !names.has(a.slice(1)),
);
if (missing.length) {
  console.error("index.html referencia assets que no están en out/:", missing);
  process.exit(1);
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

const EXTERNAL_ATTR = (0o100666 << 16) >>> 0;
const locals = [];
const centrals = [];
let offset = 0;

for (const f of files) {
  const data = readFileSync(f.path);
  const deflated = deflateRawSync(data);
  const stored = deflated.length >= data.length;
  const body = stored ? data : deflated;
  const nameBuf = Buffer.from(f.name, "utf8");
  const flags = /^[\x20-\x7e]*$/.test(f.name) ? 0 : 0x0800;
  const { time, date } = dosDateTime(statSync(f.path).mtime);
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(flags, 6);
  local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by (MS-DOS, 2.0)
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(flags, 8);
  central.writeUInt16LE(stored ? 0 : 8, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(EXTERNAL_ATTR, 38);
  central.writeUInt32LE(offset, 42);

  locals.push(local, nameBuf, body);
  centrals.push(central, nameBuf);
  offset += local.length + nameBuf.length + body.length;
}

const centralDir = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);

const git = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const sha = git("git rev-parse --short HEAD");
const dirty = git("git status --porcelain --untracked-files=no") ? "-dirty" : "";
const d = new Date();
const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const zipName = `cot-admin-next-out-${stamp}-${sha}${dirty}.zip`;

writeFileSync(zipName, Buffer.concat([...locals, centralDir, end]));
console.log(`${zipName}: ${files.length} archivos, ${files.filter((f) => f.name.startsWith("_next/")).length} en _next/`);
if (dirty) console.warn("Ojo: hay cambios sin commitear — el zip no corresponde exactamente a", sha);
