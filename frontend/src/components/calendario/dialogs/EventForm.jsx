import { useEffect, useMemo, useState } from 'react'
import { calendarioApi } from '../../../api/calendario'
import { federsApi } from '../../../api/feders'
import usePermission from '../../../hooks/usePermissions'
import './EventForm.scss'

const two = n => String(n).padStart(2, '0')
const isoDate = d => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#64748b', '#06b6d4',
  '#f97316', '#84cc16'
];

function toInputDateTime(v) {
  if (!v) return ''
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  if (m) return m[0]
  try {
    const d = new Date(String(v).replace(' ', 'T'))
    if (isNaN(d)) return ''
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`
  } catch { return '' }
}
function toApiDateTime(v) {
  if (!v) return ''
  return v.length === 16 ? `${v}:00` : v
}

export default function EventForm({
  mode = 'create',
  init = {},
  calendars = [],
  onCancel,
  onSaved,
  onDeleted,
  forcedType = null, // 'reunion' | 'recordatorio'
}) {
  const { can } = usePermission()
  const canCreate = can('calendario', 'create')
  const canUpdate = can('calendario', 'update')
  const canDelete = can('calendario', 'delete')

  const myCalendarId = useMemo(() => {
    const personal = calendars.find(c => c.tipo?.codigo === 'personal' || c.tipo_codigo === 'personal')
    return init.calendario_local_id || personal?.id || calendars[0]?.id || ''
  }, [calendars, init.calendario_local_id])

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [catalog, setCatalog] = useState({ evtTipos: [], vis: [] })
  const [availableFeders, setAvailableFeders] = useState([])

  const [form, setForm] = useState({
    calendario_local_id: myCalendarId,
    tipo_codigo: forcedType || init.tipo_codigo || 'interno',
    visibilidad_codigo: init.visibilidad_codigo || 'organizacion',
    titulo: init.titulo || '',
    descripcion: init.descripcion || '',
    lugar: init.lugar || '',
    all_day: !!init.all_day,
    starts_at: init.all_day
      ? (init.starts_at?.slice(0, 10) || '')
      : toInputDateTime(init.starts_at || ''),
    ends_at: init.all_day ? '' : toInputDateTime(init.ends_at || ''),
    color: init.color || PRESET_COLORS[0],
    google_meet: !!init.google_meet,
    asistentes: init.asistentes || [],
    notificar: true,
  })

  useEffect(() => { setForm(f => (f.calendario_local_id ? f : { ...f, calendario_local_id: myCalendarId })) }, [myCalendarId])

  useEffect(() => {
    let mounted = true
    Promise.all([
      calendarioApi.catalog.eventoTipos(),
      calendarioApi.catalog.visibilidades(),
      federsApi.list({ limit: 500, activo: true })
    ]).then(([e, v, f]) => {
      if (!mounted) return
      setCatalog({ evtTipos: e || [], vis: v || [] })
      setAvailableFeders(f?.rows || [])
      setForm(prev => ({
        ...prev,
        tipo_codigo: forcedType || prev.tipo_codigo || e?.[0]?.codigo || 'interno',
        visibilidad_codigo: prev.visibilidad_codigo || v?.[0]?.codigo || 'organizacion'
      }))
    }).catch(() => { })
    return () => { mounted = false }
  }, [forcedType])

  const canSubmit = useMemo(() => {
    const baseOk = !!form.tipo_codigo && !!form.visibilidad_codigo && !!form.titulo
    if (form.all_day) return baseOk && !!form.starts_at
    return baseOk && !!form.starts_at && !!form.ends_at
  }, [form])

  const save = async (e) => {
    e?.preventDefault?.()
    setError(null)
    if (!canSubmit) return

    setLoading(true)
    try {
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
        setError('No tenés calendarios propios disponibles.')
        setLoading(false)
        return
      }

      const payload = {
        ...form,
        calendario_local_id: calId,
        starts_at: form.all_day ? `${form.starts_at}T00:00:00` : toApiDateTime(form.starts_at),
        ends_at: form.all_day ? `${form.starts_at}T23:59:59` : toApiDateTime(form.ends_at),
      }

      const res = (mode === 'edit' && init.id)
        ? await calendarioApi.events.update(init.id, payload)
        : await calendarioApi.events.create(payload)

      onSaved?.(res?.row || res)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'No se pudo guardar.'
      setError(msg)
    } finally { setLoading(false) }
  }

  const doDelete = async () => {
    if (!init.id) return
    const ok = window.confirm('¿Eliminar este evento permanentemente?')
    if (!ok) return
    setError(null)
    setDeleting(true)
    try {
      await calendarioApi.events.delete(init.id)
      onDeleted?.()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'No se pudo eliminar.'
      setError(msg)
    } finally { setDeleting(false) }
  }

  const addAsistente = (fid) => {
    const feder = availableFeders.find(f => f.id === parseInt(fid));
    if (!feder) return;
    if (form.asistentes.some(as => as.feder_id === feder.id)) return;
    setForm(f => ({
      ...f,
      asistentes: [...f.asistentes, { tipo_codigo: 'feder', feder_id: feder.id, nombre: `${feder.nombre} ${feder.apellido}` }]
    }));
  }

  const removeAsistente = (fid) => {
    setForm(f => ({ ...f, asistentes: f.asistentes.filter(as => as.feder_id !== fid) }));
  }

  const isReunion = form.tipo_codigo === 'reunion' || forcedType === 'reunion';
  const isRecordatorio = form.tipo_codigo === 'recordatorio' || forcedType === 'recordatorio';

  return (
    <form className={`cal-event-form ${isReunion ? 'reunion' : ''}`} onSubmit={save}>
      <div className="grid">
        {!forcedType && (
          <label className="full">
            <span>Tipo de evento</span>
            <select className="fh-input" value={form.tipo_codigo} onChange={e => setForm(f => ({ ...f, tipo_codigo: e.target.value }))}>
              {catalog.evtTipos.map(t => <option key={t.id} value={t.codigo}>{t.nombre}</option>)}
            </select>
          </label>
        )}

        <label className="full">
          <span>Título</span>
          <input className="fh-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder={isRecordatorio ? 'Ej. Recordar pagar facturas' : 'Ej. Reunión de planning'} />
        </label>

        <label className="full">
          <span>Descripción (opcional)</span>
          <textarea className="fh-input" rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
        </label>

        {!isRecordatorio && (
          <label className="full">
            <span>Lugar / Link</span>
            <input className="fh-input" value={form.lugar} onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))} placeholder="Zoom / Oficina / Google Meet..." />
          </label>
        )}

        <label className="chk">
          <input type="checkbox" checked={form.all_day} onChange={e => {
            const on = e.target.checked;
            setForm(f => {
              if (on) {
                const d = f.starts_at ? f.starts_at.slice(0, 10) : isoDate(new Date());
                return { ...f, all_day: true, starts_at: d, ends_at: '' };
              } else {
                const start = f.starts_at ? toInputDateTime(`${f.starts_at}T09:00:00`) : toInputDateTime(`${isoDate(new Date())}T09:00:00`);
                const end = f.ends_at ? toInputDateTime(f.ends_at) : toInputDateTime(`${isoDate(new Date())}T10:00:00`);
                return { ...f, all_day: false, starts_at: start, ends_at: end };
              }
            });
          }} />
          <span>Todo el día</span>
        </label>

        <div className="time-row full">
          <label>
            <span>{form.all_day ? 'Fecha' : 'Inicio'}</span>
            <input className="fh-input" type={form.all_day ? 'date' : 'datetime-local'} value={form.all_day ? (form.starts_at || '') : toInputDateTime(form.starts_at)} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
          </label>

          {!form.all_day && (
            <label>
              <span>Fin</span>
              <input className="fh-input" type="datetime-local" value={toInputDateTime(form.ends_at)} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
            </label>
          )}
        </div>

        <div className="color-picker full">
          <span>Elige un color</span>
          <div className="presets">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" className={`swatch ${form.color === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
            ))}
          </div>
        </div>

        {isReunion && (
          <div className="participants-box full">
            <span>Participantes (Feders)</span>
            <div className="selector">
              <select className="fh-input" onChange={e => { addAsistente(e.target.value); e.target.value = ''; }}>
                <option value="">Seleccionar participante...</option>
                {availableFeders.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre} {f.apellido}</option>
                ))}
              </select>
            </div>
            <div className="tags">
              {form.asistentes.map(as => (
                <span key={as.feder_id} className="tag">
                  {as.nombre}
                  <button type="button" onClick={() => removeAsistente(as.feder_id)}>×</button>
                </span>
              ))}
            </div>
            <label className="chk" style={{ marginTop: '8px' }}>
              <input type="checkbox" checked={form.notificar} onChange={e => setForm(f => ({ ...f, notificar: e.target.checked }))} />
              <span>Notificar por email / calendar</span>
            </label>
          </div>
        )}

        {isReunion && !form.lugar && (
          <label className="chk full meet-chk">
            <input type="checkbox" checked={form.google_meet} onChange={e => setForm(f => ({ ...f, google_meet: e.target.checked }))} />
            <span className="meet-label">Generar Google Meet (link automático)</span>
          </label>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="footer">
        <button type="button" className="fh-btn ghost" onClick={onCancel} disabled={loading || deleting}>Cancelar</button>
        <div className="spacer" />
        {mode === 'edit' && canDelete && (
          <button type="button" className="fh-btn danger outline" onClick={doDelete} disabled={loading || deleting}>Eliminar</button>
        )}
        <button className="fh-btn primary" disabled={loading || deleting || !canSubmit}>
          {loading ? 'Guardando…' : (mode === 'edit' ? 'Guardar cambios' : 'Crear evento')}
        </button>
      </div>
    </form>
  )
}
