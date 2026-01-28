// frontend/src/utils/media.js
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;          // URLs absolutas (Drive, etc)
  if (/^data:image\//i.test(url)) return url;         // Blobs / base64 del portapapeles

  // Si la URL empieza con /uploads, intentamos anteponer la base de la API
  // para que funcione fuera de localhost si el backend no está en el mismo dominio
  if (url.startsWith('/uploads') || url.startsWith('uploads')) {
    const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/api\/?$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return apiBase ? `${apiBase}${cleanUrl}` : cleanUrl;
  }

  // Aseguramos que empiece con / para que use la raíz del dominio (y el proxy de Vite en dev)
  const path = url.startsWith('/') ? url : `/${url}`;
  return path;
}

