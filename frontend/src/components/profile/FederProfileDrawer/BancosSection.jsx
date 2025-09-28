import { useCallback, useEffect, useState } from 'react'
import { FaTrash, FaPlus, FaPenToSquare, FaStar } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './BancosSection.scss'

export default function BancosSection({ federId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const toast = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null)
      const data = await federsApi.listBancos(federId)
      setRows(Array.isArray(data) ? data : (data?.data || []))
    } catch (e) {
      setErr(e)
    } finally {
      setLoading(false)
    }
  }, [federId])

  useEffect(() => { load() }, [load])

  const startNew = () => setEditing({
    banco_nombre:'', cbu_enc:'', alias_enc:'', titular_nombre:'', es_principal: rows.length === 0
  })
  const onEdit = (r) => setEditing({ ...r })
  const onCancel = () => setEditing(null)

  const onSave = async (e) => {
    e?.preventDefault?.()
    const f = new FormData(e.currentTarget)
    const payload = {
      banco_nombre: f.get('banco_nombre') || null,
      cbu_enc: f.get('cbu_enc') || null,
      alias_enc: f.get('alias_enc') || null,
      titular_nombre: f.get('titular_nombre') || null,
      es_principal: f.get('es_principal') === 'on'
    }
    try {
      setSaving(true)
      if (editing?.id) await federsApi.updateBanco(federId, editing.id, payload)
      else await federsApi.createBanco(federId, payload)

      toast.success('Datos bancarios guardados')
      setEditing(null)
      await load()
      try { window.dispatchEvent(new CustomEvent('fh:push', { detail: { type:'feders.bancos.updated', feder_id: federId } })) } catch {}
    } catch (e) {
      toast.error(e?.error || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('¿Eliminar banco?')) return
    try {
      await federsApi.deleteBanco(federId, id)
      toast.success('Banco eliminado')
      await load()
    } catch (e) {
      toast.error(e?.error || 'No se pudo eliminar')
    }
  }

  const setPrincipal = async (row) => {
    if (row?.es_principal) return
    try {
      await federsApi.updateBanco(federId, row.id, { es_principal: true })
      toast.success('Marcado como principal')
      await load()
    } catch (e) {
      toast.error(e?.error || 'No se pudo actualizar')
    }
  }

  return (
    <section className="pfBancos card" aria-label="Cuentas bancarias">
      <div className="rowBetween">
        <h3 title="Bancos">Bancos</h3>
        {!editing && (
          <button className="btn" onClick={startNew} title="Agregar banco" type="button">
            <FaPlus style={{marginRight:6}}/>Agregar
          </button>
        )}
      </div>

      {err && <div className="error">Error cargando datos bancarios.</div>}
      {loading && <div className="muted">Cargando…</div>}

      {/* Formulario */}
      {editing && (
        <form className="bankForm" onSubmit={onSave} aria-label="Formulario banco">
          <div className="pfInput">
            <label htmlFor="banco_nombre" className="lbl" title="Nombre del banco">Banco</label>
            <input id="banco_nombre" name="banco_nombre" className="control"
                   placeholder="Ej. Banco Nación"
                   defaultValue={editing.banco_nombre || ''} />
          </div>

          <div className="pfInput">
            <label htmlFor="titular_nombre" className="lbl" title="Titular de la cuenta">Titular</label>
            <input id="titular_nombre" name="titular_nombre" className="control"
                   placeholder="Nombre del titular"
                   defaultValue={editing.titular_nombre || ''} />
          </div>

          <div className="pfInput">
            <label htmlFor="cbu_enc" className="lbl" title="CBU (encriptado)">CBU (enc)</label>
            <input id="cbu_enc" name="cbu_enc" className="control"
                   placeholder="valor encriptado"
                   defaultValue={editing.cbu_enc || ''} required />
            <div className="hint">Guardamos el CBU en forma encriptada/hasheada.</div>
          </div>

          <div className="pfInput">
            <label htmlFor="alias_enc" className="lbl" title="Alias (encriptado)">Alias (enc)</label>
            <input id="alias_enc" name="alias_enc" className="control"
                   placeholder="valor encriptado"
                   defaultValue={editing.alias_enc || ''} />
          </div>

          <div className="checkRow">
            <label className="switchLbl" title="Marcar como principal">
              <input name="es_principal" type="checkbox" defaultChecked={!!editing.es_principal} />
              <span>Principal</span>
            </label>
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
              <li key={r.id} className="rowBank">
                <div className="col">
                  <div className="nm">
                    {r.banco_nombre || '—'}
                    {r.es_principal && <span className="pill ok" title="Cuenta principal">Principal</span>}
                  </div>
                  <div className="sub">{r.titular_nombre || 'Sin titular'}</div>
                </div>
                <div className="actions">
                  <button className="btn" onClick={()=>onEdit(r)} title="Editar banco" type="button">
                    <FaPenToSquare style={{marginRight:6}}/>Editar
                  </button>
                  <button className="btn" onClick={()=>setPrincipal(r)} disabled={!!r.es_principal} title="Hacer principal" type="button">
                    <FaStar style={{marginRight:6}}/>{r.es_principal ? 'Principal' : 'Hacer principal'}
                  </button>
                  <button className="btn danger" onClick={()=>onDelete(r.id)} title="Eliminar banco" type="button">
                    <FaTrash style={{marginRight:6}}/>Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <div className="emoji">🏦</div>
            <div className="txt">No hay cuentas cargadas.</div>
            <button className="btn" onClick={startNew} type="button"><FaPlus style={{marginRight:6}}/>Agregar la primera</button>
          </div>
        )
      )}
    </section>
  )
}