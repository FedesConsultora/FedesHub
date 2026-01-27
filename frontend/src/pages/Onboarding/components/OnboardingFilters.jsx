import React, { useState, useRef } from 'react'
import { FiSearch, FiX, FiFilter } from 'react-icons/fi'
import PremiumSelect from '../../../components/ui/PremiumSelect'
import './OnboardingFilters.scss'

export default function OnboardingFilters({ value, onChange }) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)
    const searchInputRef = useRef(null)

    const upd = (patch) => onChange({ ...value, ...patch })

    const toggleSearch = () => {
        setIsSearchExpanded(!isSearchExpanded)
        if (!isSearchExpanded) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }
    }

    return (
        <div className="OnboardingFilters">
            <div className="FilterToolbar">
                <div className={`searchWrapper ${isSearchExpanded || value.q ? 'expanded' : 'collapsed'}`}>
                    <button
                        type="button"
                        className="searchToggle"
                        onClick={toggleSearch}
                        title="Buscar"
                    >
                        <FiSearch />
                    </button>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar onboarding..."
                        value={value.q ?? ''}
                        onChange={e => upd({ q: e.target.value })}
                        onBlur={() => { if (!value.q) setIsSearchExpanded(false) }}
                    />
                    {value.q && (
                        <button className="clearSearch" onClick={() => { upd({ q: '' }); setIsSearchExpanded(false) }}>
                            <FiX />
                        </button>
                    )}
                </div>

                <div className="quickFilters">
                    <PremiumSelect
                        placeholder="Todos los estados"
                        icon={FiFilter}
                        options={[
                            { value: '', label: 'Todos los estados' },
                            { value: 'activo', label: 'Activos' },
                            { value: 'revision_pendiente', label: 'En Revisión' },
                            { value: 'vencido', label: 'Vencidos' },
                        ]}
                        value={value.status}
                        onChange={val => upd({ status: val })}
                    />
                </div>
            </div>
        </div>
    )
}
