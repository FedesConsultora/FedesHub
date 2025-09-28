// src/components/modal/ModalProvider.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FaTimes, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaQuestionCircle } from 'react-icons/fa'
import './modal-provider.scss'

const ModalCtx = createContext(null)

export function ModalProvider({ children }) {
  const [stack, setStack] = useState([]) // { id, type:'alert'|'confirm'|'custom', title, message, tone, okText, cancelText, width, render, resolve }
  const idRef = useRef(1)

  const closeTop = useCallback((result) => {
    setStack(list => {
      const top = list[list.length - 1]
      if (top?.resolve) top.resolve(result)
      return list.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (!stack.length) return
      if (e.key === 'Escape') { e.preventDefault(); closeTop(false) }
      if (e.key === 'Enter')  { e.preventDefault(); closeTop(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stack, closeTop])

  const push = useCallback((item) =>
    new Promise((resolve) => setStack(list => [...list, { id: idRef.current++, resolve, ...item }]))
  , [])

  const api = useMemo(() => ({
    alert:   ({ title='Aviso', message='', tone='info', okText='OK' } = {}) =>
      push({ type:'alert', title, message, tone, okText }),
    confirm: ({ title='Confirmar', message='', tone='info', okText='Aceptar', cancelText='Cancelar' } = {}) =>
      push({ type:'confirm', title, message, tone, okText, cancelText }),
    open:    ({ title='Modal', tone='info', width=720, render }) =>
      push({ type:'custom', title, tone, width, render })
  }), [push])

  const iconFor = (tone) => {
    switch (tone) {
      case 'success': return <FaCheckCircle className="ico" />
      case 'warn':    return <FaExclamationTriangle className="ico" />
      case 'danger':  return <FaExclamationTriangle className="ico" />
      default:        return <FaInfoCircle className="ico" />
    }
  }

  return (
    <ModalCtx.Provider value={api}>
      {children}

      {stack.length > 0 && (
        <div
          className="fh-modal-layer"
          role="dialog" aria-modal="true"
          onMouseDown={(e)=>{ if (e.target === e.currentTarget) closeTop(false) }}
        >
          {stack.map((m, idx) => (
            <div
              key={m.id}
              className={`fh-modal ${m.tone}`}
              style={{ zIndex: 100 + idx, width: m.width ? `min(${m.width}px, 96vw)` : undefined }}
            >
              <button className="x" aria-label="Cerrar" onClick={()=>closeTop(false)}><FaTimes /></button>

              <div className="head">
                <div className="symbol">{m.type === 'confirm' ? <FaQuestionCircle className="ico" /> : iconFor(m.tone)}</div>
                <div className="title">{m.title}</div>
              </div>

              <div className="body">
                {m.type === 'custom'
                  ? (typeof m.render === 'function' ? m.render(closeTop) : null)
                  : (m.message ? <div className="body-text">{m.message}</div> : null)
                }
              </div>

              {(m.type === 'alert' || m.type === 'confirm') && (
                <div className="actions">
                  {m.type === 'confirm' && <button className="btn" onClick={()=>closeTop(false)}>{m.cancelText || 'Cancelar'}</button>}
                  <button className={`btn primary ${m.tone === 'danger' ? 'danger' : ''}`} onClick={()=>closeTop(true)} autoFocus>
                    {m.okText || 'OK'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ModalCtx.Provider>
  )
}

export const useModal = () => useContext(ModalCtx)
