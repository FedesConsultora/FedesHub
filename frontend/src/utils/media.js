// frontend/src/utils/media.js
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;          // URLs absolutas (Drive, etc)
  if (/^data:image\//i.test(url)) return url;         // Blobs / base64 del portapapeles

  // Aseguramos que empiece con / para que use la raíz del dominio (y el proxy de Vite en dev)
  const path = url.startsWith('/') ? url : `/${url}`;
  return path;
}

