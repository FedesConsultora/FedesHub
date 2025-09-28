import { useEffect, useState } from 'react'

/**
 * Guarda/lee en localStorage la preferencia de vista.
 * @param {string} key - ej. "clientes.view"
 * @param {"cards"|"list"} fallback - valor por defecto
 */
export default function useViewPref(key, fallback = 'cards') {
  const read = () => {
    if (typeof window === 'undefined') return fallback
    try {
      const v = window.localStorage.getItem(key)
      return (v === 'cards' || v === 'list') ? v : fallback
    } catch {
      return fallback
    }
  }

  // Lazy init explícito para evitar dobles lecturas raras en dev/SSR
  const [view, setView] = useState(() => read())

  // Persistencia
  useEffect(() => {
    try { window.localStorage.setItem(key, view) } catch {}
  }, [key, view])

  return [view, setView]
}
