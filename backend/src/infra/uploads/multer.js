import multer from 'multer';

// Límites MUY altos para soportar videos de producción de agencia
// Nota: Los archivos se suben a Google Drive, no al servidor local
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB por archivo
const MAX_FILES = 10;

const mem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
});

export const uploadFiles = mem.array('files', MAX_FILES); 
export const uploadSingle = mem.single('file');           

export function multerErrorHandler(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const sizeMB = MAX_FILE_SIZE / 1024 / 1024 / 1024;
    const map = {
      LIMIT_FILE_SIZE: `Archivo demasiado grande. Máximo permitido: ${sizeMB}GB`,
      LIMIT_FILE_COUNT: `Demasiados archivos. Máximo permitido: ${MAX_FILES}`,
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado'
    };
    return res.status(413).json({ error: map[err.code] || err.message });
  }
  return next(err);
}

// Exportar límite para referencia
export const FILE_SIZE_LIMIT = MAX_FILE_SIZE;
