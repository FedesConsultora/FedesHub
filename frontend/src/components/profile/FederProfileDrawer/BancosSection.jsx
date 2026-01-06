import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaTrash, FaPlus, FaPenToSquare, FaStar, FaRegFloppyDisk, FaXmark } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import './BancosSection.scss'

const INITIAL_BANK = {
  banco_nombre: '',
  titular_nombre: '',
  cbu: '',
  alias: '',
  es_principal: false
}

export default function BancosSection({ federId, isSelf = false, readOnly = false }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | bank object
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const initialRef = useRef(null)
  const toast = useToast()

  const push = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent('fh:push', {
        detail: { type: 'feders.bancos.updated', feder_id: federId }
      }))
    } catch (e) { /* ignore */ }
  }, [federId])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await federsApi.listBancos(federId)
      const list = Array.isArray(data) ? data : (data?.data || [])
      setRows(list)
    } catch (e) {
      toast.error('No se pudieron cargar las cuentas')
    } finally {
      setLoading(false)
    }
  }, [federId, toast])

  useEffect(() => { load() }, [load])

  // Lógica de edición
  const startNew = () => {
    const fresh = { ...INITIAL_BANK, es_principal: rows.length === 0 }
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
    if (!editing.banco_nombre || !editing.cbu) {
      toast.error('Banco y CBU son obligatorios')
      return
    }

    try {
      setSaving(true)
      const payload = {
        banco_nombre: editing.banco_nombre,
        titular_nombre: editing.titular_nombre,
        cbu: String(editing.cbu || '').replace(/\D/g, ''), // solo números
        alias: editing.alias,
        es_principal: editing.es_principal
      }

      if (editing.id) {
        await federsApi.updateBanco(federId, editing.id, payload)
      } else {
        await federsApi.createBanco(federId, payload)
      }

      toast.success('Cuenta guardada')
      setEditing(null)
      setDirty(false)
      push()
      await load()
    } catch (e) {
      toast.error(e?.error || 'No se pudo guardar la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return
    try {
      await federsApi.deleteBanco(federId, id)
      toast.success('Cuenta eliminada')
      push()
      await load()
    } catch (e) {
      toast.error('No se pudo eliminar')
    }
  }

  const makePrincipal = async (id) => {
    try {
      await federsApi.updateBanco(federId, id, { es_principal: true })
      toast.success('Cuenta marcada como principal')
      push()
      await load()
    } catch (e) {
      toast.error('No se pudo actualizar la cuenta')
    }
  }

  return (
    <section className="pfBancos card" aria-label="Cuentas bancarias">
      {/* Botón flotante: se muestra si estamos editando y hubo cambios, y NO es solo lectura */}
      {(!readOnly && editing && (dirty || saving)) && (
        <button
          type="button"
          className={'btnSaveFloating' + (saving ? ' saving' : '')}
          onClick={onSave}
          disabled={saving}
          title="Guardar cuenta"
        >
          {saving ? <span className="spinner" aria-hidden="true" /> : <FaRegFloppyDisk />}
          <span className="txt">{saving ? 'Guardando' : 'Guardar'}</span>
        </button>
      )}

      <div className="headRow">
        <h3>Cuentas Bancarias</h3>
        {!readOnly && !editing && (
          <button className="btn small" onClick={startNew}>
            <FaPlus /> Agregar cuenta
          </button>
        )}
      </div>

      {loading && !rows.length ? (
        <div style={{ position: 'relative', minHeight: 120 }}>
          <GlobalLoader size={60} />
        </div>
      ) : (
        <>
          {/* Formulario de Alta/Edición */}
          {editing && (
            <div className="bankForm">
              <div className="labelRow">
                {editing.id ? <FaPenToSquare /> : <FaPlus />}
                <span>{editing.id ? 'Editar cuenta' : 'Nueva cuenta'}</span>
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
                  <label className="lbl">Nombre del Banco</label>
                  <input
                    className="control"
                    placeholder="Ej: Banco Galicia"
                    value={editing.banco_nombre}
                    onChange={e => setField('banco_nombre', e.target.value)}
                  />
                </div>
                <div className="pfInput">
                  <label className="lbl">Titular de la Cuenta</label>
                  <input
                    className="control"
                    placeholder="Nombre completo"
                    value={editing.titular_nombre}
                    onChange={e => setField('titular_nombre', e.target.value)}
                  />
                </div>
                <div className="pfInput">
                  <label className="lbl">CBU / CVU</label>
                  <input
                    className="control"
                    placeholder="22 dígitos"
                    value={editing.cbu}
                    onChange={e => setField('cbu', e.target.value)}
                  />
                </div>
                <div className="pfInput">
                  <label className="lbl">Alias</label>
                  <input
                    className="control"
                    placeholder="Ej: marina.sol.fedes"
                    value={editing.alias}
                    onChange={e => setField('alias', e.target.value)}
                  />
                </div>
              </div>

              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={editing.es_principal}
                  onChange={e => setField('es_principal', e.target.checked)}
                />
                <span>Marcar como cuenta principal</span>
              </label>
            </div>
          )}

          {/* Listado de cuentas */}
          {!editing && (
            rows.length > 0 ? (
              <ul className="bankList">
                {rows.map(r => (
                  <li key={r.id} className="bankTile">
                    <div className="info">
                      <div className="top">
                        {r.banco_nombre || '—'}
                        {r.es_principal && <span className="pill">Principal</span>}
                      </div>
                      <div className="sub">
                        <span><strong>Titular:</strong> {r.titular_nombre || '—'}</span>
                        <span><strong>CBU:</strong> {r.cbu || '—'}</span>
                        {r.alias && <span><strong>Alias:</strong> {r.alias}</span>}
                      </div>
                    </div>
                    <div className="actions">
                      {!readOnly && (
                        <>
                          <button className="btn tiny" onClick={() => onEdit(r)} title="Editar">
                            <FaPenToSquare />
                          </button>
                          {!r.es_principal && (
                            <button className="btn tiny" onClick={() => makePrincipal(r.id)} title="Hacer principal">
                              <FaStar />
                            </button>
                          )}
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
                <div className="icon">🏦</div>
                <div className="msg">No hay cuentas bancarias registradas.</div>
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