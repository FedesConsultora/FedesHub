import { useEffect, useState } from 'react'
import { FiUser } from 'react-icons/fi'
import './ProfileTabs.scss'

export default function ProfileTabs({ tabs = [], defaultId = 'basic', onChange }) {
  const [active, setActive] = useState(defaultId)
  useEffect(() => { setActive(defaultId) }, [defaultId])

  const setTab = (id) => { setActive(id); onChange?.(id) }

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
