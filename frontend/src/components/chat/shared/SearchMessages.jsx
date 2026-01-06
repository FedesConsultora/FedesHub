import { useEffect, useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { useSearchMessages } from '../../../hooks/useChat'
import { displayName } from '../../../utils/people'
import './SearchMessages.scss'

export default function SearchMessages({ canal_id, onSelectMessage }) {
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    const { data, isLoading, isFetching } = useSearchMessages(canal_id, debouncedQuery)
    const results = (debouncedQuery.length >= 2) ? (data?.results || []) : []
    const searching = isLoading || isFetching

    const handleSelect = (msg) => {
        onSelectMessage?.(msg)
        setQuery('')
        setDebouncedQuery('')
        setIsOpen(false)
    }

    const handleClose = () => {
        setQuery('')
        setDebouncedQuery('')
        setIsOpen(false)
    }

    if (!isOpen) {
        return (
            <button
                className="searchToggleBtn"
                onClick={() => setIsOpen(true)}
                title="Buscar mensajes"
            >
                <FiSearch />
            </button>
        )
    }

    return (
        <div className="searchMessages">
            <div className="searchInput">
                <FiSearch className="searchIcon" />
                <input
                    type="text"
                    placeholder="Buscar mensaje..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                <button className="closeBtn" onClick={handleClose}>
                    <FiX />
                </button>
            </div>

            {(debouncedQuery.length >= 2 || searching) && (
                <div className="searchResults">
                    {searching && <div className="loading">Buscando...</div>}

                    {!searching && results.length === 0 && (
                        <div className="empty">No se encontraron mensajes</div>
                    )}

                    {!searching && results.length > 0 && (
                        <div className="resultsList">
                            {results.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="resultItem"
                                    onClick={() => handleSelect(msg)}
                                >
                                    <div className="resultMeta">
                                        <span className="resultAuthor">
                                            {displayName(msg.autor)}
                                        </span>
                                        <span className="resultDate">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="resultText">
                                        {msg.body_text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
