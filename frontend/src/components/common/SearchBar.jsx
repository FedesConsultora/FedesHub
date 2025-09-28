import { useCallback } from 'react'
import { FaSearch, FaTimes } from 'react-icons/fa'
import './searchbar.scss'

/**
 * SearchBar – barra de búsqueda reutilizable
 * Props:
 *  value: string
 *  onChange: (e) => void
 *  onSearch: () => void
 *  onClear?: () => void
 *  placeholder?: string
 *  loading?: boolean
 *  className?: string
 */
export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Buscar…',
  loading = false,
  className = '',
}) {
  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    onSearch?.()
  }, [onSearch])

  const handleClear = useCallback(() => {
    onClear?.()
  }, [onClear])

  return (
    <form className={`fh-searchbar ${className}`} onSubmit={handleSubmit} role="search">
      <div className='barra_busqueda'>
        <FaSearch className="ico" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {!!value && onClear && (
          <button
            type="button"
            className="clear"
            onClick={handleClear}
            title="Limpiar"
            aria-label="Limpiar búsqueda"
          >
            <FaTimes />
          </button>
        )}
      </div>

      <button type="submit" className="submit" disabled={loading} aria-busy={loading}>
        <FaSearch aria-hidden />
        <span>Buscar</span>
      </button>
    </form>
  )
}
