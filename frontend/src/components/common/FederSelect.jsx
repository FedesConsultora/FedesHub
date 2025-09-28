// /frontend/src/components/common/FederSelect.jsx
import { useMemo, useState } from 'react'
import Input from '../ui/input'
import './federSelect.scss'

export default function FederSelect({ value='', onChange, options=[], placeholder='Responsable' }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return options
    return options.filter(o =>
      `${o.nombre||''} ${o.apellido||''} ${o.cargo_principal||''}`.toLowerCase().includes(s)
    )
  }, [q, options])

  return (
    <div className="fh-federSelect">
      <div className="fh-federSelect__search">
        <Input placeholder="Buscar feder…" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <select className="fh-federSelect__select" value={value} onChange={(e)=>onChange?.(e.target.value)}>
        <option value="">{placeholder} — Todos</option>
        {filtered.map(f => (
          <option key={f.id} value={String(f.id)}>
            {f.nombre} {f.apellido}{f.cargo_principal ? ` — ${f.cargo_principal}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
