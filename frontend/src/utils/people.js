// Utils para nombres/etiquetas de personas en toda la app.

/**
 * Devuelve "Nombre Apellido" priorizando:
 * - entity.feder.{nombre,apellido}
 * - entity.autor.feder / entity.autor.{nombre,apellido}
 * - entity.{nombre,apellido}
 * y cae al email si no hay nombre.
 */// Util para obtener nombres de personas en diferentes formas de payload.

function pickFeder(o) {
  if (!o || typeof o !== 'object') return null

  // 1) Estructura anidada más común en miembros de canal
  const uFed = o?.user?.feder
  if (uFed && (uFed.nombre || uFed.apellido)) return uFed

  // 2) Feder al tope (ej: candidatos DM o algunos payloads)
  const topFed = o?.feder
  if (topFed && (topFed.nombre || topFed.apellido)) return topFed

  // 3) Autor anidado (en mensajes / replies)
  const aFed = o?.autor?.feder
  if (aFed && (aFed.nombre || aFed.apellido)) return aFed

  // 4) Nombre/apellido directo en el objeto
  if (o?.nombre || o?.apellido) {
    return { nombre: o.nombre || '', apellido: o.apellido || '' }
  }

  // 5) Nombre/apellido directo dentro de autor
  if (o?.autor?.nombre || o?.autor?.apellido) {
    return { nombre: o.autor.nombre || '', apellido: o.autor.apellido || '' }
  }

  return null
}

export function fullName(o) {
  const f = pickFeder(o)
  const nom = f?.nombre?.trim() || ''
  const ape = f?.apellido?.trim() || ''
  const joined = [nom, ape].filter(Boolean).join(' ').trim()
  if (joined) return joined

  // fallback si vino como campos sueltos en el propio objeto
  const direct = [o?.nombre, o?.apellido].filter(Boolean).join(' ').trim()
  return direct || ''
}

export function getEmail(o) {
  return o?.email || o?.user?.email || o?.autor?.email || ''
}

export function displayName(o) {
  return fullName(o) || getEmail(o) || ''
}

export function initials(o, max = 2) {
  const name = fullName(o)
  if (name) {
    return name
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, max)
      .join('')
      .toUpperCase()
  }
  const em = getEmail(o)
  return (em?.[0] || 'U').toUpperCase()
}

export const firstInitial = (o) => initials(o, 1)