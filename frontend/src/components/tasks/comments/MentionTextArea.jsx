import React, { useMemo, useRef, useState } from 'react'
import Avatar from '../../Avatar.jsx'

export default function MentionTextArea({
  value, onChange, feders = [], disabled = false, placeholder = 'Escribir…',
  classNames = { root: '', textarea: '', popover: '', item: '' },
  inputRef = null,
  onSend = null
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inner = inputRef || useRef(null)
  const ref = inner     // alias para el código existente

  const results = useMemo(() => {
    if (!feders || !Array.isArray(feders)) return []
    const qq = q.trim().toLowerCase()
    const all = feders.map(f => ({
      ...f,
      full: `${f.nombre || ''} ${f.apellido || ''}`.trim() || f.email || 'Usuario'
    }))
    if (!qq) return all.slice(0, 8)
    return all.filter(f => f.full.toLowerCase().includes(qq)).slice(0, 8)
  }, [q, feders])

  // Inserta @[Nombre](id) para que el usuario vea el nombre pero conservemos el ID
  const insertToken = (f) => {
    const el = ref.current
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const at = Math.max(before.lastIndexOf('@'), 0)
    const maybe = before.slice(at, start)
    if (!maybe.startsWith('@')) return
    const left = value.slice(0, at)
    const right = value.slice(end)
    const fullName = `${f.nombre || ''} ${f.apellido || ''}`.trim()
    const token = `@${fullName} `
    const next = `${left}${token}${right}`
    const pos = (left + token).length
    onChange(next)
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        el.setSelectionRange(pos, pos)
      }
    })
    setOpen(false)
    setQ('')
    setSel(0)
  }

  const checkMention = (v, selStart) => {
    const pos = selStart || 0
    const textBeforeCursor = v.slice(0, pos)

    // Buscamos el último @ antes del cursor
    const atIdx = textBeforeCursor.lastIndexOf('@')

    if (atIdx !== -1) {
      const term = textBeforeCursor.slice(atIdx + 1)

      // Si el término tiene un espacio o un token previo, no es una mención activa
      if (!term.includes(' ') && !term.includes('\n') && !term.includes('[')) {
        setQ(term)
        setOpen(true)
        return
      }
    }

    setOpen(false)
    setQ('')
    setSel(0)
  }

  const onKeyDown = (e) => {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) insertToken(results[sel]) }
      if (e.key === 'Escape') { setOpen(false) }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSend?.()
      }
    }
  }

  const handleInput = (e) => {
    const v = e.target.value
    onChange(v)
    checkMention(v, e.target.selectionStart)
  }

  const onKeyUp = (e) => {
    // Para capturar cambios de posición de cursor (flechas, etc)
    if (['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) {
      checkMention(e.target.value, e.target.selectionStart)
    }
  }

  return (
    <div className={classNames.root || ''}>
      <textarea
        ref={ref}
        className={classNames.textarea || ''}
        value={value}
        onChange={handleInput}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        placeholder={placeholder}
        disabled={disabled}
      />
      {open && !!results.length && (
        <div className={classNames.popover || ''}>
          {results.map((f, i) => (
            <button
              key={f.id}
              onMouseDown={(e) => { e.preventDefault(); insertToken(f) }}
              className={`${classNames.item || ''} ${i === sel ? 'is-active' : ''}`}
            >
              <Avatar
                name={`${f.nombre || ''} ${f.apellido || ''}`}
                src={f.avatar_url || f.imagen_url || f.persona?.avatar_url || f.persona?.imagen_url || f.avatar || f.imagen}
                size={28}
                federId={f.id}
                enablePreview={false}
              />
              <div className="nm">{f.nombre} {f.apellido}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}