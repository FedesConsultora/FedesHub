// src/components/ausencias/AusenciasFilters.jsx
import './AusenciasFilters.scss'

export default function AusenciasFilters({ tipos=[], value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const toggleEstado = (k) => {
    const s = new Set(value.estados)
    if (s.has(k)) s.delete(k); else s.add(k)
    set({ estados: s })
  }

  const reset = () => onChange({
    tipoId:'', estados:new Set(['aprobada','pendiente','denegada','cancelada']), futureOnly:false
  })

  return (
    <div className="aus-filters">
      <div className="group">
        <label>Tipo</label>
        <select
          className="fh-input"
          value={value.tipoId}
          onChange={e=>set({ tipoId: e.target.value })}
        >
          <option value="">Todos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      <div className="group">
        <label>Estado</label>
        <div className="segmented small">
          {[
            ['aprobada','Aprobadas'], ['pendiente','Pendientes'], ['denegada','Denegadas'], ['cancelada','Canceladas']
          ].map(([k,lab]) => (
            <button
              key={k}
              className={`seg ${value.estados.has(k)?'active':''} ${k}`}
              onClick={()=>toggleEstado(k)}
              title={k}
            >{lab}</button>
          ))}
        </div>
      </div>

      <div className="group">
        <label>Rango</label>
        <label className="switch">
          <input type="checkbox" checked={value.futureOnly} onChange={e=>set({ futureOnly: e.target.checked })} />
          <span> Sólo futuras</span>
        </label>
      </div>

      <div className="spacer" />
      <button className="fh-btn ghost" onClick={reset}>Limpiar</button>
    </div>
  )
}
