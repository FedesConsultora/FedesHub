import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaTrash, FaPlus, FaPenToSquare, FaRegFloppyDisk, FaXmark } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './EmergenciasSection.scss'

const INITIAL_CONTACT = {
  nombre: '',
  parentesco: '',
  telefono: '',
  email: ''
}

export default function EmergenciasSection({ federId, isSelf = false, readOnly = false }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const initialRef = useRef(null)
  const toast = useToast()

  const push = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent('fh:push', {
        detail: { type: 'feders.emergencias.updated', feder_id: federId }
      }))
    } catch (e) { /* ignore */ }
  }, [federId])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await federsApi.listEmergencias(federId)
      setRows(Array.isArray(data) ? data : (data?.data || []))
    } catch (e) {
      toast.error('No se pudieron cargar los contactos')
    } finally {
      setLoading(false)
    }
  }, [federId, toast])

  useEffect(() => { load() }, [load])

  // Lógica de edición
  const startNew = () => {
    const fresh = { ...INITIAL_CONTACT }
    setEditing(fresh)
    initialRef.current = fresh
    setDirty(false)
  }

  const onEdit = (r) => {
    setEditing({ ...r })
    initialRef.current = { ...r }
    setDirty(false)
  }

  const onCancel = () => {
    setEditing(null)
    setDirty(false)
  }

  const setField = (k, v) => {
    setEditing(prev => ({ ...prev, [k]: v }))
    setDirty(true)
  }

  const onSave = async () => {
    if (!editing.nombre) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setSaving(true)
      const payload = {
        nombre: editing.nombre.trim(),
        parentesco: editing.parentesco?.trim() || null,
        telefono: editing.telefono?.trim() || null,
        email: editing.email?.trim() || null
      }

      if (editing.id) {
        await federsApi.updateEmergencia(federId, editing.id, payload)
      } else {
        await federsApi.createEmergencia(federId, payload)
      }

      toast.success('Contacto guardado')
      setEditing(null)
      setDirty(false)
      push()
      await load()
    } catch (e) {
      toast.error(e?.error || 'No se pudo guardar el contacto')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('¿Eliminar este contacto de emergencia?')) return
    try {
      await federsApi.deleteEmergencia(federId, id)
      toast.success('Contacto eliminado')
      push()
      await load()
    } catch (e) {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <section className="pfEmerg card" aria-label="Contactos de emergencia">
      {/* Botón flotante: se muestra si estamos editando y hubo cambios, y NO es solo lectura */}
      {(!readOnly && editing && (dirty || saving)) && (
        <button
          type="button"
          className={'btnSaveFloating' + (saving ? ' saving' : '')}
          onClick={onSave}
          disabled={saving}
          title="Guardar contacto"
        >
          {saving ? <span className="spinner" aria-hidden="true" /> : <FaRegFloppyDisk />}
          <span className="txt">{saving ? 'Guardando' : 'Guardar'}</span>
        </button>
      )}

      <div className="headRow">
        <h3>Contactos de emergencia</h3>
        {!readOnly && !editing && (
          <button className="btn small" onClick={startNew}>
            <FaPlus /> Agregar contacto
          </button>
        )}
      </div>

      {loading && !rows.length ? (
        <div className="muted" style={{ marginTop: 20 }}>Cargando contactos…</div>
      ) : (
        <>
          {/* Formulario de Alta/Edición */}
          {editing && (
            <div className="emForm">
              <div className="labelRow">
                {editing.id ? <FaPenToSquare /> : <FaPlus />}
                <span>{editing.id ? 'Editar contacto' : 'Nuevo contacto'}</span>
                <button
                  type="button"
                  className="btn tiny"
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none' }}
                  onClick={onCancel}
                >
                  <FaXmark /> Cancelar
                </button>
              </div>

              <div className="formGrid">
                <div className="pfInput">
                  <label className="lbl">Nombre completo</label>
                  <input
                    className="control"
                    placeholder="Ej: María López"
                    value={editing.nombre}
                    onChange={e => setField('nombre', e.target.value)}
                    required
                  />
                </div>
                <div className="pfInput">
                  <label className="lbl">Parentesco</label>
                  <input
                    className="control"
                    placeholder="Padre, Madre, Pareja..."
                    value={editing.parentesco}
                    onChange={e => setField('parentesco', e.target.value)}
                  />
                </div>
                <div className="pfInput">
                  <label className="lbl">Teléfono</label>
                  <input
                    className="control"
                    placeholder="Ej: +54 9 11 ..."
                    value={editing.telefono}
                    onChange={e => setField('telefono', e.target.value)}
                  />
                </div>
                <div className="pfInput">
                  <label className="lbl">Email</label>
                  <input
                    className="control"
                    placeholder="ejemplo@correo.com"
                    value={editing.email}
                    onChange={e => setField('email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Listado de contactos */}
          {!editing && (
            rows.length > 0 ? (
              <ul className="emList">
                {rows.map(r => (
                  <li key={r.id} className="emTile">
                    <div className="info">
                      <div className="top">
                        {r.nombre}
                        {r.parentesco && <span className="pill">{r.parentesco}</span>}
                      </div>
                      <div className="sub">
                        <span><strong>Tel:</strong> {r.telefono || '—'}</span>
                        {r.email && <span><strong>Email:</strong> {r.email}</span>}
                      </div>
                    </div>
                    <div className="actions">
                      {!readOnly && (
                        <>
                          <button className="btn tiny" onClick={() => onEdit(r)} title="Editar">
                            <FaPenToSquare />
                          </button>
                          <button className="btn tiny danger" onClick={() => onDelete(r.id)} title="Eliminar">
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="emptyState">
                <div className="icon">🆘</div>
                <div className="msg">No hay contactos de emergencia cargados.</div>
                {!readOnly && (
                  <button className="btn small" onClick={startNew}>
                    Comenzar a cargar
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}
    </section>
  )
}