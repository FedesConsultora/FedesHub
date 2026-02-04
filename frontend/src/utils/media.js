// frontend/src/utils/media.js
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;          // URLs absolutas (Drive, etc)
  if (/^data:image\//i.test(url)) return url;         // Blobs / base64 del portapapeles

  // Si la URL empieza directamente con /api, no la tocamos
  if (url.startsWith('/api')) return url;

  // Si la URL empieza con /uploads o /avatars, intentamos anteponer la base de la API
  // para que funcione fuera de localhost si el backend no está en el mismo dominio
  if (url.startsWith('/uploads') || url.startsWith('uploads') || url.startsWith('/avatars') || url.startsWith('avatars')) {
    const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/api\/?$/, '');
    if (apiBase && !apiBase.startsWith('http')) {
      // En producción a veces VITE_API_BASE es "/api", apiBase queda vacío.
      // En ese caso devolvemos la ruta relativa.
      return url.startsWith('/') ? url : `/${url}`;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return apiBase ? `${apiBase.replace(/\/$/, '')}${cleanUrl}` : cleanUrl;
  }

  // Aseguramos que empiece con / para que use la raíz del dominio (y el proxy de Vite en dev)
  const path = url.startsWith('/') ? url : `/${url}`;
  return path;
}

