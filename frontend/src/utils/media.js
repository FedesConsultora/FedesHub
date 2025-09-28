
// frontend/src/utils/media.js
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;         // Drive, etc.
  const path = url.startsWith('/') ? url : `/${url}`; // /uploads/...
  return path; // dev: Vite proxy; prod: mismo origin detrás de nginx
}

