import multer from 'multer';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB por archivo
const MAX_FILES = 10;

const mem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
});

export const uploadFiles  = mem.array('files', MAX_FILES); // para adjuntos de mensajes
export const  uploadSingle = mem.single('file');            // ✅ para avatar

export function multerErrorHandler(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: 'Archivo demasiado grande',
      LIMIT_FILE_COUNT: 'Demasiados archivos',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado'
    };
    return res.status(413).json({ error: map[err.code] || err.message });
  }
  return next(err);
}
