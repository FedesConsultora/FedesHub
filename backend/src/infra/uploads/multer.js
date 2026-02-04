import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

// Límites MUY altos para soportar videos de producción de agencia
// Nota: Los archivos se suben a Google Drive, no al servidor local
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB por archivo
const MAX_FILES = 30;

// Asegurar carpeta temporal de uploads
const UPLOAD_TMP_DIR = path.resolve(process.env.STORAGE_BASE_DIR || 'uploads', 'tmp');
if (!fs.existsSync(UPLOAD_TMP_DIR)) {
  fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
}

// Usamos diskStorage para evitar agotar la RAM (OOM) con archivos grandes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_TMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
});

export const uploadFiles = upload.array('files', MAX_FILES);
export const uploadSingle = upload.single('file');

export function multerErrorHandler(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const sizeGB = MAX_FILE_SIZE / 1024 / 1024 / 1024;
    const map = {
      LIMIT_FILE_SIZE: `Archivo demasiado grande. El máximo permitido es de ${sizeGB}GB.`,
      LIMIT_FILE_COUNT: `Demasiados archivos. El máximo permitido son ${MAX_FILES} archivos.`,
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado'
    };
    return res.status(413).json({ error: map[err.code] || err.message });
  }
  return next(err);
}

// Exportar límite para referencia
export const FILE_SIZE_LIMIT = MAX_FILE_SIZE;
