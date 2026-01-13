import { useState, useRef, useEffect, useId } from 'react'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { FiX, FiSearch } from 'react-icons/fi'
import './PremiumSelect.scss'

export default function PremiumSelect({
    label,
    icon: Icon,
    options = [],
    value,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    renderOption = null
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef(null)
    const id = useId()

    const selectedOption = options.find(o => String(o.value) === String(value))

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className={`premium-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={containerRef}>
            {label && (
                <label className="premium-select__label">
                    {Icon && <Icon className="premium-select__label-icon" />}
                    {label}
                </label>
            )}

            <div
                className="premium-select__trigger"
                onClick={() => !disabled && setOpen(!open)}
            >
                <div className="premium-select__content">
                    {selectedOption ? (
                        <span className="premium-select__value">{selectedOption.label}</span>
                    ) : (
                        <span className="premium-select__placeholder">{placeholder}</span>
                    )}
                </div>
                <MdKeyboardArrowDown className={`premium-select__chevron ${open ? 'is-rotated' : ''}`} />
            </div>

            {open && (
                <div className="premium-select__panel">
                    {options.length > 5 && (
                        <div className="premium-select__search">
                            <FiSearch />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <ul className="premium-select__list">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <li
                                    key={opt.value}
                                    className={`premium-select__item ${String(opt.value) === String(value) ? 'is-selected' : ''}`}
                                    onClick={() => {
                                        onChange(opt.value)
                                        setOpen(false)
                                        setSearch('')
                                    }}
                                >
                                    {renderOption ? renderOption(opt) : opt.label}
                                </li>
                            ))
                        ) : (
                            <li className="premium-select__empty">Sin resultados</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
