#!/usr/bin/env node
// backend/src/dev/printModule.cjs

const fs = require("fs");
const path = require("path");
const minimist = require("minimist");

async function loadClipboard() {
  // clipboardy es ESM-only → hay que importarlo dinámicamente
  const mod = await import("clipboardy");
  return mod.default || mod;
}

const args = minimist(process.argv.slice(2));
const moduleName = args.module || args.m;
const includeAll = !!args.all;
const listOnly = !!args.list;

const backendRoot = path.resolve(__dirname, "..", "..");
const SRC_DIR = path.join(backendRoot, "src");
const MODULES_DIR = path.join(SRC_DIR, "modules");

function usage() {
  console.log(`
Uso:
  node src/dev/printModule.cjs --module asistencia
  node src/dev/printModule.cjs --module clientes
  node src/dev/printModule.cjs --all
  node src/dev/printModule.cjs --module asistencia --list
`);
}

if (!moduleName && !includeAll) {
  usage();
  process.exit(1);
}

if (!includeAll) {
  const available = fs.readdirSync(MODULES_DIR).filter((f) =>
    fs.statSync(path.join(MODULES_DIR, f)).isDirectory()
  );

  if (!available.includes(moduleName)) {
    console.error(`✘ El módulo "${moduleName}" no existe. Módulos disponibles:\n`);
    available.forEach((m) => console.log("  -", m));
    process.exit(1);
  }
}

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(full));
    } else if (/\.(js|cjs|mjs|json|md|yml|yaml|sql)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function relative(p) {
  return path.relative(backendRoot, p).replace(/\\/g, "/");
}

let dirsToScan = includeAll
  ? [SRC_DIR]
  : [path.join(MODULES_DIR, moduleName)];

let collectedFiles = [];

dirsToScan.forEach((d) => {
  collectedFiles.push(...getFilesRecursively(d));
});

if (listOnly) {
  console.log("Archivos encontrados:\n");
  collectedFiles.forEach((f) => console.log(" -", relative(f)));
  process.exit(0);
}

let output = "";

collectedFiles
  .sort()
  .forEach((filePath) => {
    const rel = relative(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const numbered = lines
      .map((line, i) => `${String(i + 1).padStart(4, " ")} | ${line}`)
      .join("\n");

    output += `\n\n// ===== ${rel} =====\n\n${numbered}\n`;
  });

(async () => {
  const clipboardy = await loadClipboard(); // ← Carga correcta
  await clipboardy.write(output);           // ← Funciona en Node 22

  console.log(`\n✅ Dump generado y copiado al portapapeles.`);
  console.log(`   Archivos: ${collectedFiles.length}`);
  console.log(
    `   Origen: ${
      includeAll ? "backend/src completo" : `src/modules/${moduleName}`
    }`
  );
  console.log("   Listo para pegar en ChatGPT.\n");
})();
