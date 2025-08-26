import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import AppTile from './AppTile.jsx'
import './AppGrid.scss'

export default function AppGrid({ apps }) {
  const { user, hasPerm } = useAuthCtx()
  const nav = useNavigate()
  const storageKey = `fh_app_order_${user?.id || 'anon'}`

  const allowed = useMemo(() => {
    const ACCS = ['read','create','update','delete','approve','assign','report']
    return apps.filter(a => ACCS.some(ac => hasPerm(a.code, ac)))
  }, [apps, hasPerm])

  const [order, setOrder] = useState(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return allowed.map(a => a.code)
    const saved = JSON.parse(raw)
    const set = new Set(allowed.map(a => a.code))
    return saved.filter(c => set.has(c)).concat(allowed.map(a => a.code).filter(c => !saved.includes(c)))
  })
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(order)) }, [order])

  const sorted = order.map(code => allowed.find(a => a.code === code)).filter(Boolean)

  const onDrag = (evt, code) => { evt.dataTransfer.setData('text/plain', code) }
  const onDrop = (evt, code) => {
    evt.preventDefault()
    const dragged = evt.dataTransfer.getData('text/plain')
    if (!dragged || dragged === code) return
    const next = [...order]
    const from = next.indexOf(dragged)
    const to = next.indexOf(code)
    next.splice(from, 1); next.splice(to, 0, dragged)
    setOrder(next)
  }

  return (
    <div className="appGrid">
      {sorted.map(app => (
        <div key={app.code}
          className="tileWrapper"
          draggable
          onDragStart={(e) => onDrag(e, app.code)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, app.code)}
        >
          <AppTile app={app} onClick={() => !app.disabled && nav(app.path)} disabled={app.disabled} />
        </div>
      ))}
    </div>
  )
}
