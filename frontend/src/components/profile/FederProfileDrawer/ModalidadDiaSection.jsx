import { useEffect, useMemo, useRef, useState } from 'react'
import './ModalidadDiaSection.scss'

export default function ModalidadDiaSection({ federId, catalog }) {
  const [dias, setDias] = useState([])
  const [mods, setMods] = useState([])
  const [val, setVal] = useState({})            // { [dia_id]: modalidad_id }
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const initialRef = useRef({})                 // snapshot para detectar cambios

  // Cargar catálogos + valores actuales
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true); setErr(null)

        const ds = catalog?.dias || (await fetch('/api/feders/catalog/dias-semana', { credentials:'include' }).then(r=>r.json()))
        const ms = catalog?.modalidades || (await fetch('/api/feders/catalog/modalidades', { credentials:'include' }).then(r=>r.json()))
        const v  = await fetch(`/api/feders/${federId}/modalidades-dia`, { credentials:'include' }).then(r=>r.ok?r.json():[])

        if (!alive) return
        const diasData = ds?.data || ds || []
        const modsData = ms?.data || ms || []
        const current  = {}
        ;(v?.data || v || []).forEach(row => { current[row.dia_semana_id] = row.modalidad_id })

        setDias(diasData)
        setMods(modsData)
        setVal(current)
        initialRef.current = current
      } catch (e) {
        setErr('No se pudo cargar/guardar la modalidad.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [federId, catalog])

  // Helpers
  const onChange = (diaId, modId) => {
    setVal(prev => ({ ...prev, [diaId]: modId ? Number(modId) : null }))
  }

  const dirty = useMemo(() => {
    const a = initialRef.current
    const keys = new Set([...Object.keys(a), ...Object.keys(val)])
    for (const k of keys) if ((a[k] ?? null) !== (val[k] ?? null)) return true
    return false
  }, [val])

  const payload = useMemo(() => (
    Object.keys(val).map(k => ({
      dia_semana_id: Number(k),
      modalidad_id: val[k] ? Number(val[k]) : null
    }))
  ), [val])

  const onSave = async () => {
    try {
      setSaving(true); setErr(null)
      await fetch(`/api/feders/${federId}/modalidades-dia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials:'include',
        body: JSON.stringify({ items: payload })
      })
      initialRef.current = { ...val } // snapshot luego de guardar
    } catch {
      setErr('No se pudo cargar/guardar la modalidad.')
    } finally { setSaving(false) }
  }

  const onRevert = () => setVal(initialRef.current)

  const nombreMod = (id) => mods.find(m => m.id === id)?.nombre || '—'

  return (
    <section className="pfModalidad card" aria-label="Modalidad por día">
      <div className="headRow">
        <h3 title="Modalidad por día">Modalidad por día</h3>
        <div className="status">
          {saving ? <span className="saving">Guardando…</span> :
           dirty  ? <span className="dirty">Cambios sin guardar</span> :
                    <span className="ok">Guardado</span>}
        </div>
      </div>

      {err && <div className="error" role="alert">{err}</div>}
      {loading ? (
        <div className="modeGrid">
          {Array.from({length:7}).map((_,i)=>(
            <div key={i} className="tile skeleton" aria-hidden />
          ))}
        </div>
      ) : (
        <>
          <div className="modeGrid" style={{marginTop:8}}>
            {dias.map(d => (
              <div className="tile" key={d.id}>
                <div className="rowTop">
                  <span className="day">{d.nombre}</span>
                  <span className="pill">{nombreMod(val[d.id])}</span>
                </div>

                <div className="selectWrap">
                  <select
                    className="niceSelect"
                    aria-label={`Modalidad para ${d.nombre}`}
                    value={val[d.id] || ''}
                    onChange={e=>onChange(d.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {mods.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                  <span className="caret">▾</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rowEnd actions">
            <button type="button" className="btn" onClick={onRevert} disabled={!dirty || saving} title="Revertir cambios">
              Revertir
            </button>
            <button type="button" className="cta" onClick={onSave} disabled={!dirty || saving} title="Guardar cambios">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}