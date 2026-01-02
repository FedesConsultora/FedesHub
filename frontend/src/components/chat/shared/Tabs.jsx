import './Tabs.scss'

export default function Tabs({ tabs = [], activeKey, onChange, rightSlot = null }) {
  const handleClick = (key) => {
    if (key === activeKey) return
    onChange?.(key)
  }

  return (
    <div className="chatTabs" role="tablist" aria-label="Secciones de chat">
      {tabs.map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={activeKey === t.key}
          className={'tab' + (activeKey === t.key ? ' active' : '')}
          onClick={() => handleClick(t.key)}
          data-key={t.key}
        >
          {t.label}
          {t.badgeCount > 0 && <span className="badge">{t.badgeCount > 99 ? '99+' : t.badgeCount}</span>}
          {!!t.badge && !t.badgeCount && <span className="dot" />}
        </button>
      ))}
      <div className="spacer" />
      {rightSlot}
    </div>
  )
}
