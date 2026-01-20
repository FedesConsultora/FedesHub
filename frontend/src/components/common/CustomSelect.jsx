import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { FiX } from 'react-icons/fi'
import { MdKeyboardArrowDown } from "react-icons/md"
import './CustomSelect.scss'

/* ================= util: click afuera ================= */
function useClickOutside(ref, onOutside) {
    useEffect(() => {
        const on = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside?.() }
        document.addEventListener('mousedown', on)
        document.addEventListener('touchstart', on)
        return () => { document.removeEventListener('mousedown', on); document.removeEventListener('touchstart', on) }
    }, [ref, onOutside])
}

const S = {
    addon: { flex: '0 0 22px', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' },
}

export default function CustomSelect({
    id,
    labelId,
    leftIcon = null,
    options = [],
    value = [], // always array internally for consistency
    onChange,
    placeholder = 'Seleccionar…',
    disabled = false,
    multi = true,
    renderLabel = null,
    isOptionDisabled = null
}) {
    const rid = useId()
    const controlId = id || `ms-${rid}`
    const listboxId = `${controlId}-listbox`

    const wrapRef = useRef(null)
    useClickOutside(wrapRef, () => setOpen(false))

    const [open, setOpen] = useState(false)
    const [q, setQ] = useState('')

    useEffect(() => {
        const onEsc = (e) => e.key === 'Escape' && setOpen(false)
        window.addEventListener('keydown', onEsc)
        return () => window.removeEventListener('keydown', onEsc)
    }, [])

    const toggleVal = (val) => {
        if (disabled) return
        const opt = optionsByVal.get(String(val))
        if (isOptionDisabled?.(opt)) return

        const s = String(val)
        if (multi) {
            const next = value.includes(s) ? value.filter(v => v !== s) : [...value, s]
            onChange?.(next)
        } else {
            onChange?.([s])
            setOpen(false) // Close on single selection
        }
    }

    const optionsByVal = useMemo(() => {
        const m = new Map()
        options.forEach(o => m.set(String(o.value), o))
        return m
    }, [options])

    const selectedLabels = value.map(v => optionsByVal.get(String(v))?.label).filter(Boolean)

    const filtered = q.trim()
        ? options.filter(o => o.label.toLowerCase().includes(q.trim().toLowerCase()))
        : options

    return (
        <div className="msWrap" ref={wrapRef} style={{ width: '100%' }}>
            {/* Trigger */}
            <div
                id={controlId}
                className={`select-field ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-labelledby={labelId}
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={(e) => {
                    if (disabled) return
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) }
                    if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) }
                }}
            >
                {leftIcon}
                <div
                    className={'msDisplay ' + (selectedLabels.length ? 'selected-labels' : 'placeholder')}
                    style={{ flex: '1 1 auto', minWidth: 0 }}
                >
                    {selectedLabels.length === 0 ? (
                        <span className="msPlaceholder">{placeholder}</span>
                    ) : (
                        <div className="selected-tags" onClick={(e) => e.stopPropagation()}>
                            {!multi ? (
                                // Single select display
                                <div className="single-val">
                                    {renderLabel ? renderLabel(optionsByVal.get(String(value[0]))) : selectedLabels[0]}
                                </div>
                            ) : (
                                // Multi select tags
                                value.map(val => {
                                    const v = String(val)
                                    const opt = optionsByVal.get(v)
                                    if (!opt) return null
                                    return (
                                        <div className="tag" key={v} role="button" tabIndex={0}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                            onKeyDown={(e) => { if (e.key === 'Backspace' || e.key === 'Delete') toggleVal(v) }}
                                        >
                                            {renderLabel ? renderLabel(opt) : opt.label}
                                            <FiX size={12} className="remove-tag" onClick={(e) => { e.stopPropagation(); toggleVal(v) }} />
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>

                <div className="addon" style={S.addon}>
                    <MdKeyboardArrowDown className={`chevron ${open ? 'open' : ''}`} />
                </div>
            </div>

            {open && !disabled && (
                <div className="msPanel" id={listboxId} role="listbox" aria-multiselectable={multi}>
                    {options.length > 8 && (
                        <div className="msSearch">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}
                    <ul>
                        {filtered.map(opt => {
                            const val = String(opt.value)
                            const checked = value.includes(val)
                            const isLocked = isOptionDisabled?.(opt)

                            return (
                                <li key={val} onClick={(e) => { e.stopPropagation(); !isLocked && toggleVal(val) }}>
                                    <div className={`msRow ${checked ? 'selected' : ''} ${isLocked ? 'disabled' : ''}`}>
                                        {multi && <input type="checkbox" checked={checked} readOnly disabled={isLocked} />}
                                        <div className="msRowContent">
                                            {renderLabel ? renderLabel(opt) : <span className="ellipsis">{opt.label}</span>}
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                        {!filtered.length && <li className="msEmpty">Sin resultados</li>}
                    </ul>
                </div>
            )}
        </div>
    )
}
