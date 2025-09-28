import { useEffect, useMemo, useState } from 'react'
import { calendarioApi } from '../../../api/calendario'
import usePermission from '../../../hooks/usePermissions'
import './EventForm.scss'

const two = n => String(n).padStart(2, '0')
const isoDate = d => `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`

function toInputDateTime(v) {
  if (!v) return ''
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  if (m) return m[0]
  try {
    const d = new Date(String(v).replace(' ','T'))
    if (isNaN(d)) return ''
    return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`
  } catch { return '' }
}
function toApiDateTime(v) {
  if (!v) return ''
  return v.length === 16 ? `${v}:00` : v
}

export default function EventForm({
  mode='create',
  init={},
  calendars=[],
  onCancel,
  onSaved,
  onDeleted,
}){
  const { can } = usePermission()
  const canCreate = can('calendario','create')
  const canUpdate = can('calendario','update')
  const canDelete = can('calendario','delete')

  const myCalendarId = useMemo(()=>{
    const personal = calendars.find(c => c.tipo?.codigo === 'personal' || c.tipo_codigo === 'personal')
    return init.calendario_local_id || personal?.id || calendars[0]?.id || ''
  }, [calendars, init.calendario_local_id])

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [catalog, setCatalog] = useState({ evtTipos:[], vis:[] })

  const [form, setForm] = useState({
    calendario_local_id: myCalendarId,
    tipo_codigo: init.tipo_codigo || 'interno',
    visibilidad_codigo: init.visibilidad_codigo || 'organizacion',
    titulo: init.titulo || '',
    descripcion: init.descripcion || '',
    lugar: init.lugar || '',
    all_day: !!init.all_day,
    starts_at: init.all_day
      ? (init.starts_at?.slice(0,10) || '')
      : toInputDateTime(init.starts_at || ''),
    ends_at: init.all_day ? '' : toInputDateTime(init.ends_at || ''),
    color: init.color || '#5aa8ff',
  })

  useEffect(()=>{ setForm(f => (f.calendario_local_id ? f : { ...f, calendario_local_id: myCalendarId })) }, [myCalendarId])

  useEffect(()=> {
    let mounted = true
    Promise.all([
      calendarioApi.catalog.eventoTipos(),
      calendarioApi.catalog.visibilidades()
    ]).then(([e,v])=>{
      if (!mounted) return
      setCatalog({ evtTipos: e||[], vis: v||[] })
      setForm(f => ({
        ...f,
        tipo_codigo: f.tipo_codigo || e?.[0]?.codigo || 'interno',
        visibilidad_codigo: f.visibilidad_codigo || v?.[0]?.codigo || 'organizacion'
      }))
    }).catch(()=>{})
    return ()=>{ mounted=false }
  }, [])

  const canSubmit = useMemo(()=>{
    const baseOk = !!form.tipo_codigo && !!form.visibilidad_codigo && !!form.titulo
    if (form.all_day) return baseOk && !!form.starts_at
    return baseOk && !!form.starts_at && !!form.ends_at
  }, [form])

  const save = async (e)=>{
    e?.preventDefault?.()
    setError(null)
    if (!canSubmit) return

    setLoading(true)
    try{
      let calId =
        form.calendario_local_id ||
        calendars.find(c => c.tipo?.codigo === 'personal' || c.tipo_codigo === 'personal')?.id ||
        calendars[0]?.id || ''

      if (!calId) {
        const mine = await calendarioApi.calendars.mine()
        const rows = mine?.rows || mine || []
        const personal = rows.find(c => c.tipo?.codigo === 'personal' || c.tipo_codigo === 'personal')
        calId = personal?.id || rows[0]?.id || ''
      }

      if (!calId) {
        setError('No tenés calendarios propios disponibles. Creá uno antes de guardar.')
        setLoading(false)
        return
      }

      const payload = {
        ...form,
        calendario_local_id: calId,
        starts_at: form.all_day ? `${form.starts_at}T00:00:00` : toApiDateTime(form.starts_at),
        ends_at:   form.all_day ? `${form.starts_at}T23:59:59` : toApiDateTime(form.ends_at),
      }

      const res = (mode==='edit' && init.id)
        ? await calendarioApi.events.update(init.id, payload)
        : await calendarioApi.events.create(payload)

      onSaved?.(res?.row || res)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'No se pudo guardar.'
      setError(msg)
    } finally { setLoading(false) }
  }

  const doDelete = async ()=>{
    if (!init.id) return
    const ok = window.confirm('¿Eliminar este evento de forma permanente?')
    if (!ok) return
    setError(null)
    setDeleting(true)
    try{
      await calendarioApi.events.delete(init.id)
      onDeleted?.()
    }catch(err){
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'No se pudo eliminar.'
      setError(msg)
    }finally{ setDeleting(false) }
  }

  return (
    <form className="cal-event-form" onSubmit={save}>
      <div className="grid">
        <input type="hidden" value={form.calendario_local_id} readOnly />

        <label>
          <span>Tipo</span>
          <select className="fh-input" value={form.tipo_codigo} onChange={e=>setForm(f=>({...f, tipo_codigo:e.target.value}))}>
            {catalog.evtTipos.map(t => <option key={t.id} value={t.codigo}>{t.nombre}</option>)}
          </select>
        </label>

        <label>
          <span>Visibilidad</span>
          <select className="fh-input" value={form.visibilidad_codigo} onChange={e=>setForm(f=>({...f, visibilidad_codigo:e.target.value}))}>
            {catalog.vis.map(t => <option key={t.id} value={t.codigo}>{t.nombre}</option>)}
          </select>
        </label>

        <label className="full">
          <span>Título</span>
          <input className="fh-input" value={form.titulo} onChange={e=>setForm(f=>({...f, titulo:e.target.value}))} placeholder="Ej. Reunión de planning" />
        </label>

        <label className="full">
          <span>Descripción</span>
          <textarea className="fh-input" rows={4} value={form.descripcion} onChange={e=>setForm(f=>({...f, descripcion:e.target.value}))} />
        </label>

        <label>
          <span>Lugar</span>
          <input className="fh-input" value={form.lugar} onChange={e=>setForm(f=>({...f, lugar:e.target.value}))} placeholder="Zoom / Oficina..." />
        </label>

        <label className="chk">
          <input
            type="checkbox"
            checked={form.all_day}
            onChange={e=>{
              const on = e.target.checked
              setForm(f=>{
                if (on) {
                  const d = f.starts_at ? f.starts_at.slice(0,10) : isoDate(new Date())
                  return { ...f, all_day:true, starts_at:d, ends_at:'' }
                } else {
                  const start = f.starts_at ? toInputDateTime(`${f.starts_at}T09:00:00`) : toInputDateTime(`${isoDate(new Date())}T09:00:00`)
                  const end   = f.ends_at   ? toInputDateTime(f.ends_at) : toInputDateTime(`${isoDate(new Date())}T10:00:00`)
                  return { ...f, all_day:false, starts_at:start, ends_at:end }
                }
              })
            }}
          />
          <span>Todo el día</span>
        </label>

        <label>
          <span>Inicio</span>
          <input
            className="fh-input"
            type={form.all_day ? 'date' : 'datetime-local'}
            value={form.all_day ? (form.starts_at || '') : toInputDateTime(form.starts_at)}
            onChange={e=>setForm(f=>({...f, starts_at:e.target.value}))}
          />
        </label>

        {!form.all_day && (
          <label>
            <span>Fin</span>
            <input
              className="fh-input"
              type="datetime-local"
              value={toInputDateTime(form.ends_at)}
              onChange={e=>setForm(f=>({...f, ends_at:e.target.value}))}
            />
          </label>
        )}

        <label>
          <span>Color</span>
          <input className="fh-input" type="color" value={form.color || '#5aa8ff'} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="footer">
        <button type="button" className="fh-btn ghost" onClick={onCancel} disabled={loading || deleting}>Cancelar</button>
        <div className="spacer" />
        {mode==='edit' && canDelete && (
          <button
            type="button"
            className="fh-btn danger outline"
            onClick={doDelete}
            disabled={loading || deleting}
            title="Eliminar evento"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        )}
        <button
          className="fh-btn primary"
          disabled={loading || deleting || (!canCreate && mode==='create') || (!canUpdate && mode==='edit') || !canSubmit}
        >
          {loading ? 'Guardando…' : (mode==='edit' ? 'Guardar cambios' : 'Crear evento')}
        </button>
      </div>
    </form>
  )
}
