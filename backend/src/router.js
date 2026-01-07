// backend/src/router.js 
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const modulesDir = path.join(__dirname, 'modules');

for (const mod of fs.readdirSync(modulesDir)) {
  if (mod === 'celulas') continue; // Células module disabled
  const candidate = path.join(modulesDir, mod, 'router.js');
  if (fs.existsSync(candidate)) {
    const m = await import(path.join(modulesDir, mod, 'router.js'));
    router.use(`/${mod}`, m.default);
  }
}

export default router;
