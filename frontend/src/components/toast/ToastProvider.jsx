import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './toast.scss'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(1)
  const timersRef = useRef(new Map()) // id -> timeout

  const remove = useCallback((id) => {
    const t = timersRef.current.get(id)
    if (t) { clearTimeout(t); timersRef.current.delete(id) }
    setItems(list => list.filter(it => it.id !== id))
  }, [])

  const push = useCallback((kind, msg, ttl = 3200) => {
    const id = idRef.current++
    const item = { id, kind, msg, ttl }
    setItems(list => [...list, item])
    const to = setTimeout(() => remove(id), ttl)
    timersRef.current.set(id, to)
    return id
  }, [remove])

  const api = useMemo(() => ({
    success: (m, ttl) => push('success', m, ttl),
    error:   (m, ttl) => push('error',   m, ttl),
    info:    (m, ttl) => push('info',    m, ttl),
    warn:    (m, ttl) => push('warn',    m, ttl),
  }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="fh-toaster" aria-live="polite" aria-atomic="true">
          {items.map(t => (
            <div
              key={t.id}
              className={`fh-toast ${t.kind}`}
              style={{ '--ttl': `${t.ttl}ms` }}
              role="status"
            >
              <div className="text">{t.msg}</div>
              <button className="x" onClick={()=>remove(t.id)} aria-label="Cerrar">×</button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
