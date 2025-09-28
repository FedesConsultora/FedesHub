import React, { useMemo, useRef, useState } from 'react'
import Avatar from '../../Avatar.jsx'

export default function MentionTextArea({
  value, onChange, feders = [], disabled = false, placeholder = 'Escribir…',
  classNames = { root:'', textarea:'', popover:'', item:'' },
  inputRef = null
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inner = inputRef || useRef(null)
  const ref = inner     // alias para el código existente

  const results = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return []
    return feders
      .map(f => ({ ...f, full: `${f.nombre||''} ${f.apellido||''}`.trim() }))
      .filter(f => f.full.toLowerCase().includes(qq))
      .slice(0, 8)
  }, [q, feders])

  // Inserta @<id> (para notificar) pero el render lo mostrará como @Nombre Apellido
  const insertToken = (f) => {
    const el = ref.current
    const start = el.selectionStart ?? value.length
    const end   = el.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const at = Math.max(before.lastIndexOf('@'), 0)
    const maybe = before.slice(at, start)
    if (!maybe.startsWith('@')) return
    const left  = value.slice(0, at)
    const right = value.slice(end)
    const next  = `${left}@${f.id}${right}`
    const pos   = (left + `@${f.id}`).length
    onChange(next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos) })
    setOpen(false); setQ(''); setSel(0)
  }

  const onKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, results.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s-1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); if (results[sel]) insertToken(results[sel]) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  const onInput = (e) => {
    const v = e.target.value
    onChange(v)
    const pos = e.target.selectionStart
    const left = v.slice(0, pos)
    const at = left.lastIndexOf('@')
    if (at >= 0) {
      const term = left.slice(at+1)
      // el término de búsqueda no incluye espacios (hasta elegir)
      if (/^[^\s@]{1,40}$/.test(term)) { setQ(term); setOpen(true); return }
    }
    setOpen(false); setQ(''); setSel(0)
  }

  return (
    <div className={classNames.root || ''}>
      <textarea
        ref={ref}
        className={classNames.textarea || ''}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
      {open && !!results.length && (
        <div className={classNames.popover || ''}>
          {results.map((f, i) => (
            <button
              key={f.id}
              onMouseDown={(e)=>{ e.preventDefault(); insertToken(f) }}
              className={`${classNames.item||''} ${i===sel ? 'is-active' : ''}`}
            >
              <Avatar name={`${f.nombre||''} ${f.apellido||''}`} size={28} />
              <div className="nm">{f.nombre} {f.apellido}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}