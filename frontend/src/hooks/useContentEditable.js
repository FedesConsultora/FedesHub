// src/hooks/useContentEditable.js
import { useEffect, useRef, useCallback } from 'react'

/**
 * Mantiene el caret estable en contentEditable:
 * - No escribe el value en cada input (no salta el cursor)
 * - Solo sincroniza el DOM cuando el "value externo" cambia
 */
export default function useContentEditable({ value, onChange, asHtml = false }) {
  const ref = useRef(null)

  // Sincroniza solo cuando value externo cambia
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const current = asHtml ? el.innerHTML : el.textContent
    const next = value ?? ''
    if (current !== next) {
      if (asHtml) el.innerHTML = next
      else el.textContent = next
    }
  }, [value, asHtml])

  // En cada input, avisamos hacia afuera pero NO tocamos el DOM => caret no salta
  const handleInput = useCallback((e) => {
    const el = e.currentTarget
    const v = asHtml ? el.innerHTML : el.innerText
    onChange?.(v)
  }, [onChange, asHtml])

  return { ref, handleInput }
}
