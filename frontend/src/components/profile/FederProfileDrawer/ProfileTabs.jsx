import { useEffect, useState } from 'react'
import { FiUser } from 'react-icons/fi'
import './ProfileTabs.scss'

const STORAGE_KEY = 'fh:profile:activeTab'

export default function ProfileTabs({ tabs = [], defaultId = 'basic', onChange }) {
  // Intentar recuperar del localStorage, sino usar defaultId
  const [active, setActive] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Verificar que el tab almacenado existe en los tabs actuales
    if (stored && tabs.some(t => t.id === stored)) return stored
    return defaultId
  })

  // Solo resetear al defaultId si es la primera vez (tabs vacío -> tabs con data)
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === active)) {
      setActive(defaultId)
    }
  }, [tabs.length])

  const setTab = (id) => {
    setActive(id)
    localStorage.setItem(STORAGE_KEY, id)
    onChange?.(id)
  }

  return (
    <section className="pfTabs">
      <header className="pfTabsBar" role="tablist" aria-label="Secciones del perfil">
        {tabs.map(t => {
          const Icon = t.icon || FiUser
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              className={'tab' + (isActive ? ' active' : '')}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-${t.id}`}
              title={t.title || t.label}
              onClick={() => setTab(t.id)}
            >
              <Icon /> {t.label}
            </button>
          )
        })}
      </header>

      <div className="pfTabBody">
        {tabs.map(t => active === t.id ? (
          <div key={t.id} id={`tab-${t.id}`} role="tabpanel">{t.content}</div>
        ) : null)}
      </div>
    </section>
  )
}
