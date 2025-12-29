import { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegFloppyDisk } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './ModalidadDiaSection.scss'

export default function ModalidadDiaSection({ federId, catalog, isSelf = false }) {
  const [dias, setDias] = useState([])
  const [mods, setMods] = useState([])
  const [val, setVal] = useState({})            // { [dia_id]: modalidad_id }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const initialRef = useRef({})                 // snapshot para detectar cambios
  const toast = useToast()

  // Cargar catálogos + valores actuales
  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          setLoading(true)

          // Usar federsApi en vez de fetch directo
          const ds = catalog?.dias || await federsApi.catalog().then(c => c.dias)
          const ms = catalog?.modalidades || await federsApi.catalog().then(c => c.modalidades)
          const v = await federsApi.getModalidad(federId)

          if (!alive) return
          const diasData = ds?.data || ds || []
          const modsData = ms?.data || ms || []
          const current = {}
            ; (v?.data || v || []).forEach(row => { current[row.dia_semana_id] = row.modalidad_id })

          setDias(diasData)
          setMods(modsData)
          setVal(current)
          initialRef.current = current
        } catch (e) {
          toast.error('No se pudo cargar la modalidad.')
        } finally {
          if (alive) setLoading(false)
        }
      })()
    return () => { alive = false }
  }, [federId, catalog, toast])

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
      setSaving(true)
      await federsApi.bulkSetModalidad(federId, payload)
      initialRef.current = { ...val } // snapshot luego de guardar
      toast.success('Guardado')
    } catch {
      toast.error('No se pudo guardar la modalidad.')
    } finally {
      setSaving(false)
    }
  }

  const nombreMod = (id) => mods.find(m => m.id === id)?.nombre || '—'

  return (
    <section className="pfModalidad card" aria-label="Modalidad por día">
      {/* Botón flotante: aparece sólo si hay cambios o está guardando */}
      {(dirty || saving) && (
        <button
          className={'btnSaveFloating' + (saving ? ' saving' : '')}
          onClick={onSave}
          disabled={saving}
          title="Guardar cambios de modalidad"
        >
          {saving ? <span className="spinner" aria-hidden="true" /> : <FaRegFloppyDisk />}
          <span className="txt">{saving ? 'Guardando' : 'Guardar'}</span>
        </button>
      )}

      <div className="headRow">
        <h3 title="Modalidad por día">Modalidad por día</h3>
        <p className="note" style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>
          Este campo es informativo. El estado actual se define en el módulo de Asistencia.
        </p>
      </div>

      {loading ? (
        <div className="modeGrid" style={{ marginTop: 14 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="tile skeleton" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="modeGrid" style={{ marginTop: 14 }}>
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
                  onChange={e => onChange(d.id, e.target.value)}
                >
                  <option value="">—</option>
                  {mods.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <span className="caret">▾</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}