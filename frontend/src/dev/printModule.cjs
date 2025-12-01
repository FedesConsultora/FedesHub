#!/usr/bin/env node
// frontend/src/dev/printModule.cjs

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

// Envolvemos todo en una función asíncrona principal para poder usar await
(async () => {
  try {
    const args = minimist(process.argv.slice(2));
    const moduleName = args.module || args.m;
    const listOnly = !!args.list;
    const includeAll = !!args.all;

    // Raíces
    const projectRoot = path.resolve(__dirname, '..', '..'); // frontend/
    const SRC_DIR = path.join(projectRoot, 'src');

    // Mapear módulos a carpetas relevantes del front
    const MODULES = {
      tareas: [
        path.join(SRC_DIR, 'pages', 'Tasks'),
        path.join(SRC_DIR, 'api', 'tasks'),
        path.join(SRC_DIR, 'components', 'Tasks'),
      ],
      feders: [
        path.join(SRC_DIR, 'pages', 'Feders'),
        path.join(SRC_DIR, 'api', 'feders'),
        path.join(SRC_DIR, 'components', 'Feders'),
      ],
      clientes: [
        path.join(SRC_DIR, 'pages', 'Clientes'),
        path.join(SRC_DIR, 'api', 'clientes'),
        path.join(SRC_DIR, 'components', 'Clientes'),
      ],
      asistencia: [
        path.join(SRC_DIR, 'pages', 'Asistencia'),
        path.join(SRC_DIR, 'api', 'asistencia'),
        path.join(SRC_DIR, 'components', 'Asistencia'),
        path.join(SRC_DIR, 'realtime', 'asistencia'),
      ],
    };

    function printUsage() {
      console.log(`
    Uso:
      node src/dev/printModule.cjs --module tareas
      node src/dev/printModule.cjs --module clientes
      node src/dev/printModule.cjs --all              # dump de TODO frontend/src
      node src/dev/printModule.cjs --module tareas --list

    Flags:
      --module, -m   Nombre lógico del módulo (tareas, feders, clientes, asistencia, ...)
      --all          Ignora módulos y vuelca TODO frontend/src
      --list         Sólo lista archivos, no los copia al portapapeles
    `);
    }

    if (!moduleName && !includeAll) {
      printUsage();
      process.exit(1);
    }

    function getFilesRecursively(dir) {
      if (!fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      const files = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getFilesRecursively(fullPath));
        } else {
          // Extensiones permitidas
          if (/\.(js|jsx|ts|tsx|json|scss|css|md)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
      return files;
    }

    function relativeFromRoot(p) {
      return path.relative(projectRoot, p).replace(/\\/g, '/');
    }

    let targetDirs = [];

    if (includeAll) {
      targetDirs = [SRC_DIR];
    } else {
      const mapped = MODULES[moduleName];
      if (!mapped) {
        console.error(`✘ Módulo desconocido: "${moduleName}". Editá MODULES en src/dev/printModule.cjs para agregarlo.`);
        printUsage();
        process.exit(1);
      }
      targetDirs = mapped;
    }

    let allFiles = [];
    for (const dir of targetDirs) {
      allFiles.push(...getFilesRecursively(dir));
    }

    allFiles = allFiles
      .map((f) => path.resolve(f))
      .sort((a, b) => a.localeCompare(b));

    if (allFiles.length === 0) {
      console.log('No se encontraron archivos para esos parámetros.');
      process.exit(0);
    }

    if (listOnly) {
      console.log('Archivos encontrados:\n');
      allFiles.forEach((file) => {
        console.log(' -', relativeFromRoot(file));
      });
      process.exit(0);
    }

    // Armamos el mega-dump
    let output = '';
    for (const file of allFiles) {
      const rel = relativeFromRoot(file);
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      const numbered = lines
        .map((line, idx) => `${String(idx + 1).padStart(4, ' ')} | ${line}`)
        .join('\n');

      output +=
        `\n\n// ===== ${rel} =====\n\n` +
        numbered +
        '\n';
    }

    // === SOLUCIÓN DE CLIPBOARDY ===
    // Usamos import() dinámico para evitar problemas entre CommonJS y ESM en Node 22
    // y usamos .write() que es el método correcto (asíncrono)
    const clipboardyModule = await import('clipboardy');
    // Manejamos si viene como default export o no
    const clipboardy = clipboardyModule.default || clipboardyModule;

    await clipboardy.write(output);
    
    console.log('✅ Dump de frontend generado y copiado al portapapeles.');
    console.log(`   Archivos: ${allFiles.length}`);
    console.log(
      `   Origen: ${includeAll ? 'frontend/src completo' : `módulo "${moduleName}"`}`
    );
    console.log('   Pegalo directo en el chat y lo destripamos.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Ocurrió un error inesperado:');
    console.error(error);
    process.exit(1);
  }
})();