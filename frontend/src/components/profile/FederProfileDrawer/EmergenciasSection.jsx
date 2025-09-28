import { useCallback, useEffect, useState } from 'react'
import { FaTrash, FaPlus, FaPenToSquare } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './EmergenciasSection.scss'

export default function EmergenciasSection({ federId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)

  const toast = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null)
      const data = await federsApi.listEmergencias(federId)
      setRows(Array.isArray(data) ? data : (data?.data || []))
    } catch (e) {
      setErr(e)
    } finally {
      setLoading(false)
    }
  }, [federId])

  useEffect(() => { load() }, [load])

  const startNew = () => setEditing({ nombre:'', parentesco:'', telefono:'', email:'' })
  const onEdit = (r) => setEditing({ ...r })
  const onCancel = () => setEditing(null)

  const onSave = async (e) => {
    e?.preventDefault?.()
    const f = new FormData(e.currentTarget)
    const payload = {
      nombre:      f.get('nombre')?.trim() || null,
      parentesco:  f.get('parentesco')?.trim() || null,
      telefono:    f.get('telefono')?.trim() || null,
      email:       f.get('email')?.trim() || null
    }
    try {
      setSaving(true)
      if (editing?.id) await federsApi.updateEmergencia(federId, editing.id, payload)
      else await federsApi.createEmergencia(federId, payload)
      toast.success('Contacto guardado')
      setEditing(null)
      await load()
    } catch (e) {
      toast.error(e?.error || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('¿Eliminar contacto?')) return
    try {
      await federsApi.deleteEmergencia(federId, id)
      toast.success('Contacto eliminado')
      await load()
    } catch (e) {
      toast.error(e?.error || 'No se pudo eliminar')
    }
  }

  return (
    <section className="pfEmerg card" aria-label="Contactos de emergencia">
      <div className="rowBetween">
        <h3 title="Contactos de emergencia">Contactos de emergencia</h3>
        {!editing && (
          <button className="btn" onClick={startNew} title="Agregar contacto" type="button">
            <FaPlus style={{marginRight:6}}/>Agregar
          </button>
        )}
      </div>

      {err && <div className="error">Error cargando contactos.</div>}
      {loading && <div className="muted">Cargando…</div>}

      {/* Formulario */}
      {editing && (
        <form className="emForm" onSubmit={onSave} aria-label="Formulario de emergencia">
          <div className="pfInput">
            <label htmlFor="em_nom" className="lbl" title="Nombre completo">Nombre completo</label>
            <input id="em_nom" name="nombre" className="control"
                   placeholder="Ej. María López" autoComplete="name"
                   defaultValue={editing.nombre || ''} required />
          </div>

          <div className="pfInput">
            <label htmlFor="em_par" className="lbl" title="Parentesco">Parentesco</label>
            <input id="em_par" name="parentesco" className="control"
                   placeholder="Ej. Madre / Pareja / Amigo"
                   defaultValue={editing.parentesco || ''} />
          </div>

          <div className="pfInput">
            <label htmlFor="em_tel" className="lbl" title="Teléfono">Teléfono</label>
            <input id="em_tel" name="telefono" className="control"
                   placeholder="Ej. +54 9 11 ..."
                   type="tel" inputMode="tel" autoComplete="tel"
                   defaultValue={editing.telefono || ''} />
            <div className="hint">Incluí el código de país para llamadas internacionales.</div>
          </div>

          <div className="pfInput">
            <label htmlFor="em_mail" className="lbl" title="Email">Email</label>
            <input id="em_mail" name="email" className="control"
                   type="email" autoComplete="email"
                   placeholder="ejemplo@correo.com"
                   defaultValue={editing.email || ''} />
          </div>

          <div className="rowEnd formActions">
            <button type="button" className="btn" onClick={onCancel} title="Cancelar">Cancelar</button>
            <button className="cta" title="Guardar" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {/* Listado */}
      {!editing && !loading && (
        rows.length > 0 ? (
          <ul className="list">
            {rows.map(r => (
              <li key={r.id} className="rowEm">
                <div className="col">
                  <div className="nm">{r.nombre}</div>
                  <div className="sub">
                    {r.parentesco || '—'} • {r.telefono || '—'} • {r.email || '—'}
                  </div>
                </div>
                <div className="actions">
                  <button className="btn" onClick={()=>onEdit(r)} title="Editar contacto" type="button">
                    <FaPenToSquare style={{marginRight:6}}/>Editar
                  </button>
                  <button className="btn danger" onClick={()=>onDelete(r.id)} title="Eliminar contacto" type="button">
                    <FaTrash style={{marginRight:6}}/>Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <div className="emoji">🆘</div>
            <div className="txt">No hay contactos cargados.</div>
            <button className="btn" onClick={startNew} type="button"><FaPlus style={{marginRight:6}}/>Agregar el primero</button>
          </div>
        )
      )}
    </section>
  )
}