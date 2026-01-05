import React, { useMemo, useState } from 'react'
import useSubtasks from '../../pages/Tareas/hooks/useSubtasks'
import { useToast } from '../toast/ToastProvider.jsx'
import GlobalLoader from '../loader/GlobalLoader.jsx'

export default function SubtasksPanel({ parentId, defaultClienteId = null, catalog = {} }) {
  const { list, loading, error, create } = useSubtasks(parentId)
  const toast = useToast()
  const [openQuick, setOpenQuick] = useState(false)
  const [form, setForm] = useState({ titulo: '', cliente_id: defaultClienteId || '' })

  const clientes = useMemo(() => catalog?.clientes || [], [catalog])

  const submitQuick = async () => {
    try {
      await create({ titulo: form.titulo, cliente_id: form.cliente_id || null })
      setForm({ titulo: '', cliente_id: defaultClienteId || '' })
      setOpenQuick(false)
      toast?.success('Tarea hija creada')
    } catch (e) {
      toast?.error(e?.message || 'No se pudo crear la tarea hija')
    }
  }

  return (
    <div className="card" style={{ position: 'relative', minHeight: '120px' }}>
      <div className="cardHeader">
        <div className="title">Tareas hijas</div>
        <button className="primary" onClick={() => setOpenQuick(v => !v)}>
          {openQuick ? 'Cerrar' : '+ Nueva hija'}
        </button>
      </div>

      {openQuick && (
        <div className="fh-border" style={{ padding: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <input
              placeholder="Título…"
              value={form.titulo}
              onChange={e => setForm(v => ({ ...v, titulo: e.target.value }))} />
            <select
              value={form.cliente_id || ''}
              onChange={e => setForm(v => ({ ...v, cliente_id: e.target.value || null }))}>
              <option value="">{defaultClienteId ? 'Usar el mismo cliente' : 'Sin cliente'}</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpenQuick(false)}>Cancelar</button>
              <button className="primary" onClick={submitQuick}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {loading ? <GlobalLoader isLoading={loading} size={80} /> : (
        (list || []).length === 0
          ? <div className="empty">Sin tareas hijas</div>
          : <div className="col">
            {(list || []).map(t => (
              <a key={t.id} className="fh-border" style={{ padding: '10px', display: 'grid', gap: '6px' }} href={`/tareas/${t.id}`}>
                <div style={{ fontWeight: 800 }}>{t.titulo}</div>
                <div className="metaRow">
                  {t.cliente_nombre && <span><b>Proyecto</b> {t.cliente_nombre}</span>}
                  {t.estado_nombre && <span><b>Estado</b> {t.estado_nombre}</span>}
                </div>
              </a>
            ))}
          </div>
      )}
    </div>
  )
}
